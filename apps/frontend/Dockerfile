FROM node:21.7.3-alpine AS builder

RUN npm i -g pnpm

WORKDIR /app

ENV CI=true

COPY ./package.json ./pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm run build

FROM nginx

EXPOSE 80

COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html