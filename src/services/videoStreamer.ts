export type StreamInitPayload = {
  sessionId: string
  category?: string
  surprise?: boolean
  productIds?: string[]
}

export type StreamerOptions = {
  maxQueueSize?: number
  batchSize?: number
  batchIntervalMs?: number
}

export type FramePayload = {
  blob: Blob
  timestamp: number
}

export class VideoStreamer {
  private url: string
  private ws: WebSocket | null = null
  private initPayload: StreamInitPayload
  private queue: FramePayload[] = []
  private sending = false
  private batchTimer: number | null = null
  private options: Required<StreamerOptions>

  constructor(url: string, initPayload: StreamInitPayload, options?: StreamerOptions) {
    this.url = url
    this.initPayload = initPayload
    this.options = {
      maxQueueSize: options?.maxQueueSize ?? 50,
      batchSize: options?.batchSize ?? 1,
      batchIntervalMs: options?.batchIntervalMs ?? 0,
    }
  }

  async open(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return

    this.ws = new WebSocket(this.url)

    await new Promise<void>((resolve, reject) => {
      if (!this.ws) return reject(new Error('WebSocket not created'))
      const onOpen = () => {
        this.ws?.removeEventListener('open', onOpen)
        this.ws?.removeEventListener('error', onError)
        // Send init metadata
        this.sendJson({type: 'init', ...this.initPayload})
        resolve()
      }
      const onError = (ev: Event) => {
        this.ws?.removeEventListener('open', onOpen)
        this.ws?.removeEventListener('error', onError)
        reject(new Error('WebSocket connection error'))
      }
      this.ws.addEventListener('open', onOpen)
      this.ws.addEventListener('error', onError)
    })
  }

  enqueueFrame(frame: FramePayload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    // Backpressure: drop oldest if over capacity
    if (this.queue.length >= this.options.maxQueueSize) {
      this.queue.shift()
    }
    this.queue.push(frame)

    if (this.options.batchSize > 1 && this.options.batchIntervalMs > 0) {
      this.scheduleBatchSend()
    } else {
      void this.flush()
    }
  }

  private scheduleBatchSend() {
    if (this.batchTimer != null) return
    this.batchTimer = window.setTimeout(() => {
      this.batchTimer = null
      void this.flush()
    }, this.options.batchIntervalMs)
  }

  private async flush() {
    if (this.sending) return
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    if (this.queue.length === 0) return

    this.sending = true
    try {
      const batch = this.queue.splice(0, this.options.batchSize)

      // Protocol: send a JSON header followed by each frame as a binary message
      // For simplicity we send header per frame; server should correlate by sequential order.
      for (const {blob, timestamp} of batch) {
        this.sendJson({type: 'frame', ts: timestamp, size: blob.size, mime: (blob as any).type})
        this.ws.send(blob)
      }
    } catch (e) {
      // swallow send errors; caller can reopen
    } finally {
      this.sending = false
      // Continue if more items remain
      if (this.queue.length > 0) {
        if (this.options.batchSize > 1 && this.options.batchIntervalMs > 0) {
          this.scheduleBatchSend()
        } else {
          void this.flush()
        }
      }
    }
  }

  private sendJson(obj: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify(obj))
  }

  close(code?: number, reason?: string) {
    if (this.batchTimer != null) {
      window.clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
    this.queue = []
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.ws.close(code, reason)
    }
    this.ws = null
  }
} 