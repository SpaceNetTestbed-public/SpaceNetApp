import { apiFetch } from '@/lib/api'

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
const originalFetch = global.fetch

beforeAll(() => {
  global.fetch = mockFetch
})

afterAll(() => {
  global.fetch = originalFetch
})

afterEach(() => {
  mockFetch.mockReset()
})

describe('apiFetch', () => {
  it('sets Content-Type: application/json on every request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({}),
    } as unknown as Response)

    await apiFetch('/test')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })

  it('forwards Authorization Bearer token when passed in options.headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({}),
    } as unknown as Response)

    await apiFetch('/secure', { headers: { Authorization: 'Bearer my-token' } })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('throws with the response text on a non-OK status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: jest.fn().mockResolvedValueOnce('Unauthorized'),
    } as unknown as Response)

    await expect(apiFetch('/fail')).rejects.toThrow('Unauthorized')
  })

  it('throws "Request failed" when the non-OK body is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: jest.fn().mockResolvedValueOnce(''),
    } as unknown as Response)

    await expect(apiFetch('/fail')).rejects.toThrow('Request failed')
  })

  it('returns parsed JSON on a successful response', async () => {
    const payload = { id: 1, name: 'test' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(payload),
    } as unknown as Response)

    const result = await apiFetch('/data')
    expect(result).toEqual(payload)
  })

  it('merges extra RequestInit options (method, body) into the fetch call', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({}),
    } as unknown as Response)

    await apiFetch('/create', { method: 'POST', body: JSON.stringify({ x: 1 }) })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ x: 1 }) }),
    )
  })
})
