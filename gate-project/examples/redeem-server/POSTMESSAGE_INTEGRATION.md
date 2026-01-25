PostMessage / CustomEvent Integration (origin page)

This snippet shows how to integrate your origin (SPA) to listen for Gate login tokens and redeem them by calling `/auth/redeem` with credentials included so the server can set an HttpOnly session cookie.

Place this in your origin app (e.g., in your main.js or a small script tag):

```javascript
// Listen for CustomEvent from the widget
window.addEventListener('gate:login', async (e) => {
  const token = e.detail && e.detail.loginToken
  if (!token) return
  try {
    await fetch('/auth/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ login_token: token }),
      credentials: 'include'
    })
    // Optionally reload to pick up session
    window.location.reload()
  } catch (err) {
    console.error('Gate redeem failed', err)
  }
})

// Also listen for postMessage (if widget uses postMessage)
window.addEventListener('message', async (ev) => {
  // ensure origin is trusted
  if (ev.origin !== window.location.origin) return
  const data = ev.data || {}
  if (!data.gateLoginToken) return
  const token = data.gateLoginToken
  try {
    await fetch('/auth/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ login_token: token }),
      credentials: 'include'
    })
    window.location.reload()
  } catch (err) {
    console.error('Gate redeem failed', err)
  }
})
```

Notes:
- `credentials: 'include'` is required so the browser will accept and store the `Set-Cookie` header from `/auth/redeem`.
- Keep your origin's `POST /auth/redeem` server endpoint the same as the example redeem server (it validates token, persists `jti`, sets cookie).
- This flow avoids iframes and is SPA-friendly.
