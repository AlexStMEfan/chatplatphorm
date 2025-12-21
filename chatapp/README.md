# Chat Platform

Полноценная платформа для чата с фронтендом на React, бэкендом на Rust и WebSocket-чатом.  

Проект поддерживает:  

- **Аутентификацию** через JWT (`auth-service`)  
- **Чат-сервис** с хранением сообщений и реакций (`chat-service`)  
- **Фронтенд** на React + TypeScript (`front-chat`)  
- **WebSocket** для живых сообщений  
- **Docker** для всех сервисов  
- **Kubernetes** для продакшн-деплоя  

---

## 📁 Структура проекта

```text
.
├── auth-service/          # Rust backend для аутентификации
├── chat-service/          # Rust backend для чата
├── front-chat/            # React frontend
├── api/                   # API клиент для фронта
├── components/            # React компоненты
├── hooks/                 # React hooks
├── stores/                # Zustand store
├── types/                 # TypeScript типы
├── docker/                # Конфигурация Docker и Nginx
└── k8s/                   # Kubernetes манифесты
```

---

## ⚡ Технологии

| Компонент        | Технологии                          |
|-----------------|------------------------------------|
| Frontend         | React, TypeScript, Tailwind, TipTap, Zustand, Framer Motion |
| Auth Service     | Rust, Actix Web / Rocket, PostgreSQL, Redis |
| Chat Service     | Rust, Actix Web / Rocket, Kafka, ScyllaDB |
| WebSocket        | socket.io (через chat-service)     |
| Сборка           | Docker, GitLab CI/CD                |
| Деплой           | Kubernetes, Ingress, Nginx         |

---

## 🛠 Локальный запуск

### 1. Бэкенды (Rust)

```bash
# auth-service
cd auth-service
cargo run --release

# chat-service
cd chat-service
cargo run --release
```

### 2. Frontend (React)

```bash
cd front-chat
npm install
npm run start
```

Frontend будет доступен на `http://localhost:3000`  

### 3. WebSocket

- chat-service поднимает WS на `/ws`  
- front-chat подключается к `REACT_APP_WS_URL`  

---
3K2-9KRZYB346j5A9
## 🐳 Docker

### 1. Сборка образов

```bash
# auth-service
docker build -t your-registry/auth-service:v1 ./auth-service

# chat-service
docker build -t your-registry/chat-service:v1 ./chat-service

# front-chat
docker build -t your-registry/front-chat:v1 ./front-chat
```

### 2. Запуск локально

```bash
docker run -p 8080:8080 your-registry/auth-service:v1
docker run -p 8081:8081 your-registry/chat-service:v1
docker run -p 3000:80 your-registry/front-chat:v1
```

---

## ☸ Kubernetes (Prod)

- Namespace: `chat-platform`  
- Secrets: `chat-secrets` для базы, Redis, Kafka и JWT  
- Services: `auth-service`, `chat-service`, `front-chat`  
- Ingress: `chat.example.com`  

Применение:

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-secrets.yaml
kubectl apply -f k8s/02-scylla-external.yaml
kubectl apply -f k8s/03-auth-service.yaml
kubectl apply -f k8s/04-chat-service.yaml
kubectl apply -f k8s/05-front-chat.yaml
kubectl apply -f k8s/06-ingress.yaml
```

---

## ⚙ Настройки окружения

Фронтенд через `.env` или переменные окружения:

```env
REACT_APP_API_URL=https://chat.example.com/api
REACT_APP_WS_URL=wss://chat.example.com/ws
```

Бэкенды через `Secrets` в Kubernetes:

- `POSTGRES_*` — настройки PostgreSQL  
- `REDIS_URL` — Redis  
- `KAFKA_BROKERS`, `KAFKA_CHAT_TOPIC` — Kafka  
- `JWT_SECRET` — JWT ключ  

---

## 🚀 CI/CD

- GitLab CI/CD билдит фронт и бэкенды  
- Пушит Docker-образы в реестр  
- Деплой в Kubernetes с обновлением образов через `kubectl set image`  
- Возможность настроить автоматическое обновление Ingress  

---

## 📝 TODO / Возможные улучшения

- Настроить SSL / TLS через Ingress  
- Добавить RBAC для микросервисов  
- Поддержка SSO (Google, Яндекс)  
- Метрики и мониторинг (Prometheus / Grafana)  
- Тестирование: e2e и unit тесты  
- Сервис для отправки уведомлений  

---

## 📌 Лицензия

MIT License © [Alex Efanov, Denis, Daniyar, Roman]