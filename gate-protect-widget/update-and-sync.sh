#!/bin/bash
# Update widget script - builds and syncs to the main site

set -e

echo "🔨 Building widget..."
npm run build

echo "📦 Copying to main site..."
cp dist/paywall-widget.min.js ../paywall-project/public/paywall-widget.min.js

echo "✅ Widget updated and synced!"
echo ""
echo "Next steps:"
echo "1. Test the site locally"
echo "2. When ready to publish: npm publish --access public"
echo "3. See PUBLISHING.md for full instructions"
