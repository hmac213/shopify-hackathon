import {useMemo} from 'react'
import {usePopularProducts, useProductSearch, useRecommendedProducts, type Product} from '@shopify/shop-minis-react'

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
  const normalizedCategory = (category ?? '').trim()
  const shouldSearch = normalizedCategory.length > 0 && !surprise

  const {products: recommendedProducts, loading: recLoading, error: recError, refetch: refetchRecommended} = useRecommendedProducts({first})

  const {products: searchProducts, loading: searchLoading, error: searchError, refetch: refetchSearch} = useProductSearch({
    query: normalizedCategory,
    // Category can be passed both via query text and as a filter hint
    filters: normalizedCategory ? {category: [normalizedCategory]} : undefined,
    first,
    skip: !shouldSearch,
  })

  // Fallback to popular if nothing else
  const {products: popularProducts, loading: popLoading, error: popError, refetch: refetchPopular} = usePopularProducts({first, skip: !surprise && shouldSearch})

  const merged = useMemo(() => {
    const primary: Product[] = searchProducts ?? (surprise ? (recommendedProducts ?? []) : [])

    const secondaryPool: Product[] = surprise
      ? [...(popularProducts ?? []), ...(recommendedProducts ?? [])]
      : (recommendedProducts ?? [])

    const seen = new Set<string>()
    const result: Product[] = []

    for (const p of primary) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        result.push(p)
      }
    }
    for (const p of secondaryPool) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        result.push(p)
      }
    }

    // Limit to requested page size
    return result.slice(0, first)
  }, [first, searchProducts, recommendedProducts, popularProducts, surprise])

  const loading = recLoading || searchLoading || popLoading
  const error = searchError ?? recError ?? popError ?? null

  const refetch = async () => {
    await Promise.all([
      refetchRecommended(),
      refetchSearch(),
      refetchPopular(),
    ])
  }

  return {
    products: merged,
    loading,
    error,
    refetch,
  }
} 