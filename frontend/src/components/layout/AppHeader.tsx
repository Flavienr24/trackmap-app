import React from 'react'
import { useLocation, useParams } from 'react-router-dom'
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

export const AppHeader: React.FC = () => {
  const location = useLocation()
  const params = useParams()
  const { currentProduct } = useProduct()

  // Exact reproduction of the old breadcrumb logic using shadcn components
  const generateBreadcrumbs = () => {
    const { productName, pageSlug } = params
    const path = location.pathname

    const items = []

    // Home page - no breadcrumb
    if (path === '/') {
      return items
    }

    // Always start with "Produits" for any non-home page
    items.push({
      label: 'Produits',
      href: '/products',
      isActive: false
    })

    // If we have a productName in URL and currentProduct is loaded
    if (productName && currentProduct) {
      // Add product name (always linkable to dashboard except when we're on dashboard)
      items.push({
        label: currentProduct.name,
        href: path === `/products/${productName}` ? undefined : `/products/${productName}`,
        isActive: path === `/products/${productName}`
      })

      // Specific page logic based on exact path patterns from old code
      if (path.includes('/properties') && path.includes('/suggested-values')) {
        // SuggestedValuesList: Produits › NomProduit › Propriétés › Valeurs suggérées
        items.push({
          label: 'Propriétés',
          href: `/products/${productName}/properties`,
          isActive: false
        })
        items.push({
          label: 'Valeurs suggérées',
          isActive: true
        })
      } else if (path.includes('/properties')) {
        // PropertiesList: Produits › NomProduit › Propriétés
        items.push({
          label: 'Propriétés',
          isActive: true
        })
      } else if (path.includes('/pages')) {
        if (pageSlug) {
          // PageDetail: Produits › NomProduit › NomPage (pageSlug is the page name)
          items.push({
            label: pageSlug,
            isActive: true
          })
        } else {
          // PagesList: Produits › NomProduit › Pages
          items.push({
            label: 'Pages',
            isActive: true
          })
        }
      } else if (path.includes('/events')) {
        // EventsList: Produits › NomProduit › Events
        items.push({
          label: 'Events',
          isActive: true
        })
      }
      // Note: Dashboard (path === `/products/${productName}`) doesn't add extra breadcrumb
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
                        <BreadcrumbLink href={item.href} className="text-sm">
                          {item.label}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="text-sm">
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