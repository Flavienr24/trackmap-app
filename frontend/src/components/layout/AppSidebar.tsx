import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { CreateProductModal } from '@/components/organisms/CreateProductModal'
import { useProduct } from '@/hooks/useProduct'
import { productsApi } from '@/services/api'
import { slugifyProductName } from '@/utils/slug'
import type { CreateProductRequest } from '@/types'
import packageJson from '../../../package.json'

const navigationItems = [
  {
    title: 'Dashboard',
    icon: '📊',
    path: (productSlug: string) => `/products/${productSlug}`,
  },
  {
    title: 'Pages',
    icon: '📑',
    path: (productSlug: string) => `/products/${productSlug}/pages`,
  },
  {
    title: 'Events',
    icon: '⚡',
    path: (productSlug: string) => `/products/${productSlug}/events`,
  },
  {
    title: 'Propriétés',
    icon: '🏷️',
    path: (productSlug: string) => `/products/${productSlug}/properties`,
  },
  {
    title: 'Valeurs suggérées',
    icon: '💎',
    path: (productSlug: string) => `/products/${productSlug}/suggested-values`,
  },
]

export const AppSidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { 
    currentProduct, 
    products, 
    setCurrentProduct, 
    currentProductSlug,
    hasSelectedProduct,
    isLoading,
    loadProducts
  } = useProduct()

  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [createLoading, setCreateLoading] = React.useState(false)


  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setCurrentProduct(product)
      const slug = currentProductSlug || product.name.toLowerCase()
      navigate(`/products/${slug}`)
    }
  }

  const handleSeeAllProducts = () => {
    navigate('/')
  }

  const handleAddNewProduct = () => {
    setShowCreateModal(true)
  }

  const handleCreateSubmit = async (data: CreateProductRequest) => {
    setCreateLoading(true)
    try {
      const response = await productsApi.create(data)
      await loadProducts() // Refresh products list
      
      // Select the newly created product and navigate to it
      if (response.data) {
        setCurrentProduct(response.data)
        const slug = slugifyProductName(response.data.name)
        navigate(`/products/${slug}`)
      }
    } catch (error) {
      console.error('Error creating product:', error)
      throw error // Let the modal handle the error display
    } finally {
      setCreateLoading(false)
    }
  }

  const handleNavigation = (path: string) => {
    if (currentProductSlug) {
      navigate(path)
    }
  }

  const isActiveRoute = (path: string) => {
    return location.pathname === path
  }

  return (
    <Sidebar className="relative w-64 flex-shrink-0">
      <SidebarHeader className="p-4">
        {/* Logo TrackMap */}
        <div 
          className="flex items-center space-x-3 cursor-pointer mb-4" 
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">TrackMap</h1>
        </div>

        {/* Product Selector Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between"
              disabled={isLoading || products.length === 0}
            >
              <span className="truncate">
                {currentProduct?.name || 'Sélectionner un produit'}
              </span>
              <svg 
                className="w-4 h-4 ml-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 9l-7 7-7-7" 
                />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="w-[--radix-dropdown-menu-trigger-width] max-w-none z-50"
            side="bottom"
            align="start"
          >
            {products.length === 0 ? (
              <DropdownMenuItem disabled>
                {isLoading ? 'Chargement...' : 'Aucun produit disponible'}
              </DropdownMenuItem>
            ) : (
              <>
                {products.map((product) => (
                  <DropdownMenuItem
                    key={product.id}
                    onClick={() => handleProductSelect(product.id)}
                    className="cursor-pointer"
                  >
                    <div className="w-full">
                      <div className="font-medium">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-muted-foreground truncate">
                          {product.description}
                        </div>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem
                  onClick={handleSeeAllProducts}
                  className="cursor-pointer text-muted-foreground"
                >
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    <span>See all products</span>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={handleAddNewProduct}
                  className="cursor-pointer text-muted-foreground"
                >
                  <div className="flex items-center gap-2">
                    <span>➕</span>
                    <span>Add new product</span>
                  </div>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigationItems.map((item) => {
              const path = currentProductSlug ? item.path(currentProductSlug) : '#'
              const isActive = hasSelectedProduct && isActiveRoute(path)
              const isDisabled = !hasSelectedProduct

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => !isDisabled && handleNavigation(path)}
                    className={`
                      w-full justify-start gap-3 
                      ${isActive ? 'bg-accent text-accent-foreground' : ''}
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    disabled={isDisabled}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground text-center">
          <div>TrackMap v{packageJson.version}</div>
          <div className="mt-1">Audit & Documentation GA4</div>
        </div>
      </SidebarFooter>

      {/* Create Product Modal */}
      <CreateProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        loading={createLoading}
      />
    </Sidebar>
  )
}