'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          background: '#0f1115',
          color: '#e5e7eb',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            padding: 32,
            borderRadius: 12,
            background: '#1a1d24',
            border: '1px solid #2a2f3a',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
            Application error
          </h1>
          <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 24 }}>
            The app crashed while starting up. Try reloading the page. If the problem
            continues, check that the backend is running and reachable.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 12,
                opacity: 0.5,
                marginBottom: 24,
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: '#7a1f2b',
              color: 'white',
              border: 'none',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
