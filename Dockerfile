# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript build)
RUN npm ci

# Copy source code and configs
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
USER node

# Copy package files and install production dependencies only
COPY --chown=node:node package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application and migrations from builder
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node src/migrations ./src/migrations

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/health || exit 1

EXPOSE 5000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]

