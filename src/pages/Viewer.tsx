import {useEffect, useMemo, useRef, useState} from 'react'
import {SPLAT_PLY_URL, BASE_PLY_URL} from '../config/viewer'

import {Button, ProductCard, useShopCartActions, QuantitySelector, useDeeplink, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, useShare} from '@shopify/shop-minis-react'
import {X as CloseIcon} from 'lucide-react'
import {useLocation, useNavigate} from 'react-router'
import {useCategoryProducts} from '../hooks/useCategoryProducts'

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

type LogEntry = {
  id: number
  level: LogLevel
  args: unknown[]
  timestamp: number
  source?: 'console' | 'error' | 'rejection'
}

function formatArgs(args: unknown[]): string {
  try {
    return args
      .map((a) => {
        if (typeof a === 'string') return a
        if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack ?? ''}`
        return JSON.stringify(a, (_k, v) => (v === undefined ? 'undefined' : v), 2)
      })
      .join(' ')
  } catch {
    return args.map((a) => String(a)).join(' ')
  }
}

function useInAppConsole() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const idCounter = useRef(1)
  const originals = useRef<Partial<Record<LogLevel, (...args: unknown[]) => void>>>({})

  useEffect(() => {
    const levels: LogLevel[] = ['log', 'info', 'warn', 'error', 'debug']
    for (const lvl of levels) {
      originals.current[lvl] = console[lvl]
      console[lvl] = (...args: unknown[]) => {
        setEntries((prev) => [
          ...prev,
          {id: idCounter.current++, level: lvl, args, timestamp: Date.now(), source: 'console'},
        ])
        originals.current[lvl]?.(...args)
      }
    }

    const onError = (ev: ErrorEvent) => {
      setEntries((prev) => [
        ...prev,
        {
          id: idCounter.current++,
          level: 'error',
          args: [ev.message, ev.error?.stack ?? ev.filename + ':' + ev.lineno + ':' + ev.colno],
          timestamp: Date.now(),
          source: 'error',
        },
      ])
    }
    const onRejection = (ev: PromiseRejectionEvent) => {
      setEntries((prev) => [
        ...prev,
        {
          id: idCounter.current++,
          level: 'error',
          args: ['UnhandledRejection', ev.reason],
          timestamp: Date.now(),
          source: 'rejection',
        },
      ])
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    return () => {
      for (const lvl of levels) {
        if (originals.current[lvl]) {
          console[lvl] = originals.current[lvl] as (...args: unknown[]) => void
        }
      }
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  const clear = () => setEntries([])

  const asText = useMemo(() => {
    return entries
      .map((e) => {
        const time = new Date(e.timestamp).toISOString()
        return `[${time}] ${e.level.toUpperCase()}: ${formatArgs(e.args)}`
      })
      .join('\n')
  }, [entries])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asText)
    } catch {
      // ignore
    }
  }

  return {entries, clear, copy}
}

export function Viewer() {
  const {entries, clear, copy} = useInAppConsole()
  const [showDebug, setShowDebug] = useState(false)
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<{x: number; y: number} | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  // const [activeProductId, setActiveProductId] = useState<string | null>(null)
  const [showFullView, setShowFullView] = useState(false)
  const routeLocation = useLocation() as {state?: {category?: string; surprise?: boolean; productIds?: string[]}}
  const navigate = useNavigate()
  const {queryParams} = useDeeplink()
  const viewerPool = useCategoryProductsForViewer()
  const [showPostDialog, setShowPostDialog] = useState(false)
  const [postName, setPostName] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  const envInfo = useMemo(
    () => ({
      href: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      language: typeof navigator !== 'undefined' ? navigator.language : '',
      viewport:
        typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
    }),
    []
  )

  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Ensure URL param is set so the vendored script picks it up
    try {
      // Build an absolute URL using base+path when provided
      let effectiveUrl = SPLAT_PLY_URL
      try {
        const base = BASE_PLY_URL && BASE_PLY_URL.length > 0 ? BASE_PLY_URL : undefined
        effectiveUrl = base ? new URL(SPLAT_PLY_URL, base).toString() : new URL(SPLAT_PLY_URL).toString()
      } catch {}
      const params = new URLSearchParams(window.location.search)

      if (BASE_PLY_URL) params.set('base', BASE_PLY_URL)
      // Only set the scene URL if not already provided via deeplink/share
      if (!params.get('url') && SPLAT_PLY_URL) params.set('url', SPLAT_PLY_URL)
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`
      console.info('Viewer: setting url param for splat', {SPLAT_PLY_URL, BASE_PLY_URL, next})
      history.replaceState({}, '', next)
      ;(window as unknown as { __SPLAT_URL?: string; __SPLAT_BASE?: string }).__SPLAT_URL = effectiveUrl
      ;(window as unknown as { __SPLAT_BASE?: string }).__SPLAT_BASE = BASE_PLY_URL
    } catch {}

    // Dynamically import the vendored module once the DOM is ready
    // Avoid running twice under HMR by setting a global flag
    import('../vendor/splat-main.js')
      .catch((err) => {
        console.error('Failed to import splat viewer module', err)
      })

    return () => {
      // Best-effort cleanup of elements the script may have toggled
      const spinner = document.getElementById('spinner')
      if (spinner) spinner.style.display = 'none'
    }
  }, [])

  // Post current creation (scene + selection)
  const onPost = async () => {
    try {
      const params = new URLSearchParams(window.location.search)
      const sceneUrl = params.get('url') || SPLAT_PLY_URL || ''
      const productIds = firstFourProductIds(viewerPool)
      const category = (queryParams?.category as string | undefined) || routeLocation?.state?.category || ''
      const surprise = (queryParams?.surprise === 'true') || !!routeLocation?.state?.surprise
      const origin = window.location.origin
      const query = new URLSearchParams({
        url: sceneUrl,
        category,
        surprise: String(!!surprise),
        productIds: productIds.join(','),
      })
      const url = `${origin}/viewer?${query.toString()}`
      // Send to arbitrary endpoint (placeholder) — opt-in to leaderboard
      setIsPosting(true)
      setPostError(null)
      await fetch('https://example.com/leaderboard/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, name: postName.trim() || 'My Mini Shop', category })
      })
      setShowPostDialog(false)
      setIsPosting(false)
    } catch (e) {
      setIsPosting(false)
      setPostError('Failed to post. Please try again later.')
    }
  }

  // Track point click and live screen positions for anchoring
  useEffect(() => {
    const onClick = (e: Event) => {
      const detail = (e as CustomEvent).detail as {id?: string; x?: number; y?: number; url?: string} | undefined
      if (!detail) return
      setSelectedPointId(detail.id ?? null)
      if (typeof detail.x === 'number' && typeof detail.y === 'number') {
        setAnchor({x: detail.x, y: detail.y})
      }
      if (typeof detail?.url === 'string' && detail.url.length > 0) {
        setSourceUrl(detail.url)
      } else {
        setSourceUrl(null)
      }
    }
    const onPositions = (e: Event) => {
      if (!anchor) return
      const detail = (e as CustomEvent).detail as { positions: Record<string, {x?: number; y?: number; visible?: boolean}> }
      // follow nearest visible point to current anchor
      let bestId: string | null = null
      let bestDist = Infinity
      for (const [id, p] of Object.entries(detail.positions || {})) {
        if (p?.visible && typeof p.x === 'number' && typeof p.y === 'number') {
          const dx = p.x - anchor.x
          const dy = p.y - anchor.y
          const d = dx*dx + dy*dy
          if (d < bestDist) { bestDist = d; bestId = id }
        }
      }
      if (bestId) {
        const p = detail.positions[bestId]!
        setAnchor({x: p.x!, y: p.y!})
      }
    }
    window.addEventListener('splat:tracker_click', onClick as EventListener)
    window.addEventListener('splat:points_screen', onPositions as EventListener)
    return () => {
      window.removeEventListener('splat:tracker_click', onClick as EventListener)
      window.removeEventListener('splat:points_screen', onPositions as EventListener)
    }
  }, [anchor])

  return (
    <div ref={hostRef} className="min-h-dvh w-dvw relative bg-black">
      <canvas id="canvas" className="absolute inset-0 w-full h-full" />
      <div className="absolute left-0 right-0 top-0 z-30 p-2 flex items-center justify-between text-white text-xs">
        <div id="camid" className="px-2 py-1 rounded bg-black/40" />
        <div id="fps" className="px-2 py-1 rounded bg-black/40" />
      </div>
      <div id="spinner" className="absolute inset-0 z-20 grid place-items-center bg-black/40">
        <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </div>
      <div className="absolute left-0 right-0 bottom-0 z-30 h-1 bg-white/10">
        <div id="progress" className="h-full bg-white/60" style={{width: 0}} />
      </div>
      <div id="message" className="absolute inset-x-0 bottom-4 z-30 mx-4 text-center text-rose-300 text-xs" />

      <div className="absolute top-4 left-4 z-40">
        <Button variant="secondary" size="sm" onClick={() => setShowDebug(true)}>Debug</Button>
      </div>

      <div className="absolute inset-x-4 bottom-4 z-40">
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" className="w-full" onClick={() => setShowPostDialog(true)}>Post</Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={() => window.dispatchEvent(new CustomEvent('splat:reset_view'))}>Center</Button>
        </div>
      </div>

      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name your shop</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input placeholder="e.g., Alex’s Studio" value={postName} onChange={(e: any) => setPostName(e.target.value)} />
            {postError ? <div className="text-xs text-rose-500">{postError}</div> : null}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowPostDialog(false)}>Cancel</Button>
            <Button onClick={onPost} disabled={isPosting}>{isPosting ? 'Posting…' : 'Post'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!showFullView && (
        <AnchoredProductCard
          anchor={anchor}
          selectedPointId={selectedPointId}
          sourceUrl={sourceUrl}
          onClose={() => { setSelectedPointId(null); setAnchor(null); setSourceUrl(null) }}
          onFullView={(productId) => {
            setShowFullView(false)
            const params = new URLSearchParams({ url: sourceUrl || '' , productId: productId || '' })
            navigate(`/full?${params.toString()}`, { replace: false })
            setSelectedPointId(null)
            setAnchor(null)
          }}
        />
      )}

      {/* Full view moved to separate page */}

      {showDebug && (
        <div className="absolute inset-0 z-50 bg-black/80 text-white flex flex-col">
          <div className="p-3 flex items-center justify-between gap-2 border-b border-white/10">
            <div className="text-sm font-medium">Debug Console</div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={clear}>Clear</Button>
              <Button variant="secondary" size="sm" onClick={copy}>Copy</Button>
              <Button size="sm" onClick={() => setShowDebug(false)}>Close</Button>
            </div>
          </div>

          <div className="px-3 py-2 text-[11px] text-white/80 space-y-1 border-b border-white/10">
            <div>URL: {envInfo.href}</div>
            <div>UA: {envInfo.userAgent}</div>
            <div>Lang: {envInfo.language} • Viewport: {envInfo.viewport}</div>
          </div>

          <div className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-words">
            {entries.length === 0 ? (
              <div className="text-white/60">No logs yet. Interact with the app to see logs.</div>
            ) : (
              entries.map((e) => {
                const time = new Date(e.timestamp).toLocaleTimeString()
                const text = formatArgs(e.args)
                const color =
                  e.level === 'error'
                    ? 'text-rose-300'
                    : e.level === 'warn'
                    ? 'text-amber-300'
                    : e.level === 'info'
                    ? 'text-sky-300'
                    : e.level === 'debug'
                    ? 'text-emerald-300'
                    : 'text-white'
                return (
                  <div key={e.id} className={color}>
                    [{time}] {e.level.toUpperCase()}: {text}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface AnchoredProductCardProps {
  anchor: {x: number; y: number} | null
  selectedPointId: string | null
  sourceUrl: string | null
  onClose: () => void
  onFullView: (productId: string) => void
}

function AnchoredProductCard({anchor, selectedPointId, sourceUrl, onClose, onFullView}: AnchoredProductCardProps) {
  // Map first four products to four points
  const pool = useCategoryProductsForViewer()
  const mapped = useMemo(() => mapProductsToPoints(pool), [pool])

  const product = selectedPointId ? mapped[selectedPointId] ?? null : null
  if (!product || !anchor) return null

  const left = Math.min(Math.max(anchor.x, 12), window.innerWidth - 12)
  const top = Math.min(Math.max(anchor.y - 8, 12), window.innerHeight - 12)
  const style: React.CSSProperties = {position: 'absolute', left, top, transform: 'translate(-50%, -100%)', zIndex: 60}

  return (
    <div style={style} className="min-w-[240px] max-w-[84vw]">
      <SdkProductCard product={product} sourceUrl={sourceUrl} onClose={onClose} onFullView={() => onFullView(product.id)} />
    </div>
  )
}

function SdkProductCard({product, sourceUrl, onClose, onFullView}: {product: any; sourceUrl: string | null; onClose: () => void; onFullView: () => void}) {
  return (
    <div className="rounded-xl shadow-2xl bg-white border border-black/5 p-3">
      <ProductCard product={product} variant="default" />
      {sourceUrl ? (
        <div className="mt-2 text-[10px] text-neutral-500 break-all">{sourceUrl}</div>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button className="w-full" onClick={onFullView}>Full View</Button>
        <Button variant="secondary" className="w-full" onClick={onClose}>Dismiss</Button>
      </div>
    </div>
  )
}

// FullProductView moved to a dedicated page: see FullView.tsx

// Viewer details UI moved to FullView
// Stubs retained for compatibility after moving full view to its own page
export function FullProductView(_props: {productId: string; sourceUrl: string | null; onClose: () => void}) {
  return null
}

export function ViewerProductDetails(_props: {productId: string; sourceUrl: string | null}) {
  return null
}

// Select 4 products for the viewer based on category from navigation state (passed via Loading)
function useCategoryProductsForViewer() {
  const location = useLocation() as {state?: {category?: string; surprise?: boolean; productIds?: string[]}}
  const {queryParams} = useDeeplink()
  const sharedCategory = (queryParams?.category as string | undefined) || undefined
  const sharedSurprise = queryParams?.surprise === 'true'
  const sharedIds = typeof queryParams?.productIds === 'string' && (queryParams?.productIds as string).length > 0
    ? (queryParams?.productIds as string).split(',')
    : undefined
  const category = sharedCategory ?? location?.state?.category
  const surprise = sharedCategory != null ? false : (sharedSurprise || !!location?.state?.surprise)
  const explicitIds = sharedIds ?? location?.state?.productIds
  // If upstream passed exact ids, prefer those
  const {products} = useCategoryProducts({category, surprise, first: 16})
  const final = useMemo(() => {
    if (explicitIds && explicitIds.length > 0) return products.filter(p => explicitIds.includes(p.id))
    return products
  }, [products, explicitIds])
  return final
}

function mapProductsToPoints(products: any[]): Record<string, any> {
  const pointIds = ['p1','p2','p3','p4']
  const mapped: Record<string, any> = {}
  for (let i = 0; i < pointIds.length; i++) {
    const p = products[i]
    if (p) mapped[pointIds[i]] = p
  }
  return mapped
}

function firstFourProductIds(products: any[]): string[] {
  return (products || []).slice(0, 4).map((p: any) => p.id)
}