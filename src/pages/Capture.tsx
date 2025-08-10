import {useLocation, useNavigate} from 'react-router'
import {useCategoryProducts} from '../hooks/useCategoryProducts'
import {useVideoCapture} from '../hooks/useVideoCapture'
import {Button} from '@shopify/shop-minis-react'
import {useEffect, useMemo, useRef} from 'react'
import {onCapture, cancelCurrent} from '../capture'

export function Capture() {
  const location = useLocation() as {state?: {category?: string; surprise?: boolean}}
  const navigate = useNavigate()
  const category = location?.state?.category
  const surprise = !!location?.state?.surprise

  const {products} = useCategoryProducts({category, surprise, first: 24})

  // Collect the first two captured frames as Files to submit
  const capturedFilesRef = useRef<File[]>([])

  const {videoRef, isPreviewing, isCapturing, error, openPreview, close, startCapture, stopCapture, fps, setFps} = useVideoCapture({
    fps: 5,
    mimeType: 'image/webp',
    quality: 0.7,
    facingMode: 'environment',
    width: 720,
    height: 720,
    onFrame: frame => {
      if (capturedFilesRef.current.length >= 2) return
      const ext = 'webp'
      const file = new File([frame.blob], `capture-${capturedFilesRef.current.length + 1}.${ext}` , { type: (frame.blob as any).type || 'image/webp' })
      capturedFilesRef.current.push(file)
    },
  })

  useEffect(() => {
    void openPreview()
    return () => {
      close()
      // cancel any in-flight submission when navigating away
      cancelCurrent()
    }
  }, [openPreview, close])

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
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />

      <div className="absolute inset-x-0 bottom-0 pb-10 pt-6 flex flex-col items-center gap-3 bg-gradient-to-t from-black/50 to-transparent">
        <button
          aria-label={isCapturing ? 'Stop recording' : 'Start recording'}
          onClick={onToggleCapture}
          className={`relative h-16 w-16 rounded-full ${
            isCapturing ? 'bg-red-500' : 'bg-white'
          } shadow-lg outline-none border-2 ${isCapturing ? 'border-red-200' : 'border-gray-200'}`}
        >
          <span className="absolute inset-0 rounded-full border-4 border-white/60" />
        </button>
        <p className="text-white text-sm opacity-90">
          Record a 360 degree shot of your environment slowly.
        </p>
      </div>

      {!isPreviewing && error && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="text-red-400 text-center text-sm">{error.message}</p>
        </div>
      )}
    </div>
  )
} 