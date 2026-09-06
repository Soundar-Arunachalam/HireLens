export const API = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const tok = localStorage.getItem('ce_token');
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string,string> ?? {}) };
  if (tok) headers['Authorization'] = `Bearer ${tok}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) {
    let detail = 'Request failed';
    try { const err = await res.json(); detail = err.detail || detail; } catch (e) {}
    throw new Error(detail);
  }
  return res.status === 204 ? (null as any) : res.json();
}
