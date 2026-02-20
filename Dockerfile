FROM node:20-alpine

WORKDIR /app

# Устанавливаем зависимости
COPY package*.json ./
RUN npm ci --omit=dev

# Копируем код приложения
COPY . .

# Директории для сессий и загрузок
RUN mkdir -p /app/sessions /app/uploads

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/server.js"]
