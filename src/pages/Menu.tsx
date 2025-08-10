import {useMemo, useState, type ChangeEvent, type KeyboardEvent} from 'react'
import {Button, Input, Label} from '@shopify/shop-minis-react'
import {useNavigate} from 'react-router'

export function Menu() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('')

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

  const onStart = () => {
    const selected = category.trim()
    if (!selected) return
    navigate('/capture', {state: {category: selected}})
  }

  const onSurprise = () => {
    navigate('/capture', {state: {category: 'Surprise Me', surprise: true}})
  }

  return (
    <div className="min-h-dvh w-dvw flex flex-col bg-gradient-to-b from-pink-100 via-rose-50 to-amber-50">
      <div className="flex-1 px-5 pt-16 pb-8 flex flex-col items-center text-center">
        <div className="select-none">
          <h1
            className="text-[44px] leading-none font-extrabold italic tracking-tight text-pink-500 drop-shadow"
            style={{textShadow: '0 6px 14px rgba(244,114,182,0.35), 0 2px 0 rgba(255,255,255,0.6)'}}
          >
            Mini Shop
          </h1>
          <h2
            className="mt-1 text-[44px] leading-none font-extrabold italic tracking-tight text-pink-500 drop-shadow"
            style={{textShadow: '0 6px 14px rgba(244,114,182,0.35), 0 2px 0 rgba(255,255,255,0.6)'}}
          >
            Studio
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
          <div className="mt-2 flex items-center gap-2">
            <Input
              className="flex-1 rounded-full"
              placeholder="e.g., Coffee bar, Desk setup, Plants"
              value={category}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCategory(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') onStart()
              }}
            />
            <Button size="lg" className="rounded-full" onClick={onStart} disabled={category.trim().length === 0}>
              Continue
            </Button>
          </div>
        </div>

        <div className="mt-5 w-full flex flex-wrap gap-2 justify-center">
          {suggestions.map((s: string) => (
            <button
              key={s}
              className="px-3 py-1.5 rounded-full bg-white/70 text-sm text-gray-700 shadow-sm active:scale-95"
              onClick={() => setCategory(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <p className="mt-6 text-xs text-gray-600">No account required. Camera access only while capturing.</p>
      </div>

      <div className="px-5 pb-8">
        <div className="h-1 w-40 mx-auto rounded-full bg-black/10" />
      </div>
    </div>
  )
}