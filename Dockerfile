# Simple single-stage: copy pre-built frontend + backend
FROM node:20-slim
WORKDIR /app

ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8
ENV LANGUAGE=en_US.UTF-8
ENV NODE_ENV=production

# Copy and install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server code
COPY server/ ./server/

# Copy pre-built frontend (run "npm run build" in client/ before deploy)
COPY client/dist/ ./client/dist/

EXPOSE 8080

CMD ["node", "server/index.js"]
