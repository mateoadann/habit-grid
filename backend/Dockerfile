# Build stage — compile native deps (better-sqlite3)
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Runtime stage
FROM node:20-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN mkdir -p data
EXPOSE 3001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
