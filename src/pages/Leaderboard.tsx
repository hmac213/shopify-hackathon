import {useMemo} from 'react'
import {Button, Separator} from '@shopify/shop-minis-react'
import {ArrowLeft, Crown, Sparkles} from 'lucide-react'
import {useNavigate} from 'react-router'
import {SPLAT_PLY_URL} from '../config/viewer'

interface LeaderboardEntry {
  name: string
  points: number
  category: string
  url: string
  productIds: string[]
}

export function Leaderboard() {
  const navigate = useNavigate()
  const entries = useMemo<LeaderboardEntry[]>(() => [
    { name: 'Alex',   points: 1280, category: 'Coffee bar',  url: SPLAT_PLY_URL, productIds: ['p_coffee_1','p_coffee_2','p_coffee_3','p_coffee_4'] },
    { name: 'Sam',    points: 1110, category: 'Desk setup',  url: SPLAT_PLY_URL, productIds: ['p_desk_1','p_desk_2','p_desk_3','p_desk_4'] },
    { name: 'Riley',  points: 990,  category: 'Plants',      url: SPLAT_PLY_URL, productIds: ['p_plant_1','p_plant_2','p_plant_3','p_plant_4'] },
    { name: 'Jordan', points: 870,  category: 'Home gym',    url: SPLAT_PLY_URL, productIds: ['p_gym_1','p_gym_2','p_gym_3','p_gym_4'] },
    { name: 'Taylor', points: 840,  category: 'Yoga zone',   url: SPLAT_PLY_URL, productIds: ['p_yoga_1','p_yoga_2','p_yoga_3','p_yoga_4'] },
    { name: 'Casey',  points: 810,  category: 'Reading nook',url: SPLAT_PLY_URL, productIds: ['p_read_1','p_read_2','p_read_3','p_read_4'] },
    { name: 'Jamie',  points: 790,  category: 'Maker bench', url: SPLAT_PLY_URL, productIds: ['p_maker_1','p_maker_2','p_maker_3','p_maker_4'] },
    { name: 'Morgan', points: 775,  category: 'Audio lounge',url: SPLAT_PLY_URL, productIds: ['p_audio_1','p_audio_2','p_audio_3','p_audio_4'] },
    { name: 'Hayden', points: 760,  category: 'Tea corner',  url: SPLAT_PLY_URL, productIds: ['p_tea_1','p_tea_2','p_tea_3','p_tea_4'] },
    { name: 'Parker', points: 740,  category: 'Gamer cave',  url: SPLAT_PLY_URL, productIds: ['p_game_1','p_game_2','p_game_3','p_game_4'] },
  ], [])

  const onView = (entry: LeaderboardEntry) => {
    const params = new URLSearchParams({ url: entry.url, category: entry.category, surprise: 'false', productIds: entry.productIds.join(',') })
    navigate(`/viewer?${params.toString()}`)
  }

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="min-h-dvh w-dvw flex flex-col bg-gradient-to-b from-pink-100 via-rose-50 to-amber-50">
      <div className="p-4 flex items-center gap-3">
        <Button variant="icon" size="lg" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft />
        </Button>
        <div className="flex items-center gap-2">
          <Sparkles className="text-pink-500" />
          <h1 className="text-lg font-semibold">Leaderboard</h1>
        </div>
      </div>

      {/* Podium: #2, #1, #3 */}
      <div className="px-4 mt-1">
        <div className="flex items-end gap-3">
          {/* #2 - Silver */}
          {top3[1] ? (
            <div className="flex-1">
              <div className="relative rounded-2xl h-36 shadow-[0_10px_24px_rgba(156,163,175,0.35)]">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-200 via-gray-100 to-white" />
                <div className="relative z-10 h-full rounded-2xl flex flex-col items-center justify-center text-center px-4">
                  <div className="text-sm font-medium">{top3[1].name}</div>
                  <div className="text-xs text-gray-600">{top3[1].category}</div>
                  <div className="mt-1 text-base font-semibold">{top3[1].points} pts</div>
                </div>
              </div>
            </div>
          ) : null}

          {/* #1 - Gold with crown */}
          {top3[0] ? (
            <div className="flex-[1.2] relative">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20">
                <Crown className="text-pink-500" size={40} />
              </div>
              <div className="relative rounded-2xl h-44 shadow-[0_12px_28px_rgba(251,191,36,0.45)]">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-100" />
                <div className="relative z-10 h-full rounded-2xl flex flex-col items-center justify-center text-center px-4">
                  <div className="text-sm font-semibold">{top3[0].name}</div>
                  <div className="text-xs text-gray-700">{top3[0].category}</div>
                  <div className="mt-1 text-base font-extrabold">{top3[0].points} pts</div>
                </div>
              </div>
            </div>
          ) : null}

          {/* #3 - Bronze */}
          {top3[2] ? (
            <div className="flex-1">
              <div className="relative rounded-2xl h-32 shadow-[0_10px_24px_rgba(217,119,6,0.35)]">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-300/70 via-orange-200 to-amber-100" />
                <div className="relative z-10 h-full rounded-2xl flex flex-col items-center justify-center text-center px-4">
                  <div className="text-sm font-medium">{top3[2].name}</div>
                  <div className="text-xs text-gray-700">{top3[2].category}</div>
                  <div className="mt-1 text-base font-semibold">{top3[2].points} pts</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Positions 4–10 */}
      <div className="px-4 mt-5">
        <div className="rounded-2xl bg-white/90 backdrop-blur-md shadow-sm border border-black/5 overflow-hidden">
          <div className="p-3 text-xs text-gray-500">This week</div>
          <Separator />
          {rest.map((e, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border-t border-black/5">
              <div className="w-7 text-center text-xs text-gray-500">#{i + 4}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{e.name}</div>
              </div>
              <div className="text-xs text-gray-700 mr-2 whitespace-nowrap">{e.points} pts</div>
              <div className="flex-none">
                <Button size="sm" variant="secondary" className="rounded-full px-5" onClick={() => onView(e)}>View</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-auto py-6">
        <div className="h-1 w-40 mx-auto rounded-full bg-black/10" />
      </div>
    </div>
  )
} 