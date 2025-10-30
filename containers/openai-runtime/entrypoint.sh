#!/bin/bash
# Entrypoint for OpenAI Codex Runtime Container
# Handles credential injection and CLI execution

set -e

# Display container info
echo "====================================="
echo "OpenAI Codex Runtime Container"
echo "====================================="
echo "Provider: ${PROVIDER:-openai}"
echo "User ID: ${USER_ID:-unknown}"
echo "Timestamp: $(date)"
echo "====================================="

# Verify API key is present
if [ -z "$OPENAI_API_KEY" ]; then
    echo "ERROR: OPENAI_API_KEY not provided"
    exit 1
fi

echo "✓ OpenAI API key configured (${#OPENAI_API_KEY} chars)"

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
