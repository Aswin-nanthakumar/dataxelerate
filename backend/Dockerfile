# URBANFLOW AI — Backend (Node.js / Express)
# Build from the REPO ROOT:  docker build -f backend/Dockerfile -t urbanflow-api .
FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S uf && adduser -S uf -G uf
COPY --from=deps /app/node_modules ./node_modules
COPY backend/package*.json ./
COPY backend/src ./src
COPY database ./database
USER uf
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["node", "src/index.js"]
