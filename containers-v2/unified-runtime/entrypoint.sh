#!/bin/sh
# Ultra-lightweight entrypoint for unified runtime container
set -e

echo "============================================"
echo "Polydev Unified Runtime Container"
echo "============================================"
echo "Provider: ${PROVIDER:-unknown}"
echo "User ID: ${USER_ID:-unknown}"
echo "Timestamp: $(date)"
echo "Image Size: Alpine + Node.js 20 + API clients"
echo "============================================"

# Validate provider
case "$PROVIDER" in
  openai)
    if [ -z "$OPENAI_API_KEY" ]; then
      echo "ERROR: OPENAI_API_KEY not provided"
      exit 1
    fi
    echo "✓ OpenAI API key configured"
    ;;
  anthropic)
    if [ -z "$ANTHROPIC_API_KEY" ]; then
      echo "ERROR: ANTHROPIC_API_KEY not provided"
      exit 1
    fi
    echo "✓ Anthropic API key configured"
    ;;
  google)
    if [ -z "$GOOGLE_API_KEY" ]; then
      echo "ERROR: GOOGLE_API_KEY not provided"
      exit 1
    fi
    echo "✓ Google API key configured"
    ;;
  *)
    echo "ERROR: Invalid provider: $PROVIDER"
    echo "Valid providers: openai, anthropic, google"
    exit 1
    ;;
esac

# Check for warm pool mode
if [ "$WARM_POOL" = "true" ]; then
    echo "Warm pool container - entering idle state"
    exec tail -f /dev/null
fi

# Execute command if provided, otherwise run execute.js
if [ -n "$PROMPT" ]; then
    echo "Executing prompt via execute.js..."
    exec node /runtime/execute.js
elif [ $# -gt 0 ]; then
    echo "Executing command: $@"
    exec "$@"
else
    echo "No command specified, entering idle state"
    exec tail -f /dev/null
fi
