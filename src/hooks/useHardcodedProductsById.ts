import {useMemo} from 'react'
import {useProduct, type Product} from '@shopify/shop-minis-react'

const PRODUCT_IDS = {
  labubu: 8107994906819,
  toycar: 6943166922839,
  truck: 1406362222670,
  chair: 7958550642850,
} as const

const VARIANT_IDS = {
  labubu: 44201302589635,
  toycar: 40330244882519,
  truck: 12521968107598,
  chair: 43400249704610,
} as const

function toProductGid(id: number | string) {
  return `gid://shopify/Product/${id}`
}

function toVariantGid(id: number | string) {
  return `gid://shopify/ProductVariant/${id}`
}

export function useHardcodedProductsById(first: number = 4): { products: Product[]; loading: boolean } {
  // Desired order: chair, labubu, toycar, truck
  const ordered = [PRODUCT_IDS.chair, PRODUCT_IDS.labubu, PRODUCT_IDS.toycar, PRODUCT_IDS.truck]
  const ids = ordered.slice(0, first)

  // Fetch each product by ID via the SDK hook
  const q1 = useProduct({ id: toProductGid(ids[0]) })
  const q2 = ids[1] != null ? useProduct({ id: toProductGid(ids[1]) }) : { product: null, loading: false } as any
  const q3 = ids[2] != null ? useProduct({ id: toProductGid(ids[2]) }) : { product: null, loading: false } as any
  const q4 = ids[3] != null ? useProduct({ id: toProductGid(ids[3]) }) : { product: null, loading: false } as any

  const loading = !!(q1.loading || (q2 as any).loading || (q3 as any).loading || (q4 as any).loading)

  const products = useMemo(() => {
    const list: (Product | null | undefined)[] = [q1.product, (q2 as any).product, (q3 as any).product, (q4 as any).product]
    return list.filter(Boolean).slice(0, first) as Product[]
  }, [q1.product, (q2 as any).product, (q3 as any).product, (q4 as any).product, first])

  return { products, loading }
} 