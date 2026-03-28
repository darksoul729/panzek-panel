# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend ./frontend
COPY web ./web
RUN cd frontend && npm run build

# Stage 2: Build Go Backend
FROM golang:1.22-alpine AS go-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main cmd/server/main.go

# Stage 3: Final Runtime
FROM alpine:latest
RUN apk add --no-cache \
    git \
    php83 \
    php83-cli \
    php83-common \
    php83-mbstring \
    php83-xml \
    php83-bcmath \
    php83-openssl \
    php83-tokenizer \
    php83-curl \
    php83-pdo \
    php83-pdo_mysql \
    php83-mysqlnd \
    php83-zip \
    php83-phar \
    php83-dom \
    php83-xmlwriter \
    php83-session \
    php83-fileinfo \
    php83-ctype \
    composer \
    nodejs \
    npm \
    mysql-client \
    docker-cli \
    docker-cli-compose \
    bash

# Create symlink for php
RUN ln -sf /usr/bin/php83 /usr/bin/php

WORKDIR /root/
COPY --from=go-builder /app/main .
COPY --from=frontend-builder /app/web ./web

EXPOSE 3000
CMD ["./main"]
