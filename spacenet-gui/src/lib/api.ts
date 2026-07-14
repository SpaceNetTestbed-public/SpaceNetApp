export const API_URL = process.env.NEXT_PUBLIC_API_URL;

const DEFAULT_TIMEOUT_MS = 30000;

export class ApiError extends Error {
  status: number;
  body?: string;
  isTimeout: boolean;

  constructor(message: string, options: { status: number; body?: string; isTimeout?: boolean }) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.body = options.body;
    this.isTimeout = options.isTimeout ?? false;
  }
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<unknown> {
  if (!API_URL) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not configured. ' +
      'Add NEXT_PUBLIC_API_URL=http://localhost:8000 to your .env.local file.'
    );
  }

  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = options;

  // Do NOT set Content-Type when the body is FormData — the browser must set
  // it automatically so it can include the multipart boundary.
  const isFormData = rest.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string> | undefined),
    ...(!isFormData && { 'Content-Type': 'application/json' }),
  };

  // A caller-supplied signal wins; otherwise apply the timeout ourselves.
  const controller = signal ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      ...rest,
      headers,
      signal: signal ?? controller?.signal,
    });
  } catch (err) {
    if (controller?.signal.aborted) {
      throw new ApiError('Request timed out — please try again.', { status: 0, isTimeout: true });
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text();
    const trimmed = text.trimStart();
    if (trimmed.startsWith('<!') || trimmed.toLowerCase().startsWith('<html')) {
      throw new ApiError('Server error — please try again.', { status: res.status, body: text });
    }
    throw new ApiError(text || 'Request failed', { status: res.status, body: text });
  }

  return res.json();
}
