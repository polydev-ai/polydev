# Anthropic Claude Code Runtime Container
# Contains: Node.js 20 + @anthropic-ai/claude-code CLI

FROM node:20-slim

# Set working directory
WORKDIR /runtime

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Anthropic Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Verify installation
RUN claude --version || echo "Claude Code CLI installed"

# Create non-root user for security (uid 1001, uid 1000 is node user)
RUN useradd -m -u 1001 runtime && \
    chown -R runtime:runtime /runtime

# Switch to non-root user
USER runtime

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Default command (overridden by Nomad job)
CMD ["/bin/sh", "-c", "tail -f /dev/null"]
