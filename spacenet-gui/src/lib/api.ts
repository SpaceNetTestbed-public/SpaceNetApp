export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<unknown> {
  if (!API_URL) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not configured. ' +
      'Add NEXT_PUBLIC_API_URL=http://localhost:8000 to your .env.local file.'
    );
  }

  // Do NOT set Content-Type when the body is FormData — the browser must set
  // it automatically so it can include the multipart boundary.
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
    ...(!isFormData && { 'Content-Type': 'application/json' }),
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    const trimmed = text.trimStart();
    if (trimmed.startsWith('<!') || trimmed.toLowerCase().startsWith('<html')) {
      throw new Error('Server error — please try again.');
    }
    throw new Error(text || 'Request failed');
  }

  return res.json();
}