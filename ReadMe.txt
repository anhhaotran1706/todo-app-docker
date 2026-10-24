=====================================================================
DOCKERIZED TODO LIST  -  Web Programming with NodeJS (502070)
Level 2: Docker Compose + replicated backend + Nginx load balancing
         + Redis message queue with a separate worker service
=====================================================================

TEAM MEMBERS
  1. Tran Anh Hao  -  524H0153
  2. Ha Nam Anh  -  524H0140
  3. Le Quang Tan  -  524H0188
Lecturer: Mai Van Manh

---------------------------------------------------------------------
1. REQUIREMENTS
---------------------------------------------------------------------
  - Docker Desktop (or Docker Engine) with Docker Compose v2
  - Internet connection on first run (to pull images / npm packages)
  - Free port 8080 on the host machine
  No Node.js, MongoDB or Redis installation is needed on the host.

---------------------------------------------------------------------
2. BUILD AND RUN
---------------------------------------------------------------------
  Open a terminal in the project folder (the one containing
  docker-compose.yml) and run:

      docker compose up -d

  The first run builds the images (npm install runs inside the
  Dockerfiles), so it may take a few minutes. All commands are
  pre-configured; nothing else must be typed.

  Open the application:   http://localhost:8080
  No login is required (there is no admin account).

---------------------------------------------------------------------
3. SERVICES
---------------------------------------------------------------------
  gateway   Nginx reverse proxy + load balancer (the only published port, 8080)
  frontend  React app built with Vite, served by Nginx
  backend   Node.js/Express REST API, started as 3 replicas
  worker    Node.js consumer that reads events from Redis
  redis     Message broker (list used as a queue)
  mongo     MongoDB database (data kept in the named volume "mongo_data")
  All services share one Docker network: todo-net.

---------------------------------------------------------------------
4. HOW TO TEST
---------------------------------------------------------------------
  a) Containers are running:
         docker compose ps
     Expect: 3 backend containers + worker, frontend, gateway, mongo, redis.

  b) Basic CRUD: in the browser add, edit, complete and delete tasks.
     Data survives restarts:  docker compose restart

  c) Load balancing: the badge "served by: <id>" in the top-right of the
     page changes between 3 different container IDs while the page polls.
     From a terminal:
         curl -si http://localhost:8080/api/health | grep -i x-served-by
     Run it several times; the value rotates between replicas.

  d) Asynchronous messaging: add a task. It appears instantly, and about
     2 seconds later a notification appears in the "Notifications" panel.
     Watch the worker:
         docker compose logs -f worker
     To prove decoupling, stop the worker, add tasks (the app still works),
     then start it again and see the queued notifications get processed:
         docker compose stop worker
         docker compose start worker

  e) Resilience: stop one replica and keep using the app:
         docker ps --filter name=backend
         docker stop <one-backend-container-id>
     Requests are still served by the remaining replicas.

  f) Change the number of replicas:
         docker compose up -d --scale backend=5

---------------------------------------------------------------------
5. STOP AND CLEAN UP
---------------------------------------------------------------------
  Stop containers:                       docker compose down
  Stop and delete database data too:     docker compose down -v

---------------------------------------------------------------------
6. PROJECT STRUCTURE
---------------------------------------------------------------------
  docker-compose.yml     Defines all services, network and volume
  gateway/nginx.conf     Load balancer / reverse proxy configuration
  backend/               Express API (server.js), worker (worker.js),
                         Mongoose models, Dockerfile, package.json
  frontend/              React (Vite) source, Dockerfile (multi-stage), nginx.conf
  report/                Diagrams used in the report

---------------------------------------------------------------------
7. TROUBLESHOOTING
---------------------------------------------------------------------
  - Port 8080 busy: change "8080:80" under gateway in docker-compose.yml.
  - If the gateway returns 502 right after a backend container was
    recreated, restart it so Nginx re-resolves the backend IPs:
         docker compose restart gateway
