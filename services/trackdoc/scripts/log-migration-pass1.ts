/**
 * Logging Script: Migration Pass 1 - Event Definitions
 *
 * Creates a detailed log of the current state before Pass 2:
 * - Maps all events with their current names
 * - Documents which events will be consolidated into EventDefinitions
 * - Provides rollback information if needed
 * - Statistics on event consolidation
 *
 * This log serves as:
 * 1. Audit trail for Pass 2 changes
 * 2. Reference for rollback procedures
 * 3. Documentation of consolidation decisions
 *
 * Run after verify-migration-pass1.ts and before executing Pass 2.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface EventSnapshot {
  id: string;
  pageId: string;
  pageName: string;
  productId: string;
  productName: string;
  name: string;
  status: string;
  properties: string;
  createdAt: string;
  updatedAt: string;
}

interface EventDefinitionPlan {
  productId: string;
  productName: string;
  eventName: string;
  occurrences: number;
  eventIds: string[];
  uniquePropertySets: number;
  propertySetsDetails: Array<{
    properties: string;
    count: number;
    eventIds: string[];
  }>;
  pages: string[];
  firstOccurrence: string;
  lastUpdate: string;
}

interface MigrationLog {
  timestamp: string;
  migration: string;
  summary: {
    totalEvents: number;
    totalProducts: number;
    totalPages: number;
    uniqueEventNames: number;
    eventDefinitionsToCreate: number;
    averageOccurrencesPerDefinition: number;
  };
  eventSnapshots: EventSnapshot[];
  consolidationPlan: EventDefinitionPlan[];
  divergences: EventDefinitionPlan[];
}

/**
 * Fetch all events with their relationships
 */
async function fetchEventSnapshots(): Promise<EventSnapshot[]> {
  console.log('📸 Capture des events actuels...\n');

  const events = await prisma.event.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      properties: true,
      createdAt: true,
      updatedAt: true,
      page: {
        select: {
          id: true,
          name: true,
          product: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: [
      { page: { product: { name: 'asc' } } },
      { name: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  const snapshots = events.map(event => ({
    id: event.id,
    pageId: event.page.id,
    pageName: event.page.name,
    productId: event.page.product.id,
    productName: event.page.product.name,
    name: event.name,
    status: event.status,
    properties: event.properties,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString()
  }));

  console.log(`✅ ${snapshots.length} events capturés\n`);

  return snapshots;
}

/**
 * Build consolidation plan (which events will share which EventDefinitions)
 */
async function buildConsolidationPlan(snapshots: EventSnapshot[]): Promise<EventDefinitionPlan[]> {
  console.log('📊 Construction du plan de consolidation...\n');

  // Group events by (productId, eventName)
  const groupMap = new Map<string, {
    productId: string;
    productName: string;
    eventName: string;
    events: EventSnapshot[];
  }>();

  for (const snapshot of snapshots) {
    const key = `${snapshot.productId}::${snapshot.name}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        productId: snapshot.productId,
        productName: snapshot.productName,
        eventName: snapshot.name,
        events: []
      });
    }

    groupMap.get(key)!.events.push(snapshot);
  }

  // Build consolidation plan
  const plans: EventDefinitionPlan[] = [];

  for (const group of groupMap.values()) {
    // Count unique property sets
    const propertySetsMap = new Map<string, {
      properties: string;
      count: number;
      eventIds: string[];
    }>();

    for (const event of group.events) {
      const props = event.properties;
      if (!propertySetsMap.has(props)) {
        propertySetsMap.set(props, {
          properties: props,
          count: 0,
          eventIds: []
        });
      }
      const propSet = propertySetsMap.get(props)!;
      propSet.count++;
      propSet.eventIds.push(event.id);
    }

    // Get unique pages
    const pagesSet = new Set(group.events.map(e => e.pageName));

    // Get date range
    const dates = group.events.map(e => new Date(e.createdAt).getTime());
    const updates = group.events.map(e => new Date(e.updatedAt).getTime());

    plans.push({
      productId: group.productId,
      productName: group.productName,
      eventName: group.eventName,
      occurrences: group.events.length,
      eventIds: group.events.map(e => e.id),
      uniquePropertySets: propertySetsMap.size,
      propertySetsDetails: Array.from(propertySetsMap.values()),
      pages: Array.from(pagesSet),
      firstOccurrence: new Date(Math.min(...dates)).toISOString(),
      lastUpdate: new Date(Math.max(...updates)).toISOString()
    });
  }

  // Sort by product, then by occurrences (descending)
  plans.sort((a, b) => {
    if (a.productName !== b.productName) {
      return a.productName.localeCompare(b.productName);
    }
    return b.occurrences - a.occurrences;
  });

  console.log(`✅ ${plans.length} EventDefinitions seront créés\n`);

  return plans;
}

/**
 * Identify divergences (events with same name but different properties)
 */
function identifyDivergences(plans: EventDefinitionPlan[]): EventDefinitionPlan[] {
  console.log('⚠️  Identification des divergences...\n');

  const divergences = plans.filter(plan => plan.uniquePropertySets > 1);

  if (divergences.length > 0) {
    console.log(`⚠️  ${divergences.length} event(s) avec propriétés divergentes:\n`);
    divergences.forEach(div => {
      console.log(`   - ${div.productName} / ${div.eventName}: ${div.uniquePropertySets} variantes sur ${div.occurrences} occurrences`);
    });
    console.log('\n');
  } else {
    console.log('✅ Aucune divergence détectée\n');
  }

  return divergences;
}

/**
 * Generate summary statistics
 */
function generateSummary(snapshots: EventSnapshot[], plans: EventDefinitionPlan[]): MigrationLog['summary'] {
  const totalEvents = snapshots.length;
  const totalProducts = new Set(snapshots.map(s => s.productId)).size;
  const totalPages = new Set(snapshots.map(s => s.pageId)).size;
  const uniqueEventNames = plans.length;
  const eventDefinitionsToCreate = plans.length;
  const averageOccurrencesPerDefinition = totalEvents / eventDefinitionsToCreate;

  return {
    totalEvents,
    totalProducts,
    totalPages,
    uniqueEventNames,
    eventDefinitionsToCreate,
    averageOccurrencesPerDefinition: Math.round(averageOccurrencesPerDefinition * 100) / 100
  };
}

/**
 * Display summary in console
 */
function displaySummary(summary: MigrationLog['summary']) {
  console.log('\n' + '='.repeat(60));
  console.log('RÉSUMÉ DU PLAN DE MIGRATION PASS 1');
  console.log('='.repeat(60) + '\n');

  console.log(`📊 Statistiques:\n`);
  console.log(`   Total events:                    ${summary.totalEvents}`);
  console.log(`   Total produits:                  ${summary.totalProducts}`);
  console.log(`   Total pages:                     ${summary.totalPages}`);
  console.log(`   Noms d'events uniques:           ${summary.uniqueEventNames}`);
  console.log(`   EventDefinitions à créer:        ${summary.eventDefinitionsToCreate}`);
  console.log(`   Moyenne occurrences/définition:  ${summary.averageOccurrencesPerDefinition}\n`);
}

/**
 * Display top consolidations
 */
function displayTopConsolidations(plans: EventDefinitionPlan[]) {
  console.log('🔝 Top 10 des consolidations (plus d\'occurrences):\n');

  const topPlans = plans
    .filter(p => p.occurrences > 1)
    .slice(0, 10);

  if (topPlans.length === 0) {
    console.log('   Aucune consolidation (tous les events sont uniques)\n');
    return;
  }

  topPlans.forEach((plan, index) => {
    console.log(`   ${index + 1}. ${plan.eventName} (${plan.productName})`);
    console.log(`      Occurrences: ${plan.occurrences} sur ${plan.pages.length} page(s)`);
    console.log(`      Propriétés: ${plan.uniquePropertySets === 1 ? 'Homogènes' : `${plan.uniquePropertySets} variantes`}`);
    console.log('');
  });
}

/**
 * Save log to file
 */
function saveLog(log: MigrationLog) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const logsDir = path.join(__dirname, '../logs');

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const filename = path.join(logsDir, `migration-pass1-log-${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(log, null, 2));

  console.log(`📄 Log complet sauvegardé dans :`);
  console.log(`   ${filename}\n`);

  // Also save a human-readable summary
  const summaryFilename = path.join(logsDir, `migration-pass1-summary-${timestamp}.txt`);
  const summaryText = generateSummaryText(log);
  fs.writeFileSync(summaryFilename, summaryText);

  console.log(`📄 Résumé lisible sauvegardé dans :`);
  console.log(`   ${summaryFilename}\n`);
}

/**
 * Generate human-readable summary text
 */
function generateSummaryText(log: MigrationLog): string {
  let text = '';

  text += '='.repeat(60) + '\n';
  text += 'LOG MIGRATION PASS 1 - EVENT DEFINITIONS\n';
  text += '='.repeat(60) + '\n\n';

  text += `Date: ${log.timestamp}\n`;
  text += `Migration: ${log.migration}\n\n`;

  text += 'STATISTIQUES:\n';
  text += `- Total events:                    ${log.summary.totalEvents}\n`;
  text += `- Total produits:                  ${log.summary.totalProducts}\n`;
  text += `- Total pages:                     ${log.summary.totalPages}\n`;
  text += `- Noms d'events uniques:           ${log.summary.uniqueEventNames}\n`;
  text += `- EventDefinitions à créer:        ${log.summary.eventDefinitionsToCreate}\n`;
  text += `- Moyenne occurrences/définition:  ${log.summary.averageOccurrencesPerDefinition}\n\n`;

  if (log.divergences.length > 0) {
    text += 'DIVERGENCES DÉTECTÉES:\n\n';
    log.divergences.forEach(div => {
      text += `${div.productName} / ${div.eventName}\n`;
      text += `  Occurrences: ${div.occurrences}\n`;
      text += `  Variantes de propriétés: ${div.uniquePropertySets}\n`;
      text += `  Pages: ${div.pages.join(', ')}\n`;
      text += '\n';
    });
  }

  text += 'PLAN DE CONSOLIDATION:\n\n';
  log.consolidationPlan.forEach(plan => {
    text += `${plan.productName} / ${plan.eventName}\n`;
    text += `  Occurrences: ${plan.occurrences}\n`;
    text += `  Pages: ${plan.pages.join(', ')}\n`;
    text += `  Propriétés: ${plan.uniquePropertySets === 1 ? 'Homogènes' : `${plan.uniquePropertySets} variantes`}\n`;
    text += `  Event IDs: ${plan.eventIds.join(', ')}\n`;
    text += '\n';
  });

  text += '\n' + '='.repeat(60) + '\n';
  text += 'FIN DU LOG\n';
  text += '='.repeat(60) + '\n';

  return text;
}

/**
 * Main logging function
 */
async function logMigrationPass1() {
  console.log('📝 LOGGING MIGRATION PASS 1 - EVENT DEFINITIONS\n');
  console.log('='.repeat(60) + '\n');

  try {
    // Fetch current state
    const snapshots = await fetchEventSnapshots();

    // Build consolidation plan
    const plans = await buildConsolidationPlan(snapshots);

    // Identify divergences
    const divergences = identifyDivergences(plans);

    // Generate summary
    const summary = generateSummary(snapshots, plans);

    // Create log object
    const log: MigrationLog = {
      timestamp: new Date().toISOString(),
      migration: '20251028142000_event_definitions_pass1',
      summary,
      eventSnapshots: snapshots,
      consolidationPlan: plans,
      divergences
    };

    // Display in console
    displaySummary(summary);
    displayTopConsolidations(plans);

    // Save to files
    saveLog(log);

    console.log('✅ LOGGING TERMINÉ\n');
    console.log('📋 Prochaines étapes:\n');
    console.log('   1. Vérifier le log généré');
    console.log('   2. Si des divergences existent, décider de la stratégie (manuel ou auto)');
    console.log('   3. Procéder avec Pass 2: back-fill des EventDefinitions\n');

  } catch (error) {
    console.error('\n💥 Erreur critique lors du logging:', error);
    process.exit(1);
  }
}

logMigrationPass1()
  .catch((error) => {
    console.error('\n💥 Échec du logging:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
