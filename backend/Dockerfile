# --- Stage 1: Builder (Kompilierung) ---
FROM node:18-slim AS builder
WORKDIR /app/backend

# Kopiere package files und lock file
COPY package*.json ./
COPY package-lock.json ./

# Installiere alle Abhängigkeiten
RUN npm ci

# --- Stage 2: Production (Laufzeit) ---
FROM node:18-slim AS production
WORKDIR /app/backend

# Kopiere nur die kompilierten Node-Module vom Builder-Stage
COPY --from=builder /app/backend/node_modules ./node_modules
# Kopiere den gesamten Code
COPY . /app/backend

# Setze den korrekten Startpunkt
CMD ["node", "server.js"]