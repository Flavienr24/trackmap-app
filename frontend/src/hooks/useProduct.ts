import { useProductContext } from '@/contexts/ProductContext'
import { slugifyProductName, doesProductNameMatchSlug } from '@/utils/slug'
import { useMemo } from 'react'

/**
 * Custom hook to simplify access to product context and provide utility functions
 */
export const useProduct = () => {
  const context = useProductContext()
  
  // Find product by slug
  const findProductBySlug = useMemo(() => {
    return (slug: string) => {
      return context.products.find(product => 
        doesProductNameMatchSlug(product.name, slug)
      ) || null
    }
  }, [context.products])
  
  // Get current product slug
  const currentProductSlug = useMemo(() => {
    return context.currentProduct ? slugifyProductName(context.currentProduct.name) : null
  }, [context.currentProduct])
  
  // Check if a product is currently selected
  const hasSelectedProduct = Boolean(context.currentProduct)
  
  // Get product options for dropdown
  const productOptions = useMemo(() => {
    return context.products.map(product => ({
      value: product.id,
      label: product.name,
      product,
    }))
  }, [context.products])
  
  return {
    // Core context
    ...context,
    
    // Utility functions
    findProductBySlug,
    currentProductSlug,
    hasSelectedProduct,
    productOptions,
    
    // Helper to set product by slug
    setCurrentProductBySlug: (slug: string) => {
      const product = findProductBySlug(slug)
      if (product) {
        context.setCurrentProduct(product)
        return true
      }
      return false
    },
    
    // Helper to clear selection
    clearSelection: () => context.setCurrentProduct(null),
  }
}