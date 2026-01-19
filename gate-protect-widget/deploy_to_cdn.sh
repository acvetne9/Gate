#!/usr/bin/env bash
# Usage: ./deploy_to_cdn.sh <target> <path_or_bucket>
# Examples:
#  ./deploy_to_cdn.sh s3 my-bucket/widgets
#  ./deploy_to_cdn.sh ftp ftp://user:pass@example.com/path

set -euo pipefail
TARGET=${1:-}
DEST=${2:-}
if [[ -z "$TARGET" || -z "$DEST" ]]; then
  echo "Usage: $0 <target> <path_or_bucket>"
  echo "Targets: s3, ftp, local-copy"
  exit 2
fi

ZIP=../paywall-widget-1.3.1.zip
cd "$(dirname "$0")"

# Create zip
zip -r "$ZIP" dist demo.html DEPLOY.md || true

case "$TARGET" in
  s3)
    if ! command -v aws >/dev/null 2>&1; then
      echo "aws CLI not found; install and configure AWS credentials first"
      exit 3
    fi
    echo "Uploading dist/paywall-widget.min.js to s3://$DEST/paywall-widget.min.js"
    aws s3 cp dist/paywall-widget.min.js s3://$DEST/paywall-widget.min.js --acl public-read --content-type 'application/javascript'
    ;;
  ftp)
    if ! command -v curl >/dev/null 2>&1; then
      echo "curl required for FTP upload"
      exit 4
    fi
    echo "Uploading via curl to $DEST (DEST should include credentials)"
    curl -T dist/paywall-widget.min.js "$DEST/paywall-widget.min.js"
    ;;
  local-copy)
    mkdir -p "$DEST"
    cp dist/paywall-widget.min.js "$DEST/"
    ;;
  *)
    echo "Unknown target: $TARGET"
    exit 5
    ;;
esac

echo "Upload complete. Verify file is served from your staging origin."
