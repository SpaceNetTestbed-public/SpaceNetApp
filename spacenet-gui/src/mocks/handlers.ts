import { http, HttpResponse } from 'msw'

export const handlers = [
  // Existing example handlers (kept for reference / health checks)
  http.get('/api/health', () => HttpResponse.json({ ok: true })),
  http.get('/api/profiles', () => HttpResponse.json({ items: [] })),
]
