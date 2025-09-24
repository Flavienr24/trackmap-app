import React from 'react'
import { useLocation } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useProduct } from '@/hooks/useProduct'
import { slugifyProductName, unslugifyProductName } from '@/utils/slug'

export const AppHeader: React.FC = () => {
  const location = useLocation()
  const { currentProduct, findProductBySlug } = useProduct()

  // New breadcrumb logic according to specifications
  const generateBreadcrumbs = () => {
    // Extract parameters manually from pathname since useParams() doesn't work in AppHeader
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const productName = pathSegments[1] // /products/[productName]/...
    const pageSlug = pathSegments[3] // /products/productName/pages/[pageSlug]
    
    const path = location.pathname

    const items: Array<{
      label: string
      href?: string
      isActive: boolean
      isProductName?: boolean
    }> = []

    // Home page - no breadcrumb
    if (path === '/') {
      return items
    }

    // Try to find the product by slug if currentProduct doesn't match
    const productForBreadcrumb = currentProduct && productName && 
      slugifyProductName(currentProduct.name) === productName 
        ? currentProduct 
        : productName ? findProductBySlug(productName) 
        : currentProduct // Fallback: use currentProduct even if productName is undefined

    // If we have found a matching product (either through URL matching or fallback)
    if (productForBreadcrumb) {
      // Always start with product name as first element (in bold, clickable to dashboard)
      const productSlug = productName || slugifyProductName(productForBreadcrumb.name)
      const dashboardPath = `/products/${productSlug}`
      const productItem = {
        label: productForBreadcrumb.name,
        href: path === dashboardPath ? undefined : dashboardPath,
        isActive: path === dashboardPath,
        isProductName: true // Flag to make it bold
      }
      items.push(productItem)

      // Specific page logic based on new requirements
      if (path.includes('/suggested-values')) {
        // SuggestedValuesList: NomProduit › Valeurs suggérées (second level)
        items.push({
          label: 'Valeurs suggérées',
          isActive: true
        })
      } else if (path.includes('/properties')) {
        // PropertiesList: NomProduit › Propriétés
        items.push({
          label: 'Propriétés',
          isActive: true
        })
      } else if (path.includes('/pages')) {
        if (pageSlug) {
          // PageDetail: NomProduit › Pages › NomPage (third level)
          items.push({
            label: 'Pages',
            href: `/products/${productSlug}/pages`,
            isActive: false
          })
          items.push({
            label: unslugifyProductName(pageSlug),
            isActive: true
          })
        } else {
          // PagesList: NomProduit › Pages (second level)
          items.push({
            label: 'Pages',
            isActive: true
          })
        }
      } else if (path.includes('/events')) {
        // EventsList: NomProduit › Events (second level)
        items.push({
          label: 'Events',
          isActive: true
        })
      }
      // Note: Dashboard (path === `/products/${productName}`) shows only product name
    }

    return items
  }

  const breadcrumbItems = generateBreadcrumbs()

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center">
          {breadcrumbItems.length > 0 && (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbItems.map((item, index) => (
                  <React.Fragment key={index}>
                    <BreadcrumbItem>
                      {item.href && !item.isActive ? (
                        <BreadcrumbLink 
                          href={item.href} 
                          className={`text-sm ${item.isProductName ? 'font-bold' : ''}`}
                        >
                          {item.label}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className={`text-sm ${item.isProductName ? 'font-bold' : ''}`}>
                          {item.label}
                        </BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>

        {/* User Menu - Prepared for future */}
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    U
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">User</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem disabled className="text-sm">
                Profil utilisateur
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="text-sm">
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="text-sm">
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}