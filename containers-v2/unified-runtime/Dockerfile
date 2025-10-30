# Ultra-Lightweight Unified Runtime Container
# Supports: OpenAI, Anthropic, Google via API clients (NOT full CLI tools)
# Target: <50MB image size for 200+ concurrent containers

FROM node:20-alpine

# Install ONLY minimal runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /runtime

# Copy package.json for dependency installation
COPY package.json /runtime/package.json

# Install ONLY lightweight API clients (not full CLI tools!)
# Using package.json for cleaner dependency management
RUN npm install --production --omit=dev --omit=optional \
    && npm cache clean --force \
    && rm -rf /tmp/* /root/.npm

# Create execution script
COPY execute.js /runtime/execute.js
COPY entrypoint.sh /runtime/entrypoint.sh
RUN chmod +x /runtime/entrypoint.sh

# Create non-root user (uid 1001)
RUN adduser -D -u 1001 runtime && \
    chown -R runtime:runtime /runtime

# Switch to non-root user
USER runtime

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Default command
CMD ["/runtime/entrypoint.sh"]
