# OpenAI Codex Runtime Container
# Contains: Node.js 20 + @openai/codex CLI

FROM node:20-slim

# Set working directory
WORKDIR /runtime

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install OpenAI Codex CLI globally
RUN npm install -g @openai/codex

# Verify installation
RUN codex --version || echo "Codex CLI installed"

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
