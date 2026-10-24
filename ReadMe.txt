=====================================================================
DOCKERIZED TODO LIST - Web Programming with NodeJS (502070)

Level 1: Containerized Todo application
Level 2: Docker Compose + replicated backend + Nginx load balancing
         + Redis message queue with a separate worker service
Level 3: Docker Swarm stack + rolling updates + rollback + scaling
=====================================================================

TEAM MEMBERS
  1. Tran Anh Hao  -  524H0153
  2. Ha Nam Anh    -  524H0140
  3. Le Quang Tan  -  524H0188
Lecturer: Duong Huu Phuoc

---------------------------------------------------------------------
1. PROJECT LEVELS
---------------------------------------------------------------------
  LEVEL 1 - CONTAINERIZATION
  - The backend runs in a Node.js container.
  - The frontend is built with React/Vite and served by Nginx.
  - MongoDB and Redis run as separate containers.
  - Dockerfiles define the runtime images and dependencies.
  - The application can run without installing Node.js, MongoDB or
    Redis directly on the host machine.

  LEVEL 2 - DOCKER COMPOSE
  - docker-compose.yml defines the complete multi-container system.
  - Services include gateway, frontend, backend, worker, Redis and MongoDB.
  - Nginx acts as a reverse proxy and load balancer.
  - The backend can run multiple replicas.
  - Redis provides an asynchronous event queue for the worker service.
  - MongoDB data is persisted in the named volume "mongo_data".
  - Healthchecks are configured for MongoDB and Redis.

  LEVEL 3 - DOCKER SWARM
  - docker-stack.yml defines the production-style Swarm deployment.
  - The stack uses an overlay network named "todo-net".
  - Backend runs with 3 replicas.
  - Frontend and gateway run with 2 replicas each.
  - Rolling updates use start-first deployment order.
  - Failed updates can automatically roll back.
  - Services have restart policies for failure recovery.
  - Docker Swarm provides service scaling and internal load balancing.

---------------------------------------------------------------------
2. REQUIREMENTS
---------------------------------------------------------------------
  LEVEL 1 AND LEVEL 2
  - Docker Desktop or Docker Engine with Docker Compose v2
  - Internet connection on first run
  - Free port 8080 on the host machine

  LEVEL 3
  - Docker Engine with Swarm mode enabled
  - One manager node and at least one worker node for multi-node testing
  - A container registry accessible by all Swarm nodes
  - Free port 8080 on the Swarm ingress node

  No Node.js, MongoDB or Redis installation is needed on the host.

---------------------------------------------------------------------
3. LEVEL 1 - BUILD AND RUN THE CONTAINERS
---------------------------------------------------------------------
  Build the backend image:

      docker build -t todo-backend:local ./backend

  Build the frontend image:

      docker build -t todo-frontend:local ./frontend

  The gateway image can be built separately when needed:

      docker build -t todo-gateway:local ./gateway

  Level 1 focuses on packaging the application components into Docker
  images. The complete multi-service startup is described in Level 2.

---------------------------------------------------------------------
4. LEVEL 2 - RUN WITH DOCKER COMPOSE
---------------------------------------------------------------------
  Open a terminal in the project folder and run:

      docker compose up -d --pull always

  The first run builds the local backend and frontend images. The command
  may take a few minutes while Docker pulls base images and installs npm
  packages.

  Open the application:

      http://localhost:8080

  Check the service status:

      docker compose ps

  Expected services:
    - gateway
    - frontend
    - backend
    - worker
    - redis
    - mongo

  Scale the backend with Docker Compose:

      docker compose up -d --scale backend=5

  Stop the Compose deployment:

      docker compose down

  Stop the deployment and remove MongoDB data:

      docker compose down -v

---------------------------------------------------------------------
5. LEVEL 3 - DEPLOY WITH DOCKER SWARM
---------------------------------------------------------------------
  Level 3 uses docker-stack.yml. Swarm mode must be enabled before
  deploying the stack.

  5.1 Initialize a single-node Swarm

      docker swarm init

  If Swarm mode is already enabled, skip this command.

  5.2 Build the images used by the stack

      docker build -t todo-backend:latest ./backend
      docker build -t todo-frontend:latest ./frontend
      docker build -t todo-gateway:latest ./gateway

  For a multi-node Swarm, push the images to a registry accessible by
  every node. Set REGISTRY to that registry address, then push:

      docker tag todo-backend:latest REGISTRY_HOST/todo-backend:latest
      docker tag todo-frontend:latest REGISTRY_HOST/todo-frontend:latest
      docker tag todo-gateway:latest REGISTRY_HOST/todo-gateway:latest

      docker push REGISTRY_HOST/todo-backend:latest
      docker push REGISTRY_HOST/todo-frontend:latest
      docker push REGISTRY_HOST/todo-gateway:latest

  5.3 Deploy the stack

  For a local single-node registry or a configured registry:

      export REGISTRY=REGISTRY_HOST
      export TAG=latest
      docker stack deploy -c docker-stack.yml todo

  If the images are available locally on a single Swarm node, use the
  default registry value configured in docker-stack.yml.

  5.4 Inspect the deployment

      docker stack services todo
      docker stack ps todo
      docker service ls

  Open the application at:

      http://localhost:8080

  5.5 Scale services

      docker service scale todo_backend=5
      docker service scale todo_frontend=3
      docker service scale todo_gateway=3

  5.6 Test rolling update and rollback

      docker service update --image REGISTRY_HOST/todo-backend:NEW_TAG todo_backend
      docker service ps todo_backend

  Roll back the latest backend update if required:

      docker service rollback todo_backend

  5.7 Remove the stack

      docker stack rm todo

  Leave Swarm mode:

      docker swarm leave --force

---------------------------------------------------------------------
6. HOW TO TEST LEVEL 2 AND LEVEL 3
---------------------------------------------------------------------
  a) Basic CRUD
     Add, edit, complete and delete tasks in the browser.
     MongoDB data persists through container restarts.

  b) Load balancing
     The application exposes the backend hostname through the
     X-Served-By response header:

         curl -si http://localhost:8080/api/health | grep -i X-Served-By

     Run the command multiple times. Requests should be handled by
     different backend replicas.

  c) Asynchronous messaging
     Add a task and wait approximately two seconds for its notification.
     Inspect the worker logs:

         docker compose logs -f worker

     In Swarm mode, use:

         docker service logs -f todo_worker

     Stop the worker, add tasks, then start or scale it again. The API
     remains available while events wait in the Redis queue.

  d) Resilience
     In Compose mode, stop one backend container:

         docker ps --filter name=backend
         docker stop <one-backend-container-id>

     In Swarm mode, remove one backend task and inspect recovery:

         docker service ps todo_backend
         docker service scale todo_backend=3

     Remaining replicas continue serving requests, and Swarm recreates
     tasks according to the service restart policy.

---------------------------------------------------------------------
7. SERVICES AND PROJECT STRUCTURE
---------------------------------------------------------------------
  gateway   Nginx reverse proxy and load balancer; publishes port 8080
  frontend  React application built with Vite and served by Nginx
  backend   Node.js/Express REST API
  worker    Node.js consumer for Redis events
  redis     Redis message broker and list-based queue
  mongo     MongoDB database with persistent storage

  docker-compose.yml     Level 2 local multi-container deployment
  docker-stack.yml       Level 3 Docker Swarm deployment
  backend/               Express API, worker, models and Dockerfile
  frontend/              React/Vite source and multi-stage Dockerfile
  gateway/               Nginx configuration and Dockerfile
  report/                Architecture and Docker diagrams

---------------------------------------------------------------------
8. CONFIGURATION AND SECURITY
---------------------------------------------------------------------
  Compose automatically reads values from a local .env file when present.
  The Compose file also uses environment variables for SMTP settings.

  Do not commit .env files or bake passwords into Docker images.
  Replace the demo JWT_SECRET before using the application outside a
  classroom or local development environment.

  Important variables include:
    MONGO_URL, REDIS_URL, JWT_SECRET, APP_URL
    SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM
    REGISTRY, TAG

---------------------------------------------------------------------
9. TROUBLESHOOTING
---------------------------------------------------------------------
  - Port 8080 is busy:
      Change "8080:80" in docker-compose.yml or the published port in
      docker-stack.yml.

  - Gateway returns 502 after backend recreation:
      docker compose restart gateway

  - Compose service status:
      docker compose ps
      docker compose logs <service-name>

  - Swarm service status:
      docker stack services todo
      docker service ps todo_backend
      docker service logs todo_backend

  - Swarm node status:
      docker node ls

=====================================================================
END OF README
=====================================================================
