import {useEffect} from 'react'
import {useLocation, useNavigate} from 'react-router'

export function Loading() {
  const navigate = useNavigate()
  const location = useLocation() as {state?: any}

  useEffect(() => {
    const t = setTimeout(() => {
      navigate('/viewer', {state: location.state})
    }, 2000)
    return () => clearTimeout(t)
  }, [location.state, navigate])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
      <div className="size-16 rounded-full border-4 border-white/20 border-t-white animate-spin mb-4" />
      <h2 className="text-lg font-semibold">Processing your environment…</h2>
      <p className="text-muted-foreground text-sm mt-1">This should only take a moment.</p>
    </div>
  )
} 