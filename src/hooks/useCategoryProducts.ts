import {type Product} from '@shopify/shop-minis-react'
import {useHardcodedProductsById} from './useHardcodedProductsById'

export interface UseCategoryProductsParams {
  category?: string | null
  surprise?: boolean
  first?: number
}

export interface UseCategoryProductsResult {
  products: Product[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useCategoryProducts({category, surprise = false, first = 20}: UseCategoryProductsParams): UseCategoryProductsResult {
  // Exact products by ID; ignore category for now
  const { products, loading } = useHardcodedProductsById(Math.min(4, first))
  const error = null
  const refetch = async () => {}

  return { products, loading, error, refetch }
} 