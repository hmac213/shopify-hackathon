import {useEffect, useMemo, useState} from 'react'
import {useLocation, useNavigate} from 'react-router'
import {Button, ProductCard, useShopCartActions, QuantitySelector, useDeeplink} from '@shopify/shop-minis-react'
import {X as CloseIcon} from 'lucide-react'
import {BASE_PLY_URL} from '../config/viewer'
import {useCategoryProducts} from '../hooks/useCategoryProducts'

export function FullView() {
  console.log('[FullView] Component mounting...')
  
  // Ensure vendor script runs in single-file mode and uses the provided ?url=
  useEffect(() => {
    console.log('[FullView] useEffect running...')
    try {
      const params = new URLSearchParams(window.location.search)
      const providedUrl = params.get('url') || ''
      const providedBase = params.get('base') || BASE_PLY_URL || ''

      console.log('[FullView] URL params:', { providedUrl, providedBase })

      // Force single mode so multi-merge is disabled
      if (params.get('single') !== '1') {
        params.set('single', '1')
        const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`
        history.replaceState({}, '', next)
        console.log('[FullView] Updated URL to:', next)
      }

      // Compute absolute URL if possible
      let effectiveUrl = providedUrl
      try {
        effectiveUrl = providedBase
          ? new URL(providedUrl, providedBase).toString()
          : new URL(providedUrl).toString()
      } catch {}

      console.log('[FullView] Effective URL:', effectiveUrl)

      ;(window as unknown as { __SPLAT_SINGLE_URL?: string }).__SPLAT_SINGLE_URL = effectiveUrl
      if (providedBase) {
        ;(window as unknown as { __SPLAT_SINGLE_BASE?: string }).__SPLAT_SINGLE_BASE = providedBase
      }
      ;(window as unknown as { __FORCE_SINGLE?: boolean }).__FORCE_SINGLE = true

      console.log('[FullView] Global variables set, loading splat-single.js...')

      // Load the viewer once the DOM elements exist
      import('../vendor/splat-single.js').catch((err) => {
        console.error('Failed to import splat viewer module (full view)', err)
      })
    } catch (error) {
      console.error('[FullView] Error in useEffect:', error)
    }

    return () => {
      // Comprehensive cleanup when component unmounts
      console.log('FullView: cleaning up splat resources')
      
      // Call the splat script's cleanup function if available
      if ((window as any).__splatSingleCleanup) {
        (window as any).__splatSingleCleanup()
        delete (window as any).__splatSingleCleanup
      }
      
      // Best-effort cleanup of elements the script may have toggled
      const spinner = document.getElementById('spinner')
      if (spinner) spinner.style.display = 'none'
      
      const progress = document.getElementById('progress')
      if (progress) progress.style.width = '0%'
      
      const message = document.getElementById('message')
      if (message) message.innerText = ''
    }
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

        {/* Debug button */}
        <DebugButton />



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

function DebugButton() {
  const [showDebug, setShowDebug] = useState(false)
  
  const debugInfo = {
    url: new URLSearchParams(window.location.search).get('url') || 'N/A',
    productId: new URLSearchParams(window.location.search).get('productId') || 'N/A',
    canvas: document.getElementById('canvas') ? 'Found' : 'Not found',
    webglContext: (() => {
      const canvas = document.getElementById('canvas') as HTMLCanvasElement
      if (!canvas) return 'No canvas'
      const gl = canvas.getContext('webgl2')
      if (!gl) return 'No WebGL context'
      return gl.isContextLost() ? 'Context lost' : 'Active'
    })(),
    splatLoaded: (window as any).__splatSingleLoaded ? 'Yes' : 'No',
    timestamp: new Date().toISOString()
  }

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setShowDebug(true)}
        className="absolute top-3 left-3 z-[50]"
      >
        Debug
      </Button>

      {showDebug && (
        <div className="absolute inset-0 z-[60] bg-black/80 text-white flex flex-col">
          <div className="p-3 flex items-center justify-between gap-2 border-b border-white/10">
            <div className="text-sm font-medium">FullView Debug Info</div>
            <Button size="sm" onClick={() => setShowDebug(false)}>Close</Button>
          </div>

          <div className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed">
            <div className="space-y-2">
              <div><strong>URL:</strong> {debugInfo.url}</div>
              <div><strong>Product ID:</strong> {debugInfo.productId}</div>
              <div><strong>Canvas:</strong> {debugInfo.canvas}</div>
              <div><strong>WebGL Context:</strong> {debugInfo.webglContext}</div>
              <div><strong>Splat Loaded:</strong> {debugInfo.splatLoaded}</div>
              <div><strong>Timestamp:</strong> {debugInfo.timestamp}</div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-sm font-medium mb-2">Actions:</div>
              <div className="space-y-2">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => {
                    const canvas = document.getElementById('canvas') as HTMLCanvasElement
                    if (canvas) {
                      canvas.width = canvas.width
                      console.log('Canvas reset')
                    }
                  }}
                >
                  Reset Canvas
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => {
                    if ((window as any).__splatSingleCleanup) {
                      (window as any).__splatSingleCleanup()
                      console.log('Manual cleanup triggered')
                    }
                  }}
                >
                  Manual Cleanup
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => {
                    console.log('Current window splat state:', {
                      __splatSingleLoaded: (window as any).__splatSingleLoaded,
                      __SPLAT_SINGLE_URL: (window as any).__SPLAT_SINGLE_URL,
                      __SPLAT_SINGLE_BASE: (window as any).__SPLAT_SINGLE_BASE,
                      __FORCE_SINGLE: (window as any).__FORCE_SINGLE
                    })
                  }}
                >
                  Log State
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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


