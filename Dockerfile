# --- Stage 1: Build Frontend ---
FROM m.daocloud.io/docker.io/library/node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- Stage 2: Build Backend ---
FROM m.daocloud.io/docker.io/library/node:20-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Copy built frontend to the static assets location of backend
COPY --from=frontend-builder /app/client/dist /app/client/dist
RUN npm run build

# --- Stage 3: Production Runtime ---
FROM m.daocloud.io/docker.io/library/node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled backend and frontend assets
COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/client/dist ./client/dist

# The app listens on 3000 by default (NestJS)
EXPOSE 3000

CMD ["node", "dist/src/main"]
