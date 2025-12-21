# Stage 1: Build
FROM rust:1.92-slim AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        libpq-dev \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем ВСЁ: исходники, Cargo.*, .env, sqlx-data.json
COPY . .

# 🔑 КРИТИЧЕСКИ ВАЖНО: отключаем онлайн-проверку
ENV SQLX_OFFLINE=true

# Сборка
RUN cargo build --release --locked

# Stage 2: Runtime
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates libpq5 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/auth-service /usr/local/bin/

EXPOSE 8080
CMD ["auth-service"]