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
    DATABASE_PORT=3306 \
    DATABASE_USERNAME=root \
    DATABASE_PASSWORD= \
    DATABASE_NAME=gamma \
    JWT_SECRET=change-me-in-production \
    JWT_EXPIRES_IN=24h \
    PORT=3001 \
    TZ=America/Argentina/Buenos_Aires

EXPOSE 3001

CMD ["node", "dist/main"]
