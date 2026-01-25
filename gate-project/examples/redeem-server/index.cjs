const express = require('express')
const crypto = require('crypto')
const bodyParser = require('body-parser')

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return Buffer.from(str, 'base64').toString('utf8')
}

function verifyJwt(token, secret) {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const unsigned = `${parts[0]}.${parts[1]}`
  const expected = crypto.createHmac('sha256', secret).update(unsigned).digest('base64')
  const normalizedExpected = expected.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  if (normalizedExpected !== parts[2]) return null
  const payloadJson = base64urlDecode(parts[1])
  try {
    return JSON.parse(payloadJson)
  } catch (e) {
    return null
  }
}

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))

// POST /auth/redeem
// Expects form field 'login_token'. Validates signature and exp, then issues a session cookie.
app.post('/auth/redeem', async (req, res) => {
  const token = req.body.login_token || ''
  const secret = process.env.SIGNING_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const SUPABASE_URL = process.env.SUPABASE_URL || ''
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!token || !secret) {
    return res.status(400).send('missing token or server misconfigured')
  }

  const payload = verifyJwt(token, secret)
  if (!payload) return res.status(401).send('invalid token')

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) return res.status(401).send('token expired')

  // For compatibility, accept tokens that include a jti (login or access tokens)
  if (!payload.jti) return res.status(401).send('invalid token payload')

  // Persist jti to Supabase token_usages to enforce single-use
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.warn('SUPABASE_URL or SERVICE_ROLE missing; skipping jti persistence')
  } else {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/token_usages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE,
          'Authorization': `Bearer ${SERVICE_ROLE}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ jti: payload.jti, site_id: payload.site_id, used_at: new Date().toISOString() })
      })

      // 201 Created -> OK
      if (resp.status === 201) {
        // success
      } else if (resp.status === 409) {
        // Conflict: jti already exists (single-use enforced)
        const text = await resp.text()
        console.warn('jti conflict on persist', resp.status, text)
        return res.status(409).send('token already used')
      } else {
        const text = await resp.text()
        console.error('Failed to persist jti', resp.status, text)
        return res.status(500).send('db error')
      }
    } catch (e) {
      console.error('Error persisting jti', e)
      return res.status(500).send('internal error')
    }
  }

  // Create an origin session cookie (HttpOnly). In real app, create real session tied to user.
  res.cookie('session', crypto.randomBytes(24).toString('hex'), { httpOnly: true, secure: true, sameSite: 'Lax' })
  res.send('<html><body>Login successful. You can close this window.</body></html>')
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Redeem server listening on port ${port}`))
