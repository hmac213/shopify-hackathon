import {useLocation, useNavigate} from 'react-router'
import {useCategoryProducts} from '../hooks/useCategoryProducts'
// import {useVideoCapture} from '../hooks/useVideoCapture'
import {Button} from '@shopify/shop-minis-react'
import {useEffect, useMemo, useRef, useState} from 'react'
import {onCapture, cancelCurrent} from '../capture'

export function Capture() {
  const location = useLocation() as {state?: {category?: string; surprise?: boolean}}
  const navigate = useNavigate()
  const category = location?.state?.category
  const surprise = !!location?.state?.surprise

  const {products} = useCategoryProducts({category, surprise, first: 24})

  // Collect the first two captured frames as Files to submit
  const capturedFilesRef = useRef<File[]>([])

  // TEMP: Override camera with external video, simulate capture state locally
  const [isCapturing, setIsCapturing] = useState(false)
  const startCapture = () => setIsCapturing(true)
  const stopCapture = () => setIsCapturing(false)

  // const {videoRef, isPreviewing, isCapturing, error, openPreview, close, startCapture, stopCapture, fps, setFps} = useVideoCapture({
  //   fps: 5,
  //   mimeType: 'image/webp',
  //   quality: 0.7,
  //   facingMode: 'environment',
  //   width: 720,
  //   height: 720,
  //   onFrame: frame => {
  //     if (capturedFilesRef.current.length >= 2) return
  //     const ext = 'webp'
  //     const file = new File([frame.blob], `capture-${capturedFilesRef.current.length + 1}.${ext}` , { type: (frame.blob as any).type || 'image/webp' })
  //     capturedFilesRef.current.push(file)
  //   },
  // })

  // useEffect(() => {
  //   void openPreview()
  //   return () => {
  //     close()
  //     // cancel any in-flight submission when navigating away
  //     cancelCurrent()
  //   }
  // }, [openPreview, close])

  useEffect(() => {
    return () => {
      // cancel any in-flight submission when navigating away
      cancelCurrent()
    }
  }, [])

  const onToggleCapture = async () => {
    if (!isCapturing) {
      // reset previous capture buffer
      capturedFilesRef.current = []
      startCapture()
    } else {
      stopCapture()
      // Fire-and-forget submission of up to first two frames; UI remains responsive
      const filesToSubmit = capturedFilesRef.current.slice(0, 2)
      if (filesToSubmit.length > 0) {
        void onCapture(filesToSubmit)
      }
      navigate('/loading', {state: {category, surprise, productIds: products.map(p => p.id)}})
    }
  }

  return (
    <div className="min-h-dvh w-dvw relative bg-black">
      {/* TEMP: External video placeholder instead of camera preview */}
      <video
        className="absolute inset-0 h-full w-full object-contain bg-black"
        src="https://raw.githubusercontent.com/bobbykabob/shopify-hackathon-cdn/main/IMG_5051.mp4"
        playsInline
        muted
        autoPlay
        loop
      />

      <div className="absolute inset-x-0 bottom-0 pb-10 pt-6 flex flex-col items-center gap-3 bg-gradient-to-t from-black/50 to-transparent">
        <button
          aria-label={isCapturing ? 'Stop recording' : 'Start recording'}
          aria-pressed={isCapturing}
          onClick={onToggleCapture}
          className={`relative h-20 w-20 rounded-full bg-transparent border-4 outline-none transition-colors duration-200 ${
            isCapturing
              ? 'border-pink-500 shadow-[0_0_24px_rgba(244,114,182,0.55)]'
              : 'border-white/90 shadow-[0_0_20px_rgba(255,255,255,0.35)]'
          }`}
        />
        <p className="text-white text-sm opacity-90">
          Record a 360 degree shot of your environment slowly.
        </p>
      </div>

      {/* {!isPreviewing && error && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="text-red-400 text-center text-sm">{error.message}</p>
        </div>
      )} */}
    </div>
  )
} 