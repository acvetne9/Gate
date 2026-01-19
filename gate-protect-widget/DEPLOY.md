Deploying the widget (gate-widget v1.3.1)

What this repo contains
- `dist/gate-widget.min.js` and `dist/gate-widget.esm.js` — built artifacts.
- `demo.html` — local demo page referencing `dist/gate-widget.min.js`.

Quick local smoke test
1. Serve the folder locally (from the repo root or `gate-protect-widget`):

```bash
cd gate-protect-widget
# Option A: Python static server
python3 -m http.server 5000
# Option B: Node (if you prefer)
npx serve -s . -l 5000
```

2. Open `http://localhost:5000/demo.html` in a browser and confirm the widget loads.

Create deployable zip (one-liner)

```bash
cd gate-protect-widget
zip -r ../gate-widget-1.3.1.zip dist demo.html DEPLOY.md
```

Upload / publish to staging CDN or host
- If you use an S3-like CDN (AWS S3 + CloudFront):

```bash
# Example (replace values):
aws s3 cp gate-widget-1.3.1.zip s3://my-staging-bucket/widgets/gate-widget-1.3.1.zip --acl public-read
# Or upload the individual file
aws s3 cp dist/gate-widget.min.js s3://my-staging-bucket/widgets/gate-widget.min.js --acl public-read --content-type 'application/javascript'
```

- If you use e.g. Netlify, Vercel, or other hosts, upload the `dist` file(s) via their UI or deploy script.

Update staging page
- Point your staging page to the new file URL (CDN path) or include the uploaded `gate-widget.min.js`.
- For SPA origins, ensure the postMessage/CORS integration is in place (see `PUBLISHING.md` and `README.md`).

Notes and troubleshooting
- You need credentials for your staging CDN (AWS, GCP, FTP, etc.). I cannot upload without those.
- If you'd like, I can prepare a CI deploy job (GitHub Actions) to automatically publish built `dist` files when a tag is pushed; provide repo permissions and target bucket/credentials and I'll scaffold it.
