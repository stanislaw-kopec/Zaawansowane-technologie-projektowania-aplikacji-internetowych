FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY knexfile.js ./
COPY src ./src
CMD ["sh", "-c", "npm run db:migrate && exec node src/server.js"]
