#!/bin/bash
# Entrypoint for Google Gemini Runtime Container
# Handles credential injection and CLI execution

set -e

# Display container info
echo "====================================="
echo "Google Gemini Runtime Container"
echo "====================================="
echo "Provider: ${PROVIDER:-google}"
echo "User ID: ${USER_ID:-unknown}"
echo "Timestamp: $(date)"
echo "====================================="

# Verify API key is present
if [ -z "$GOOGLE_API_KEY" ]; then
    echo "ERROR: GOOGLE_API_KEY not provided"
    exit 1
fi

echo "✓ Google API key configured (${#GOOGLE_API_KEY} chars)"

# Check if project ID is provided
if [ -n "$GOOGLE_PROJECT_ID" ]; then
    echo "✓ Google Project ID: $GOOGLE_PROJECT_ID"
fi

# Check if this is a warm pool container
if [ "$WARM_POOL" = "true" ]; then
    echo "Warm pool container - entering idle state"
    exec tail -f /dev/null
fi

# Execute the command passed by Nomad
if [ -z "$1" ]; then
    echo "No command specified, entering idle state"
    exec tail -f /dev/null
else
    echo "Executing command: $@"
    exec "$@"
fi
