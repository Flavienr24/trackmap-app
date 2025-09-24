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

interface BreadcrumbItem {
  label: string
  href?: string
}

export const AppHeader: React.FC = () => {
  const location = useLocation()
  const params = useParams()
  const { currentProduct } = useProduct()

  // Generate breadcrumb items based on current route
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = []
    const { productName, pageSlug } = params

    // Always start with Products
    breadcrumbs.push({ label: 'Produits', href: '/' })

    if (productName && currentProduct) {
      // Add product name
      breadcrumbs.push({ 
        label: currentProduct.name, 
        href: `/products/${productName}` 
      })

      // Add specific sections based on path
      const path = location.pathname
      
      if (path.includes('/pages')) {
        if (pageSlug) {
          breadcrumbs.push({ 
            label: 'Pages', 
            href: `/products/${productName}/pages` 
          })
          // Find page name - this could be enhanced with actual page data
          breadcrumbs.push({ label: pageSlug })
        } else {
          breadcrumbs.push({ label: 'Pages' })
        }
      } else if (path.includes('/events')) {
        breadcrumbs.push({ label: 'Events' })
      } else if (path.includes('/properties')) {
        breadcrumbs.push({ label: 'Propriétés' })
      } else if (path.includes('/suggested-values')) {
        breadcrumbs.push({ label: 'Valeurs suggérées' })
      } else if (path === `/products/${productName}`) {
        breadcrumbs.push({ label: 'Dashboard' })
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={index}>
                  <BreadcrumbItem>
                    {item.href ? (
                      <BreadcrumbLink href={item.href} className="text-sm">
                        {item.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="text-sm font-medium">
                        {item.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
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