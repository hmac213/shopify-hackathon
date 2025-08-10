// src/capture.ts
import { submitCapture, pollStatus, downloadResult } from './lib/api'

let currentAbort: AbortController | null = null

// Wire this to your existing UI (file input or capture button)
export async function onCapture(files: File[]) {
  if (!files?.length) throw new Error('Select at least one image')

  // Cancel any in-flight job/polling
  currentAbort?.abort()
  currentAbort = new AbortController()

  const { jobId, timestamp } = await submitCapture(files, currentAbort.signal)

  // Non-blocking: poll status; on completion, download result
  pollStatus(jobId, currentAbort.signal)
    .then(() => downloadResult(timestamp))
    .catch((err) => {
      if ((err as any)?.name === 'AbortError') return
      console.error(err)
      alert((err as any)?.message || 'An error occurred')
    })
}

// Optional: download an existing result by timestamp without resubmitting
export async function fetchExisting(timestamp: string) {
  await downloadResult(timestamp)
}

// Optional: expose cancellation if user re-submits or navigates away
export function cancelCurrent() {
  currentAbort?.abort()
}


