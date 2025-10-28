import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { productsApi } from '@/services/api'
import type { Product } from '@/types'

interface ProductContextType {
  currentProduct: Product | null
  products: Product[]
  setCurrentProduct: (product: Product | null) => void
  loadProducts: (force?: boolean) => Promise<void>
  isLoading: boolean
  error: string | null
}

const ProductContext = createContext<ProductContextType | undefined>(undefined)

const STORAGE_KEY = 'trackmap_current_product'

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentProduct, setCurrentProductState] = useState<Product | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const loadPromiseRef = useRef<Promise<void> | null>(null)

  // Load products from API with deduplication
  const loadProducts = useCallback(async (force = false) => {
    // Avoid duplicate fetches in StrictMode/dev by reusing in-flight promise
    if (loadPromiseRef.current) {
      if (!force) {
        return loadPromiseRef.current
      }
      // Wait for the current fetch before forcing a refresh
      await loadPromiseRef.current
    }

    // Skip if already loaded unless force=true
    if (isLoaded && !force) {
      return
    }

    const fetchPromise = (async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await productsApi.getAll()
        setProducts(response.data)
        setIsLoaded(true)
      } catch (err) {
        console.error('Error loading products:', err)
        setError('Failed to load products')
        setProducts([])
      } finally {
        setIsLoading(false)
        loadPromiseRef.current = null
      }
    })()

    loadPromiseRef.current = fetchPromise
    return fetchPromise
  }, [isLoaded])

  // Load current product from localStorage on mount
  useEffect(() => {
    const savedProduct = localStorage.getItem(STORAGE_KEY)
    if (savedProduct) {
      try {
        const parsed = JSON.parse(savedProduct)
        setCurrentProductState(parsed)
      } catch (err) {
        console.error('Error parsing saved product:', err)
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  // Load products on mount
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Save current product to localStorage
  const setCurrentProduct = useCallback((product: Product | null) => {
    setCurrentProductState(product)
    if (product) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(product))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const value: ProductContextType = {
    currentProduct,
    products,
    setCurrentProduct,
    loadProducts,
    isLoading,
    error,
  }

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  )
}

export const useProductContext = () => {
  const context = useContext(ProductContext)
  if (context === undefined) {
    throw new Error('useProductContext must be used within a ProductProvider')
  }
  return context
}
