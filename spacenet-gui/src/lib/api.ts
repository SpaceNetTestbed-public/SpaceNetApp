export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<unknown> {
  const headers = {
    ...(options.headers || {}),
    'Content-Type': 'application/json',
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
