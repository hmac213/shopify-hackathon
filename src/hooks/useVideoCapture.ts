import {useCallback, useEffect, useMemo, useRef, useState} from 'react'

export type FrameMimeType = 'image/webp' | 'image/jpeg'

export interface UseVideoCaptureParams {
  fps?: number
  mimeType?: FrameMimeType
  quality?: number // 0..1 for image compression
  facingMode?: 'user' | 'environment'
  width?: number
  height?: number
  onFrame?: (frame: {blob: Blob; timestamp: number}) => void
}

export interface UseVideoCaptureResult {
  videoRef: React.RefObject<HTMLVideoElement>
  isPreviewing: boolean
  isCapturing: boolean
  error: Error | null
  openPreview: () => Promise<void>
  close: () => void
  startCapture: () => void
  stopCapture: () => void
  setFps: (fps: number) => void
  fps: number
}

export function useVideoCapture({
  fps: initialFps = 5,
  mimeType = 'image/webp',
  quality = 0.7,
  facingMode = 'environment',
  width = 1280,
  height = 720,
  onFrame,
}: UseVideoCaptureParams = {}): UseVideoCaptureResult {
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const captureIntervalRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [fps, setFps] = useState<number>(initialFps)

  const intervalMs = useMemo(() => Math.max(50, Math.floor(1000 / Math.max(1, fps))), [fps])

  const clearCaptureInterval = () => {
    if (captureIntervalRef.current != null) {
      window.clearInterval(captureIntervalRef.current)
      captureIntervalRef.current = null
    }
  }

  const stopTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
  }

  const stopCapture = useCallback(() => {
    clearCaptureInterval()
    setIsCapturing(false)
  }, [])

  const close = useCallback(() => {
    stopCapture()
    stopTracks()
    setIsPreviewing(false)
  }, [stopCapture])

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      close()
    }
  }, [close])

  const openPreview = useCallback(async () => {
    setError(null)
    try {
      if (mediaStreamRef.current) {
        setIsPreviewing(true)
        return
      }
      // Request camera at device frame rate (no frameRate cap) for smooth preview
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: {ideal: width},
          height: {ideal: height},
        },
        audio: false,
      })

      mediaStreamRef.current = stream

      // Attach to the video for preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        await videoRef.current.play().catch(() => {})
      }

      // Prepare canvas for frame extraction
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvasRef.current = canvas

      setIsPreviewing(true)
    } catch (e) {
      setError(e as Error)
      close()
    }
  }, [close, facingMode, height, width])

  const startCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !mediaStreamRef.current) return
    if (captureIntervalRef.current != null) return

    setIsCapturing(true)

    let isProcessing = false
    captureIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !mediaStreamRef.current) return
      if (isProcessing) return
      isProcessing = true
      try {
        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return
        ctx.drawImage(
          videoRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        )

        const blob: Blob | null = await new Promise(resolve =>
          canvasRef.current!.toBlob(resolve, mimeType, quality)
        )

        if (blob && onFrame) {
          onFrame({blob, timestamp: Date.now()})
        }
      } catch (e) {
        if (!error) setError(e as Error)
      } finally {
        isProcessing = false
      }
    }, intervalMs)
  }, [error, intervalMs, mimeType, onFrame, quality])

  return {
    videoRef,
    isPreviewing,
    isCapturing,
    error,
    openPreview,
    close,
    startCapture,
    stopCapture,
    setFps,
    fps,
  }
} 