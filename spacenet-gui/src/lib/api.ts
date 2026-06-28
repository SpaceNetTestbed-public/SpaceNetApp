export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<unknown> {
  // 1. Check if the body is FormData
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  // 2. Safely type cast the incoming headers
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // 3. Only apply application/json if it's NOT a FormData payload
  // and if a Content-Type wasn't already passed in manually
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Request failed');
  }

  return res.json();
}