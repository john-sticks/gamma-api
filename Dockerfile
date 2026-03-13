FROM node:20-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar fuentes y compilar
COPY . .
RUN npm run build

# Variables de entorno (sobreescribir en docker run con -e o --env-file)
ENV DATABASE_HOST=172.17.0.1 \
    DATABASE_PORT=5432 \
    DATABASE_USERNAME=postgres \
    DATABASE_PASSWORD=postgres \
    DATABASE_NAME=gamma \
    JWT_SECRET=change-me-in-production \
    JWT_EXPIRES_IN=24h \
    PORT=3000 \
    TZ=America/Argentina/Buenos_Aires

EXPOSE 3000

CMD ["node", "dist/main"]
