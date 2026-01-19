# Publishing Gate Widget to npm

## Prerequisites

1. **npm account**: Create one at https://www.npmjs.com/signup if you don't have one
2. **npm organization**: Create the `@gate-protect` organization at https://www.npmjs.com/org/create
   - Or change the package name in `package.json` to something without `@` (e.g., `gate-widget`)

## Publishing Steps

### 1. Login to npm (one-time)

```bash
npm login
```

Enter your npm credentials when prompted.

### 2. Build the widget

```bash
npm run build
```

This creates:
- `dist/gate-widget.min.js` (IIFE format for browsers)
- `dist/gate-widget.esm.js` (ESM format for bundlers)

### 3. Test the package locally (optional)

```bash
npm pack
```

This creates a `.tgz` file showing exactly what will be published.

### 4. Publish to npm

For first-time publish (if using scoped package `@gate-protect/widget`):

```bash
npm publish --access public
```

For updates:

```bash
npm publish
```

### 5. Verify publication

Visit: https://www.npmjs.com/package/@gate-protect/widget

## Versioning

Update version in `package.json` before publishing:

```bash
npm version patch   # 1.2.0 -> 1.2.1 (bug fixes)
npm version minor   # 1.2.0 -> 1.3.0 (new features)
npm version major   # 1.2.0 -> 2.0.0 (breaking changes)
```

Then publish:

```bash
npm publish --access public
```

## What Gets Published

Only these files/folders are included (see `package.json` "files" field):
- `dist/` - Built widget files
- `types/` - TypeScript definitions
- `README.md` - Documentation

Source code (`src/`) is excluded via `.npmignore`.

## After Publishing

### Update your site to use the npm package

In `/gate-project/public/`, replace the local widget with the CDN version:

**Option 1: Using jsDelivr CDN**
```html
<script src="https://cdn.jsdelivr.net/npm/@gate-protect/widget@1/dist/gate-widget.min.js"></script>
```

**Option 2: Using unpkg CDN**
```html
<script src="https://unpkg.com/@gate-protect/widget@1/dist/gate-widget.min.js"></script>
```

**Option 3: Install as dependency**
```bash
cd ../gate-project
npm install @gate-protect/widget
```

Then reference it in your build process.

## Current Setup

Your GateProtect site currently loads the widget from:
- `/public/gate-widget.min.js`

This is the **exact same file** that gets published to npm from `dist/gate-widget.min.js`.

Whenever you update the widget:
1. Build it: `npm run build`
2. Copy to site: `cp dist/gate-widget.min.js ../gate-project/public/`
3. Publish to npm: `npm publish --access public`

## Troubleshooting

**Error: "You do not have permission to publish"**
- Create the `@gate-protect` organization on npm first
- Or remove the `@gate-protect/` prefix and use `gate-widget` instead

**Error: "Package name too similar to existing package"**
- Choose a different package name in `package.json`

**Need to unpublish?**
```bash
npm unpublish @gate-protect/widget@1.2.0  # Specific version
```

Note: You can only unpublish within 72 hours of publishing.
