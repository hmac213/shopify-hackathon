// src/lib/api.ts
const API_BASE = (import.meta as any).env.VITE_API_BASE as string;

function withHdr(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: { ...(init.headers || {}), 'ngrok-skip-browser-warning': '1' },
    mode: 'cors',
  };
}

export async function submitCapture(
  files: File[],
  signal?: AbortSignal
): Promise<{ jobId: string; timestamp: string }> {
  if (!files?.length) throw new Error('Select at least one image');
  const timestamp = `ts${Math.floor(Date.now() / 1000)}`;

  const form = new FormData();
  form.append('timestamp', timestamp);
  for (const f of files.slice(0, 2)) form.append('images', f, f.name);

  const res = await fetch(`${API_BASE}/submit`, withHdr({ method: 'POST', body: form, signal }));
  if (!res.ok) throw new Error(`Submit failed: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as { job_id: string; status: string; num_images: number };
  return { jobId: data.job_id, timestamp };
}

export async function pollStatus(jobId: string, signal?: AbortSignal): Promise<void> {
  while (true) {
    const res = await fetch(`${API_BASE}/status/${jobId}`, withHdr({ signal }));
    if (!res.ok) throw new Error(`Status failed: ${res.status}`);
    const { status, error } = (await res.json()) as { status: string; error?: string };
    if (status === 'done') return;
    if (status === 'error') throw new Error(error || 'Job error');
    await new Promise((r) => setTimeout(r, 2000));
  }
}

export async function downloadResult(timestamp: string): Promise<void> {
  const res = await fetch(`${API_BASE}/result/${timestamp}`, withHdr());
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') || '';
  const nameMatch = cd.match(/filename=\"?([^\";]+)\"?/i);
  const filename = nameMatch?.[1] || `0_0_0.splat`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}


