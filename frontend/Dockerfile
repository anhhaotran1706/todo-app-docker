FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

# Thêm dòng này để cài thủ công binary native tương thích với Linux Alpine (ARM64)
RUN npm install @rollup/rollup-linux-arm64-musl

COPY . .
RUN npm run build

# Stage 2: Nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80