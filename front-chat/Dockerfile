
FROM node:22.16.0-slim AS build

WORKDIR /usr/app

# Копируем package.json и package-lock.json
COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM nginx:latest AS runner

RUN rm /etc/nginx/conf.d/default.conf
COPY docker/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf


COPY --from=build /usr/app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]