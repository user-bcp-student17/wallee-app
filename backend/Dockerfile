# Nombres completos de imagen: Podman no resuelve nombres cortos sin preguntar.
FROM docker.io/library/node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Pruebas: podman build --target test backend
FROM deps AS test
COPY . .
RUN npm run test:cov && npm run test:e2e

FROM deps AS build
COPY . .
RUN npm run build

FROM docker.io/library/node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Directorio de la base SQLite; el volumen hereda este propietario sin privilegios.
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
