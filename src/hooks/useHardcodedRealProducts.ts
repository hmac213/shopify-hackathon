import {useMemo} from 'react'
import {useProductSearch, type Product} from '@shopify/shop-minis-react'

const TARGETS = [
  { key: 'labubu', title: 'Labubu', url: 'https://shop.app/products/8107994906819?variantId=44201302589635' },
  { key: 'toycar', title: 'Toy Car', url: 'https://shop.app/products/6943166922839?variantId=40330244882519' },
  { key: 'truck', title: 'Truck', url: 'https://shop.app/products/1406362222670?variantId=12521968107598' },
  { key: 'chair', title: 'Chair', url: 'https://shop.app/products/7958550642850?variantId=43400249704610' },
] as const

export function useHardcodedRealProducts(first: number = 4): { products: Product[]; loading: boolean } {
  const q1 = useProductSearch({ query: TARGETS[0].title, first: 8, skip: first < 1 })
  const q2 = useProductSearch({ query: TARGETS[1].title, first: 8, skip: first < 2 })
  const q3 = useProductSearch({ query: TARGETS[2].title, first: 8, skip: first < 3 })
  const q4 = useProductSearch({ query: TARGETS[3].title, first: 8, skip: first < 4 })

  const loading = (q1.loading || q2.loading || q3.loading || q4.loading)

  const products = useMemo(() => {
    const picks: Product[] = []
    if (!q1.loading && q1.products && q1.products[0]) picks.push(q1.products[0])
    if (!q2.loading && q2.products && q2.products[0]) picks.push(q2.products[0])
    if (!q3.loading && q3.products && q3.products[0]) picks.push(q3.products[0])
    if (!q4.loading && q4.products && q4.products[0]) picks.push(q4.products[0])
    return picks.slice(0, first)
  }, [q1.loading, q1.products, q2.loading, q2.products, q3.loading, q3.products, q4.loading, q4.products, first])

  return { products, loading }
} 