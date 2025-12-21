# Stage 1: Build
FROM rust:1.92-slim AS builder

# Устанавливаем системные зависимости для Rust + Kafka + PostgreSQL
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        libpq-dev \
        pkg-config \
        # 🔑 Критически важно для rdkafka-sys:
        build-essential \
        libssl-dev \
        libsasl2-dev \
        # Опционально: для лучшей совместимости
        cmake \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

ENV SQLX_OFFLINE=true

RUN cargo build --release --locked

# Stage 2: Runtime
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        libpq5 \
        # 🔑 librdkafka.so нужен в runtime!
        librdkafka1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# ⚠️ Исправьте имя бинарника: должно быть chat-service, а не auth-service
COPY --from=builder /app/target/release/chat-service /usr/local/bin/chat-service

EXPOSE 8081
CMD ["chat-service"]