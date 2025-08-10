import {useEffect, useMemo, useRef, useState} from 'react'
import {Button} from '@shopify/shop-minis-react'
import {SPLAT_PLY_URL} from '../config/viewer'

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
      const params = new URLSearchParams(window.location.search)
      if (SPLAT_PLY_URL) params.set('url', SPLAT_PLY_URL)
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`
      console.info('Viewer: setting url param for splat', {SPLAT_PLY_URL, next})
      history.replaceState({}, '', next)
    } catch {}

    // Dynamically import the vendored module once the DOM is ready
    // Avoid running twice under HMR by setting a global flag
    ;(window as unknown as { __SPLAT_URL?: string }).__SPLAT_URL = SPLAT_PLY_URL
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

      <div className="absolute bottom-4 right-4 z-40">
        <Button size="sm" onClick={() => setShowDebug(true)}>Debug</Button>
      </div>

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