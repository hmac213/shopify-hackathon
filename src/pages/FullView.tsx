import {useEffect, useMemo, useState} from 'react'
import {useLocation, useNavigate} from 'react-router'
import {Button, ProductCard, useShopCartActions, QuantitySelector, useDeeplink} from '@shopify/shop-minis-react'
import {X as CloseIcon} from 'lucide-react'
import {BASE_PLY_URL} from '../config/viewer'
import {useCategoryProducts} from '../hooks/useCategoryProducts'

export function FullView() {
  // Ensure vendor script runs in single-file mode and uses the provided ?url=
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const providedUrl = params.get('url') || ''
      const providedBase = params.get('base') || BASE_PLY_URL || ''

      // Force single mode so multi-merge is disabled
      if (params.get('single') !== '1') {
        params.set('single', '1')
        const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`
        history.replaceState({}, '', next)
      }

      // Compute absolute URL if possible
      let effectiveUrl = providedUrl
      try {
        effectiveUrl = providedBase
          ? new URL(providedUrl, providedBase).toString()
          : new URL(providedUrl).toString()
      } catch {}

      ;(window as unknown as { __SPLAT_URL?: string }).__SPLAT_URL = effectiveUrl
      if (providedBase) {
        ;(window as unknown as { __SPLAT_BASE?: string }).__SPLAT_BASE = providedBase
      }
      ;(window as unknown as { __FORCE_SINGLE?: boolean }).__FORCE_SINGLE = true

      // Load the viewer once the DOM elements exist
      import('../vendor/splat-main.js').catch((err) => {
        console.error('Failed to import splat viewer module (full view)', err)
      })
    } catch {}
  }, [])

  const hasUrl = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      return !!params.get('url')
    } catch {
      return false
    }
  }, [])

  return (
    <div className="min-h-dvh w-dvw bg-white">
      <div className="relative h-[50vh] w-full mx-3 mt-3 rounded-2xl border border-black/10 shadow-md overflow-hidden">
        <canvas id="canvas" className="absolute inset-0 w-full h-full" />

        {/* Minimal HUD required by vendor script */}
        <div className="absolute left-0 right-0 top-0 z-30 p-2 flex items-center justify-between text-white text-xs">
          <div id="camid" className="px-2 py-1 rounded bg-black/40" />
          <div id="fps" className="px-2 py-1 rounded bg-black/40" />
        </div>

        {/* Back button */}
        <BackButton />

        <div id="spinner" className="absolute inset-0 z-20 grid place-items-center bg-black/40">
          <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>

        <div className="absolute left-0 right-0 bottom-0 z-30 h-1 bg-white/10">
          <div id="progress" className="h-full bg-white/60" style={{width: 0}} />
        </div>

        <div id="message" className="absolute inset-x-0 bottom-4 z-30 mx-4 text-center text-rose-300 text-xs">
          {!hasUrl ? 'Missing ?url= parameter' : ''}
        </div>
      </div>

      {/* Bottom half product details */}
      <div className="h-[50vh] w-full bg-white">
        <FullViewProductDetails />
      </div>
    </div>
  )
}

function BackButton() {
  const navigate = useNavigate()
  return (
    <Button
      size="lg"
      variant="icon"
      aria-label="Back"
      onClick={() => navigate(-1)}
      className="absolute top-3 right-3 z-[50] size-12"
    >
      <CloseIcon />
    </Button>
  )
}

function useProductFromQuery() {
  const {queryParams} = useDeeplink()
  const routeLocation = useLocation() as {state?: {category?: string; surprise?: boolean; productIds?: string[]}}
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const productId = params.get('productId') || ''
  const sharedCategory = (queryParams?.category as string | undefined) || undefined
  const sharedSurprise = queryParams?.surprise === 'true'
  const sharedIds = typeof queryParams?.productIds === 'string' && (queryParams?.productIds as string).length > 0
    ? (queryParams?.productIds as string).split(',')
    : undefined
  const category = sharedCategory ?? routeLocation?.state?.category
  const surprise = sharedCategory != null ? false : (sharedSurprise || !!routeLocation?.state?.surprise)
  const explicitIds = sharedIds ?? routeLocation?.state?.productIds
  const {products} = useCategoryProducts({category, surprise, first: 16})
  const final = useMemo(() => {
    if (explicitIds && explicitIds.length > 0) return products.filter(p => explicitIds.includes(p.id))
    return products
  }, [products, explicitIds])
  const product = useMemo(() => final.find((p: any) => p.id === productId), [final, productId])
  return {product}
}

function FullViewProductDetails() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const sourceUrl = params.get('url') || null
  const {product} = useProductFromQuery()
  const {addToCart, buyProduct} = useShopCartActions()
  const [quantity, setQuantity] = useState<number>(1)

  if (!product) {
    return (
      <div className="h-full w-full grid place-items-center text-gray-500 text-sm">No product selected</div>
    )
  }

  const onAddToCart = async () => {
    const variantId = (product as any).selectedVariant?.id || (product as any).defaultVariantId
    if (!variantId) return
    await addToCart({ productId: product.id, productVariantId: variantId, quantity })
  }
  const onBuyNow = async () => {
    const variantId = (product as any).selectedVariant?.id || (product as any).defaultVariantId
    if (!variantId) return
    await buyProduct({ productId: product.id, productVariantId: variantId, quantity })
  }

  return (
    <div className="h-full w-full overflow-auto p-4 space-y-3">
      <ProductCard product={product} variant="default" />
      {sourceUrl ? (
        <div className="text-[10px] text-neutral-500 break-all">{sourceUrl}</div>
      ) : null}
      <div className="sticky bottom-0 left-0 right-0 bg-white pt-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-gray-600">Qty</span>
          <QuantitySelector quantity={quantity} onQuantityChange={setQuantity} maxQuantity={99} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" variant="secondary" className="w-full py-4" onClick={onAddToCart}>Add to Cart</Button>
          <Button size="lg" className="w-full py-4" onClick={onBuyNow}>Buy Now</Button>
        </div>
      </div>
    </div>
  )
}


