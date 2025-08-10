import {useEffect, useState} from 'react'
import {useLocation, useNavigate} from 'react-router'

export function Loading() {
  const navigate = useNavigate()
  const location = useLocation() as {state?: any}
  const [showLeft, setShowLeft] = useState(true)
  const [showRight, setShowRight] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [gifLoaded, setGifLoaded] = useState(false)
  const [gifError, setGifError] = useState(false)

  useEffect(() => {
    // Start with left image visible
    setShowLeft(true)
    setShowRight(false)

    // Create pattern: Left -> Both -> Right -> None
    let cycle = 0
    
    const animationInterval = setInterval(() => {
      cycle++
      
      if (cycle === 1) {
        // After 2 seconds: show both (overlap)
        setShowRight(true)
        setShowLeft(true)
      } else if (cycle === 2) {
        // After 1 more second: hide left, keep right
        setShowLeft(false)
        setShowRight(true)
      } else if (cycle === 3) {
        // After 1 more second: hide both (none)
        setShowLeft(false)
        setShowRight(false)
      } else if (cycle === 4) {
        // After 1 more second: show left only
        setShowLeft(true)
        setShowRight(false)
        cycle = 0 // Reset cycle
      }
    }, 1000) // Check every 1 second

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) return 100
        return prev + 1
      })
    }, 100) // Update every 100ms to reach 100% in 10 seconds

    // Navigate after 10 seconds
    const navigateTimer = setTimeout(() => {
      clearInterval(animationInterval)
      clearInterval(progressInterval)
      navigate('/viewer', {state: location.state})
    }, 10000)

    return () => {
      clearInterval(animationInterval)
      clearInterval(progressInterval)
      clearTimeout(navigateTimer)
    }
  }, [location.state, navigate])

  const handleGifLoad = () => {
    console.log('GIF loaded successfully')
    setGifLoaded(true)
    setGifError(false)
  }

  const handleGifError = () => {
    console.error('GIF failed to load')
    setGifError(true)
    setGifLoaded(false)
  }

  return (
    <div className="min-h-dvh w-dvw flex flex-col bg-gradient-to-b from-pink-100 via-rose-50 to-amber-50">
      <div className="flex-1 px-5 pt-16 pb-8 flex flex-col items-center justify-center text-center">
        <div className="select-none mb-8">
          <h1
            className="text-[44px] leading-none font-extrabold italic tracking-tight text-pink-500 drop-shadow"
            style={{textShadow: '0 6px 14px rgba(244,114,182,0.35), 0 2px 0 rgba(255,255,255,0.6)'}}
          >
            Processing
          </h1>
          <h2
            className="mt-1 text-[44px] leading-none font-extrabold italic tracking-tight text-pink-500 drop-shadow"
            style={{textShadow: '0 6px 14px rgba(244,114,182,0.35), 0 2px 0 rgba(255,255,255,0.6)'}}
          >
            Your Space
          </h2>
        </div>

        {/* Beautiful box around both images */}
        <div className="relative overflow-hidden rounded-3xl shadow-xl mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-rose-50 to-amber-100" />
          <div className="relative p-8">
            <div className="flex items-center justify-center space-x-8">
              {/* 2D Image on the left with quick fade animation */}
              <div className={`flex-shrink-0 transition-opacity duration-300 ease-in-out ${showLeft ? 'opacity-100' : 'opacity-0'}`}>
                <div className="relative overflow-hidden rounded-2xl border border-pink-200/50 bg-white/80 backdrop-blur-sm shadow-lg p-4">
                  <img 
                    src="https://raw.githubusercontent.com/bobbykabob/shopify-hackathon-cdn/main/chair2d.png"
                    alt="Chair 2D"
                    className="w-32 h-32 object-contain"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500/10 to-transparent pointer-events-none" />
                </div>
              </div>
              
              {/* GIF on the right with fade animation */}
              <div className={`flex-shrink-0 transition-opacity duration-300 ease-in-out ${showRight ? 'opacity-100' : 'opacity-0'}`}>
                <div className="relative overflow-hidden rounded-2xl border border-rose-200/50 bg-white/80 backdrop-blur-sm shadow-lg p-4">
                  <img 
                    src="https://raw.githubusercontent.com/bobbykabob/shopify-hackathon-cdn/main/chair-video-unscreen.gif"
                    alt="Chair Animation"
                    className="w-32 h-32 object-contain"
                    onLoad={handleGifLoad}
                    onError={handleGifError}
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-rose-500/10 to-transparent pointer-events-none" />
                  {gifError && (
                    <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xs bg-white/90 rounded-2xl">
                      GIF Error
                    </div>
                  )}
                  {!gifLoaded && !gifError && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs bg-white/90 rounded-2xl">
                      Loading...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading bar with themed styling */}
        <div className="w-64 mb-6">
          <div className="w-full bg-white/50 backdrop-blur-sm rounded-full h-3 border border-pink-200/50 shadow-inner">
            <div 
              className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 h-3 rounded-full transition-all duration-100 ease-linear shadow-sm"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="text-sm text-gray-600 mt-3 font-medium">{loadingProgress}%</div>
        </div>
        
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Processing your environment…</h2>
        <p className="text-gray-600 text-sm">This should only take a moment.</p>
      </div>

      <div className="px-5 pb-8">
        <div className="h-1 w-40 mx-auto rounded-full bg-black/10" />
      </div>
      
      {/* Debug info - hidden in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 text-xs text-gray-400 bg-white/50 backdrop-blur-sm rounded-lg p-2">
          GIF Status: {gifLoaded ? 'Loaded' : gifError ? 'Error' : 'Loading'} | 
          Right Visible: {showRight ? 'Yes' : 'No'} | 
          Left Visible: {showLeft ? 'Yes' : 'No'} | 
          State: {showLeft && showRight ? 'Both' : showLeft ? 'Left' : showRight ? 'Right' : 'None'}
        </div>
      )}
    </div>
  )
} 