// Dashboard Service - Aggregates data for dashboard views
import { trackdocClient } from './trackdocClient';
import logger from '../config/logger';
import { 
  DashboardData, 
  Product, 
  ProductOverview, 
  PageSummary, 
  EventSummary, 
  ActivityItem,
  HealthScoreItem,
  IssueItem,
  EventStatus 
} from '../types';

export class DashboardService {
  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      logger.info('Fetching dashboard data');

      // Fetch products and pages only (pages already include events)
      const [products, allPages] = await Promise.all([
        this.getProducts(),
        this.getAllPages()
      ]);

      // Enrich events from pages with full product context to avoid N+1 queries
      const allEvents = allPages.flatMap(page =>
        (page.events || []).map((event: any) => ({
          ...event,
          pageId: event.pageId || page.id,
          page: {
            id: page.id,
            name: page.name,
            productId: page.productId,
            product: {
              id: page.productId,
              name: products.find(p => p.id === page.productId)?.name || 'Unknown'
            }
          }
        }))
      );

      const summary = this.calculateSummary(products, allPages, allEvents);
      const recentActivity = this.generateRecentActivity(allEvents, allPages);
      const healthScores = this.calculateHealthScores(products, allEvents);
      const topIssues = this.identifyTopIssues(allEvents, products);

      const dashboardData: DashboardData = {
        summary,
        recentActivity,
        healthScores,
        topIssues
      };

      logger.info('Dashboard data fetched successfully', {
        productsCount: products.length,
        pagesCount: allPages.length,
        eventsCount: allEvents.length
      });

      return dashboardData;
    } catch (error) {
      logger.error('Failed to fetch dashboard data', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get enhanced product overview with aggregated stats
   */
  async getProductOverview(productId: string): Promise<ProductOverview> {
    try {
      logger.info('Fetching product overview', { productId });

      // Fetch product and properties only (product includes pages with events)
      const [product, properties] = await Promise.all([
        trackdocClient.get<any>(`/api/products/${productId}`),
        trackdocClient.get<any[]>(`/api/products/${productId}/properties`)
      ]);

      // Reuse pages from product response to avoid redundant fetch
      const pages = product.pages || [];

      // Enrich events from pages.events with page context
      const events = pages.flatMap((page: any) =>
        (page.events || []).map((event: any) => ({
          ...event,
          pageId: page.id,
          page: { id: page.id, name: page.name, productId: product.id }
        }))
      );

      // Calculate stats
      const stats = this.calculateProductStats(pages, events);

      // Get recent items (limited for performance)
      const recentPages = this.getRecentPages(pages, events).slice(0, 5);
      const recentEvents = this.getRecentEvents(events, pages).slice(0, 10);
      const variablesLibrary = this.summarizeProperties(properties, events).slice(0, 20);

      const overview: ProductOverview = {
        ...product,
        stats,
        recentPages,
        recentEvents,
        variablesLibrary
      };

      logger.info('Product overview fetched successfully', { productId, stats });

      return overview;
    } catch (error) {
      logger.error('Failed to fetch product overview', {
        productId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  private async getProducts(): Promise<any[]> {
    return trackdocClient.get<any[]>('/api/products');
  }

  private async getAllPages(): Promise<any[]> {
    // Get all products first, then fetch their pages
    const products = await this.getProducts();
    const pagesPromises = products.map(product =>
      trackdocClient.get<any[]>(`/api/products/${product.id}/pages`)
        .catch(error => {
          logger.warn(`Failed to fetch pages for product ${product.id}`, { error: error.message });
          return [];
        })
    );

    const pagesArrays = await Promise.all(pagesPromises);
    return pagesArrays.flat();
  }

  private calculateSummary(products: any[], pages: any[], events: any[]) {
    const errorEvents = events.filter(e => e.status === 'ERROR').length;
    const validatedEvents = events.filter(e => e.status === 'VALIDATED').length;
    const avgHealthScore = events.length > 0 ? 
      Math.round((validatedEvents / events.length) * 100) : 100;

    return {
      totalProducts: products.length,
      totalPages: pages.length,
      totalEvents: events.length,
      avgHealthScore
    };
  }

  private generateRecentActivity(events: any[], pages: any[]): ActivityItem[] {
    // Combine events and pages, sort by updatedAt
    const activities: ActivityItem[] = [];

    // Recent event updates
    events
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 20)
      .forEach(event => {
        const page = pages.find(p => p.id === event.pageId);
        activities.push({
          id: event.id,
          type: 'event_updated',
          entityName: event.name,
          productName: page?.product?.name || 'Unknown',
          timestamp: event.updatedAt,
          details: `Status: ${event.status}`
        });
      });

    return activities.slice(0, 15);
  }

  private calculateHealthScores(products: any[], events: any[]): HealthScoreItem[] {
    return products.map(product => {
      const productEvents = events.filter(e => e.page?.productId === product.id);
      const validatedEvents = productEvents.filter(e => e.status === 'VALIDATED').length;
      const score = productEvents.length > 0 ? 
        Math.round((validatedEvents / productEvents.length) * 100) : 100;

      return {
        productId: product.id,
        productName: product.name,
        score,
        trend: 'stable' // TODO: Calculate trend based on historical data
      };
    });
  }

  private identifyTopIssues(events: any[], products: any[]): IssueItem[] {
    const issues: IssueItem[] = [];

    // Count error events by product
    const errorsByProduct = events
      .filter(e => e.status === 'ERROR')
      .reduce((acc, event) => {
        const productName = products.find(p => p.id === event.page?.productId)?.name || 'Unknown';
        acc[productName] = (acc[productName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    Object.entries(errorsByProduct).forEach(([productName, count]) => {
      issues.push({
        id: `error-${productName}`,
        type: 'error',
        message: `${count} events in error status`,
        productName,
        count: Number(count)
      });
    });

    return issues.sort((a, b) => b.count - a.count).slice(0, 10);
  }

  private calculateProductStats(pages: any[], events: any[]) {
    const eventsInError = events.filter(e => e.status === 'ERROR').length;
    const validatedEvents = events.filter(e => e.status === 'VALIDATED').length;
    const healthScore = events.length > 0 ? 
      Math.round((validatedEvents / events.length) * 100) : 100;

    return {
      totalPages: pages.length,
      totalEvents: events.length,
      eventsInError,
      healthScore
    };
  }

  private getRecentPages(pages: any[], events: any[]): PageSummary[] {
    return pages
      .map(page => {
        const pageEvents = events.filter(e => e.pageId === page.id);
        const errorCount = pageEvents.filter(e => e.status === 'ERROR').length;
        const status: 'healthy' | 'warning' | 'error' = errorCount > 0 ? 'error' : 
                     pageEvents.some(e => e.status === 'TO_TEST') ? 'warning' : 'healthy';

        return {
          id: page.id,
          name: page.name,
          url: page.url,
          eventCount: pageEvents.length,
          lastModified: page.updatedAt,
          status
        };
      })
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  }

  private getRecentEvents(events: any[], pages: any[]): EventSummary[] {
    return events
      .map(event => {
        const page = pages.find(p => p.id === event.pageId);
        const variableCount = Object.keys(event.variables || {}).length;

        return {
          id: event.id,
          name: event.name,
          status: event.status as EventStatus,
          page: {
            id: event.pageId,
            name: page?.name || 'Unknown'
          },
          lastModified: event.updatedAt,
          variableCount
        };
      })
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  }

  private summarizeProperties(properties: any[], events: any[]) {
    return properties.map(property => {
      // Count usage across events (check if property key exists in event.properties)
      const usageCount = events.filter(event =>
        event.properties && Object.keys(event.properties).includes(property.name)
      ).length;

      return {
        id: property.id,
        name: property.name,
        type: property.type || 'string',
        usageCount,
        description: property.description
      };
    }).sort((a, b) => b.usageCount - a.usageCount);
  }
}

export const dashboardService = new DashboardService();