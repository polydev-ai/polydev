# Runs the polydev-ai MCP server over stdio. No token is needed to start it or to list its
# tools; sign in with the `login` tool or pass POLYDEV_USER_TOKEN to make requests.
FROM node:22-slim
RUN npm install -g --ignore-scripts polydev-ai@1.12.0
ENTRYPOINT ["polydev-ai"]
