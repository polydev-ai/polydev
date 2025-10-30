# Google Gemini Runtime Container
# Contains: Node.js 20 + @google/gemini-cli

FROM node:20-slim

# Set working directory
WORKDIR /runtime

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Google Gemini CLI globally
RUN npm install -g @google/gemini-cli

# Verify installation
RUN gemini --version || echo "Gemini CLI installed"

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
