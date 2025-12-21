FROM node:22.16.0-slim AS build

WORKDIR /usr/app

# Кэшируем зависимости
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:stable-alpine 

# Копируем ваш конфиг
COPY docker/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Копируем собранный фронтенд
COPY --from=build /usr/app/dist /usr/share/nginx/html

# Не нужно EXPOSE — он информационный, не влияет на работу
CMD ["nginx", "-g", "daemon off;"]