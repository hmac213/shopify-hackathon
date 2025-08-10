import {useMemo, useState, type ChangeEvent, type KeyboardEvent, type CSSProperties} from 'react'
import {Button, Input, Label} from '@shopify/shop-minis-react'
import {useEffect, useRef} from 'react'
import {useNavigate} from 'react-router'
import {Trophy} from 'lucide-react'

export function Menu() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('')
  const [spinStage, setSpinStage] = useState<null | 'spinning' | 'reveal'>(null)
  const [spinText, setSpinText] = useState('')
  const [spinStyle, setSpinStyle] = useState<CSSProperties>({})
  const revealTimeoutRef = useRef<number | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const prevTimeRef = useRef<number>(0)
  const totalMsRef = useRef<number>(0)
  const cyclesTargetRef = useRef<number>(0)
  const phaseRef = useRef<number>(0)
  const indexRef = useRef<number>(0)
  const prevCycleRef = useRef<number>(0)
  const stopArmedRef = useRef<boolean>(false)
  const decelActiveRef = useRef<boolean>(false)
  const decelStartPhaseRef = useRef<number>(0)
  const decelTargetPhaseRef = useRef<number>(0)
  const decelStartTimeRef = useRef<number>(0)
  const decelDurationRef = useRef<number>(0)

  const suggestions = useMemo(
    () => [
      'Desk setup',
      'Coffee bar',
      'Home gym',
      'Smart lights',
      'Plants',
      'Pet corner',
    ],
    []
  )

  const surprisePool = useMemo(
    () => [
      'Holiday Gifts',
      'Trendy Home',
      'Collectibles',
      'Toys and Gifts',
      'Urban Living',
      'Pop Culture',
      'Kids and Family',
      'Lifestyle Boost',
      'Happy Essentials'
    ],
    []
  )

  
  
  const onStart = () => {
    const selected = category.trim()
    if (!selected) return
    navigate('/capture', {state: {category: selected}})
  }

  const onSurprise = () => {
    if (spinStage) return
    setSpinStage('spinning')
    const totalMs = 2600 + Math.round(Math.random() * 1200)
    const cycles = 16 + Math.floor(Math.random() * 10)
    totalMsRef.current = totalMs
    cyclesTargetRef.current = cycles
    startTimeRef.current = performance.now()
    prevTimeRef.current = startTimeRef.current
    phaseRef.current = 0
    prevCycleRef.current = 0
    stopArmedRef.current = false
    decelActiveRef.current = false
    // Start at a random item
    indexRef.current = Math.floor(Math.random() * surprisePool.length)
    setSpinText(surprisePool[indexRef.current])
    // initial pose (left)
    setSpinStyle({
      transform: `translateX(40%) rotateY(-55deg) translateZ(0px) scale(0.88)`,
      filter: 'blur(0px)'
    })

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current
      const q = Math.min(1, elapsed / totalMsRef.current) // 0..1 timeline progress
      const dtSec = Math.max(0, (now - prevTimeRef.current) / 1000)
      prevTimeRef.current = now

      const totalSec = totalMsRef.current / 1000
      const k = (cyclesTargetRef.current * Math.PI) / (2 * totalSec) // scale so integral of speed == cycles
      let currentPhase = phaseRef.current

      if (!decelActiveRef.current) {
        // acceleration/peak stage
        const speed = k * Math.sin(Math.PI * q) // cycles/second, bell-shaped
        const normSpeed = Math.max(0, Math.min(1, speed / (k || 1)))

        // advance phase
        const prevPhase = currentPhase
        currentPhase = prevPhase + speed * dtSec
        phaseRef.current = currentPhase

        // boundary crossing -> next word
        if (Math.floor(currentPhase) !== Math.floor(prevPhase)) {
          indexRef.current = (indexRef.current + 1) % surprisePool.length
          setSpinText(surprisePool[indexRef.current])
        }

        const cycle = currentPhase - Math.floor(currentPhase)
        const s = 1 - 2 * cycle
        const translateX = 40 * s
        const rotateY = -55 * s
        const depth = (1 - Math.abs(s)) * 40
        const scale = 0.88 + (1 - Math.abs(s)) * 0.24
        const BLUR_MAX = 10
        const BLUR_START = 0.65 // start blurring a bit later
        const blur = normSpeed <= BLUR_START ? 0 : Math.round(BLUR_MAX * ((normSpeed - BLUR_START) / (1 - BLUR_START)))
        setSpinStyle({
          transform: `translateX(${translateX}%) rotateY(${rotateY}deg) translateZ(${depth}px) scale(${scale})`,
          filter: `blur(${blur}px)`
        })

        // Arm and switch to explicit deceleration
        if (!stopArmedRef.current && (q > 0.78 && normSpeed < 0.6)) {
          stopArmedRef.current = true
        }
        if (stopArmedRef.current && normSpeed < 0.45) {
          const baseInt = Math.floor(currentPhase)
          const baseCycle = currentPhase - baseInt
          const target = baseInt + (baseCycle < 0.5 ? 0.5 : 1.5)
          decelActiveRef.current = true
          decelStartPhaseRef.current = currentPhase
          decelTargetPhaseRef.current = target
          decelStartTimeRef.current = now
          decelDurationRef.current = 1100 // ms
        }

        prevCycleRef.current = cycle
        rafIdRef.current = requestAnimationFrame(tick)
        return
      }

      // deceleration to exact center
      const t = Math.min(1, (now - decelStartTimeRef.current) / decelDurationRef.current)
      const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)
      const e = easeOutCubic(t)
      const nextPhase = decelStartPhaseRef.current + (decelTargetPhaseRef.current - decelStartPhaseRef.current) * e
      const prevPhase = currentPhase
      currentPhase = nextPhase
      phaseRef.current = currentPhase

      if (Math.floor(currentPhase) !== Math.floor(prevPhase)) {
        indexRef.current = (indexRef.current + 1) % surprisePool.length
        setSpinText(surprisePool[indexRef.current])
      }

      const cycle = currentPhase - Math.floor(currentPhase)
      const s = 1 - 2 * cycle
      const translateX = 40 * s
      const rotateY = -55 * s
      const depth = (1 - Math.abs(s)) * 40
      const scale = 0.88 + (1 - Math.abs(s)) * 0.24
      const BLUR_MAX = 10
      // derivative of easeOutCubic: 3(1-t)^2
      const vel = 3 * Math.pow(1 - t, 2)
      const blur = t < 0.1 ? 0 : Math.round(BLUR_MAX * Math.min(1, vel))
      setSpinStyle({
        transform: `translateX(${translateX}%) rotateY(${rotateY}deg) translateZ(${depth}px) scale(${scale})`,
        filter: `blur(${blur}px)`
      })

      if (t >= 1) {
        setSpinStyle({
          transform: `translateX(0%) rotateY(0deg) translateZ(40px) scale(1.12)`,
          filter: 'blur(0px)'
        })
        const finalChoice = surprisePool[indexRef.current]
        setSpinText(finalChoice)
        setSpinStage('reveal')
        revealTimeoutRef.current = window.setTimeout(() => {
          navigate('/capture', {state: {category: finalChoice, surprise: true}})
        }, 2000)
        return
      }

      prevCycleRef.current = cycle
      rafIdRef.current = requestAnimationFrame(tick)
    }

    rafIdRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current) {
        window.clearTimeout(revealTimeoutRef.current)
        revealTimeoutRef.current = null
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [])

  return (
    <div className="min-h-dvh w-dvw flex flex-col bg-gradient-to-b from-pink-100 via-rose-50 to-amber-50">
      <div className="absolute top-4 right-4 z-10">
        <Button variant="icon" size="lg" onClick={() => navigate('/leaderboard')} aria-label="Leaderboard">
          <Trophy />
        </Button>
      </div>
      <div className="flex-1 px-5 pt-16 pb-8 flex flex-col items-center text-center">
        <div className="select-none">
          <h1
            className="text-[44px] leading-none font-extrabold italic tracking-tight text-pink-500 drop-shadow"
            style={{textShadow: '0 6px 14px rgba(244,114,182,0.35), 0 2px 0 rgba(255,255,255,0.6)'}}
          >
            SpinShop 3D:
          </h1>
          <h2
            className="mt-1 text-[44px] leading-none font-extrabold italic tracking-tight text-pink-500 drop-shadow"
            style={{textShadow: '0 6px 14px rgba(244,114,182,0.35), 0 2px 0 rgba(255,255,255,0.6)'}}
          >
            See It, Buy It!
          </h2>
        </div>

        <p className="mt-6 text-base text-gray-700/90 max-w-[28ch]">
          Pick a shopping vibe and we will turn your space into a personalized mini store.
        </p>

        <div className="mt-8 w-full">
          <Button variant="secondary" size="lg" className="w-full rounded-full" onClick={onSurprise}>
            Surprise me
          </Button>
        </div>

        <div className="mt-6 w-full">
          <Label className="text-sm text-gray-600">Or type your own</Label>
          <div className="mt-2 flex flex-col gap-2">
            <Input
              className="rounded-full"
              placeholder="e.g., Coffee bar, Desk setup, Plants"
              value={category}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCategory(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') onStart()
              }}
            />
            <Button size="lg" className="rounded-full w-full" onClick={onStart} disabled={category.trim().length === 0}>
              Continue
            </Button>
          </div>
        </div>

        <p className="mt-6 text-xs text-gray-600">No account required. Camera access only while capturing.</p>
      </div>

      <div className="px-5 pb-8">
        <div className="h-1 w-40 mx-auto rounded-full bg-black/10" />
      </div>

      {spinStage === 'spinning' ? (
        <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm text-center select-none">
            <div className="text-sm text-gray-600 mb-3">Picking a vibe…</div>
            <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white shadow-md p-6">
              <div className="h-16 flex items-center justify-center [perspective:900px] overflow-visible">
                <div className="text-2xl font-extrabold italic tracking-tight text-pink-500 drop-shadow transform-gpu will-change-transform" style={{
                  textShadow: '0 6px 14px rgba(244,114,182,0.35), 0 2px 0 rgba(255,255,255,0.8)',
                  ...spinStyle,
                }}>{spinText}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {spinStage === 'reveal' ? (
        <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm text-center select-none">
            <div className="relative overflow-hidden rounded-3xl shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-rose-50 to-amber-100" />
              <div className="relative p-10">
                <div className="text-xs uppercase tracking-widest text-pink-400">You got</div>
                <div className="mt-2 text-4xl font-black italic tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 drop-shadow-sm">
                  {spinText}
                </div>
                <div className="mt-4 text-gray-600 text-sm">Setting up your studio…</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}