# Dockerized Todo List

Ứng dụng Todo List full-stack cho môn Web Programming with NodeJS (502070).

- **Level 1:** Dockerfile và container hóa từng thành phần.
- **Level 2:** Docker Compose, Nginx gateway, backend replicas, Redis worker và Mailpit.
- **Level 3:** Docker Swarm, scaling, rolling update và rollback.

## Thành viên

1. Tran Anh Hao - 524H0153
2. Ha Nam Anh - 524H0140
3. Le Quang Tan - 524H0188

Lecturer: Duong Van Manh

## Yêu cầu

- Docker Desktop hoặc Docker Engine.
- Docker Compose v2.
- Port `8080` và `8025` chưa được sử dụng.
- Level 3 cần Docker Swarm; nhiều node cần registry dùng chung.

Không cần cài Node.js, MongoDB hoặc Redis trên máy host.

## Cấu trúc project

```text
.
├── backend/
│   ├── Dockerfile
│   ├── server.js       # Express REST API
│   ├── worker.js       # Redis worker gửi email và tạo notification
│   ├── auth.js         # Đăng ký, đăng nhập, verify email
│   ├── models.js       # User, Todo, Notification
│   └── mailer.js       # SMTP client kết nối Mailpit
├── frontend/
│   ├── Dockerfile      # Multi-stage React/Vite + Nginx
│   └── src/            # Giao diện Todo List
├── gateway/
│   ├── Dockerfile
│   └── nginx.conf      # Reverse proxy và load balancing
├── docker-compose.yml  # Level 2
├── docker-stack.yml    # Level 3
└── report/             # Sơ đồ kiến trúc và Docker
```

## Level 1 - Build Docker images

Level 1 kiểm tra khả năng đóng gói backend, frontend và gateway thành Docker images.

```bash
docker build -t todo-backend:local ./backend
docker build -t todo-frontend:local ./frontend
docker build -t todo-gateway:local ./gateway
docker images | grep todo
```

Kiểm tra thành công khi cả ba images được build không lỗi.

## Level 2 - Chạy bằng Docker Compose

### Khởi động

```bash
docker compose up -d --pull always
docker compose ps
```

Mở ứng dụng:

- Todo List: http://localhost:8080
- Mailpit: http://localhost:8025

Mailpit dùng SMTP nội bộ:

```text
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
```

Không cần Gmail, SMTP account hoặc App Password. Email verify được giữ trong Mailpit và không gửi ra Internet.

### Test Level 2

1. Đăng ký tài khoản mới.
2. Mở Mailpit tại `http://localhost:8025`.
3. Mở email verify và bấm link.
4. Đăng nhập và kiểm tra banner verify đã biến mất.
5. Thêm, sửa, hoàn thành và xóa Todo.
6. Thêm một Todo, chờ notification được worker xử lý.

Kiểm tra service và log:

```bash
docker compose ps
docker compose logs -f worker
```

Scale backend:

```bash
docker compose up -d --scale backend=5
```

Kiểm tra load balancing:

```bash
curl -si http://localhost:8080/api/health | grep -i X-Served-By
```

Chạy nhiều lần để quan sát backend replica phục vụ request.

Dừng và xóa:

```bash
docker compose down
docker compose down -v
```

`down -v` sẽ xóa volume MongoDB và dữ liệu Todo.

## Level 3 - Chạy bằng Docker Swarm

### Khởi tạo Swarm

```bash
docker swarm init
```

### Build images

Với một node local, build các image theo tên stack sử dụng:

```bash
docker build -t localhost:5000/todo-backend:latest ./backend
docker build -t localhost:5000/todo-frontend:latest ./frontend
docker build -t localhost:5000/todo-gateway:latest ./gateway
```

Với nhiều node, tag và push cả ba images lên registry dùng chung:

```bash
docker tag localhost:5000/todo-backend:latest REGISTRY_HOST/todo-backend:latest
docker tag localhost:5000/todo-frontend:latest REGISTRY_HOST/todo-frontend:latest
docker tag localhost:5000/todo-gateway:latest REGISTRY_HOST/todo-gateway:latest

docker push REGISTRY_HOST/todo-backend:latest
docker push REGISTRY_HOST/todo-frontend:latest
docker push REGISTRY_HOST/todo-gateway:latest
```

### Deploy stack

```bash
export REGISTRY=REGISTRY_HOST
export TAG=latest
docker stack deploy -c docker-stack.yml todo
```

Nếu dùng một node và image nằm local, đặt `REGISTRY=localhost:5000` hoặc dùng giá trị mặc định trong `docker-stack.yml`.

Kiểm tra:

```bash
docker stack services todo
docker stack ps todo
docker service ls
```

Mở ứng dụng:

- Todo List: http://localhost:8080
- Mailpit: http://localhost:8025

### Test Level 3

Kiểm tra số replica mặc định:

```bash
docker service ls
```

Mặc định:

- Backend: 3 replicas.
- Frontend: 2 replicas.
- Gateway: 2 replicas.
- Worker, Redis, MongoDB và Mailpit: 1 replica.

Scale service:

```bash
docker service scale todo_backend=5
docker service scale todo_frontend=3
docker service scale todo_gateway=3
```

Kiểm tra rolling update:

```bash
docker service update --image REGISTRY_HOST/todo-backend:NEW_TAG todo_backend
docker service ps todo_backend
```

Rollback:

```bash
docker service rollback todo_backend
```

Kiểm tra worker và Mailpit:

```bash
docker service logs -f todo_worker
docker service ps todo_mailpit
```

Test resilience bằng cách xóa một task backend:

```bash
docker service ps todo_backend
docker rm -f <backend-container-id>
docker service ps todo_backend
```

Swarm sẽ tạo task thay thế theo restart policy.

Xóa stack:

```bash
docker stack rm todo
docker swarm leave --force
```

## Services

| Service | Vai trò | Cổng |
|---|---|---:|
| `gateway` | Nginx reverse proxy và load balancer | `8080` |
| `frontend` | React/Vite được serve bằng Nginx | nội bộ `80` |
| `backend` | Express REST API | nội bộ `3000` |
| `worker` | Đọc event từ Redis và gửi email | nội bộ |
| `redis` | Message queue | nội bộ `6379` |
| `mongo` | Database và persistent volume | nội bộ `27017` |
| `mailpit` | SMTP giả lập và giao diện email | SMTP `1025`, UI `8025` |

## Lưu ý

- Chỉ dùng một trong hai cách chạy tại một thời điểm: Compose hoặc Swarm.
- Nếu chạy cả hai, các service có thể dùng khác database, Redis, worker và network.
- `docker-compose.yml` dùng bridge network; `docker-stack.yml` dùng overlay network.
- Mailpit chỉ dùng cho development/testing, không gửi email thật.
- Đổi `JWT_SECRET` trước khi triển khai ngoài môi trường học tập.
- Không commit `.env`, password hoặc secret vào Git.
