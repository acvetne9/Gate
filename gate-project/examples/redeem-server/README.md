Simple Redeem Server

This example shows a minimal Node/Express endpoint that accepts `POST /auth/redeem` with a `login_token` form field, verifies the HMAC-signed JWT, and sets an HttpOnly session cookie on the origin.

Usage (development):

1. Install deps:

```bash
cd examples/redeem-server
npm init -y
npm install express body-parser cookie-parser
```

2. Run with env var SIGNING_KEY set to the Gate service signing key:

```bash
SIGNING_KEY=your_signing_key node index.js
```

3. The widget will POST the `login_token` to `https://your-origin.example.com/auth/redeem` in a hidden iframe — this endpoint validates the token and sets a real origin session cookie.

Notes:
- This is an example only. In production, validate the JWT `type` claim, check `jti` against a token-usage table, and create a real user/session tied to your auth store.
- Use HTTPS in production and set cookie attributes appropriately.
