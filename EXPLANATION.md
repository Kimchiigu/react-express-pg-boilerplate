# Docker Concepts & File Explanations

See the slides in : https://canva.link/docker-basics

---

## What is Docker?

Docker is a tool that packages your app and everything it needs into a **container** — a lightweight, self-contained unit that runs the same way on any machine.

### The Problem It Solves

Imagine you build an app on your Mac and it works perfectly. You send it to a teammate and it crashes because:
- They have a different version of Node.js
- They don't have PostgreSQL installed
- Their system libraries are different

Docker eliminates this "works on my machine" problem by bundling the app **with its entire environment** — OS, runtime, dependencies, config — into a container. A container runs identically on your Mac, your teammate's Windows laptop, and a cloud server.

### Containers vs Virtual Machines

| | Container | Virtual Machine |
|---|---|---|
| Size | Megabytes | Gigabytes |
| Boot time | Seconds | Minutes |
| Shares host OS | Yes | No (has its own OS) |
| Isolation | Process-level | Full OS-level |

Containers are lighter because they share the host's Linux kernel instead of running a full operating system.

---

## Core Concepts

### Image

A **read-only template** that contains everything needed to run an app — the OS, runtime, code, and dependencies. Think of it as a "blueprint."

You build images from a `Dockerfile`. Once built, an image is immutable — it doesn't change.

Example: `node:25-alpine` is an image that has Node.js 25 installed on Alpine Linux (a minimal Linux distro).

### Container

A **running instance of an image**. You can start, stop, and restart containers. If you delete a container, it's gone — but the image it came from is still there, so you can create a new container anytime.

One image can create many containers (like how one blueprint can build many houses).

### Volume

A **persistent storage** mechanism. By default, when a container is deleted, all data inside it is lost. Volumes let you **preserve data** across container restarts and deletions.

In this project, `pgdata` is a volume that stores the PostgreSQL data. Without it, running `docker compose down` would wipe your database.

### Network

Docker containers run in **isolated networks**. By default, containers can't see each other. Docker Compose automatically creates a shared network for all services in the same `docker-compose.yml`, so they can communicate using their service names as hostnames.

In this project:
- The backend reaches the database using hostname `db` (not `localhost`)
- The frontend reaches the backend through the host machine's `localhost:3000` (because the browser runs on the host, not inside a container)

### Port Mapping

Containers have their own isolated ports. To make a container's port accessible from your Mac, you **map** a host port to a container port:

```
"5173:80"  →  host port 5173  →  container port 80
```

This is why you open `http://localhost:5173` in your browser even though nginx listens on port 80 inside the container.

---

## Dockerfile

A text file with instructions to build an image. Each line is a **layer** — Docker caches each layer, so rebuilding only re-runs steps that changed. This makes builds fast.

---

## `backend/Dockerfile` — Line by Line

```dockerfile
FROM node:25-alpine
```
Starts from an official Node.js 25 image built on Alpine Linux. Alpine is ~5MB vs ~1GB for the full Ubuntu-based Node image. Everything that follows is layered on top of this base.

```dockerfile
WORKDIR /app
```
Sets `/app` as the working directory inside the container. All subsequent commands (COPY, RUN, CMD) operate relative to this directory. If `/app` doesn't exist, Docker creates it.

```dockerfile
COPY package.json package-lock.json* ./
```
Copies `package.json` and `package-lock.json` (if it exists) from your Mac into the container's `/app/`. We copy these **before** the source code to take advantage of Docker's layer caching — if only your code changes but dependencies don't, Docker reuses the cached `npm install` layer.

The `*` glob on `package-lock.json` means "copy it if it exists, skip if it doesn't" — the build won't fail if there's no lock file.

```dockerfile
RUN npm install --omit=dev
```
Installs production dependencies only (`cors`, `dotenv`, `express`, `pg`). Skips dev dependencies since they're not needed at runtime. Results in a smaller image.

```dockerfile
COPY . .
```
Copies all remaining files from your Mac's `backend/` folder into `/app/` in the container. This includes `index.js`. Files listed in `.dockerignore` are excluded.

```dockerfile
EXPOSE 3000
```
Documents that the container listens on port 3000. This is informational — it doesn't actually publish the port. The actual port mapping happens in `docker-compose.yml` with `ports: "3000:3000"`.

```dockerfile
CMD ["node", "index.js"]
```
The command that runs when the container starts. This starts your Express server. Written in **exec form** (JSON array) which runs `node` directly as PID 1 — this lets Node handle shutdown signals properly.

---

## `frontend/Dockerfile` — Line by Line

This uses a **multi-stage build** — two `FROM` lines create two separate stages. The final image only contains what's in the last stage.

### Stage 1: Build

```dockerfile
# Stage 1: Build the React app
FROM node:25-alpine AS build
```
Starts a Node.js Alpine image and names this stage `build`. The `AS build` label lets us reference this stage later in the `COPY --from=build` command.

```dockerfile
WORKDIR /app
```
Sets `/app` as the working directory inside the container.

```dockerfile
COPY package.json package-lock.json* ./
RUN npm install
```
Copies dependency files and installs **all** dependencies (including dev dependencies like Vite and the React plugin). We need dev dependencies here because Vite is the build tool.

```dockerfile
COPY . .
RUN npm run build
```
Copies all source code, then runs `vite build`. This compiles your React JSX, CSS, and HTML into optimized static files (HTML, JS, CSS) in the `/app/dist/` folder. After this step, we no longer need Node.js or the source code.

### Stage 2: Serve

```dockerfile
# Stage 2: Serve static files with nginx
FROM nginx:alpine
```
Starts a completely fresh, minimal nginx image. This image has **no Node.js, no source code, no node_modules** — only nginx. The result is an image that's ~25MB instead of ~500MB.

```dockerfile
COPY --from=build /app/dist /usr/share/nginx/html
```
Copies **only** the built static files from the `build` stage into nginx's default document root. Everything else from the build stage (Node.js, source code, node_modules) is discarded.

```dockerfile
EXPOSE 80
```
Documents that the container listens on port 80 (nginx's default port).

```dockerfile
CMD ["nginx", "-g", "daemon off;"]
```
Starts nginx in the foreground. Without `daemon off;`, nginx runs as a background daemon and the container would immediately exit because the foreground process ends. Docker keeps a container alive only as long as its main process (PID 1) is running.

### Why Multi-Stage?

| | Single-stage | Multi-stage |
|---|---|---|
| Final image size | ~500MB (Node + node_modules) | ~25MB (nginx + static files) |
| Attack surface | Large (full Node.js, npm, dev tools) | Minimal (only nginx) |
| Contains source code | Yes | No (only compiled output) |

---
## `.dockerignore`

A `.dockerignore` file tells Docker which files and folders to exclude when building an image, so they don’t get copied into the build context.

In practice, it works a lot like a `.gitignore` file but for Docker builds. When you run `docker build .`, Docker sends the “build context” (your project directory contents) to the Docker daemon. The `.dockerignore` file lists patterns of files/directories to skip, which:

- Makes builds faster (less data to send and process).

- Keeps images smaller (no node_modules, logs, temp files, etc.).

- Avoids leaking secrets (like `.env`, private keys, or config files you don’t want inside the image).



---

## `docker-compose.yml` — Line by Line

```yaml
services:
```
Defines the containers (services) that make up your application.

### db Service

```yaml
  db:
    image: postgres:18-alpine
```
Uses the official PostgreSQL 18 Alpine image directly — no custom Dockerfile needed. Docker pulls this from Docker Hub.

```yaml
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```
Passes environment variables to the container. `${VAR}` syntax reads from the root `.env` file. PostgreSQL uses these on first start to create a database and set the superuser password.

```yaml
    ports:
      - "5432:5432"
```
Maps host port 5432 to container port 5432. This lets you connect to the database from your Mac (e.g., using `psql` or database GUI tools). Format is always `"HOST_PORT:CONTAINER_PORT"`.

```yaml
    volumes:
      - pgdata:/var/lib/postgresql/data
```
Mounts the named volume `pgdata` to PostgreSQL's data directory. This is where Postgres stores all databases, tables, and rows. Without this volume, `docker compose down` would permanently delete your data.

### backend Service

```yaml
  backend:
    build: ./backend
```
Builds the image from `./backend/Dockerfile` instead of pulling from Docker Hub.

```yaml
    env_file:
      - ./backend/.env
```
Loads all variables from `./backend/.env` into the container. This is how `DATABASE_URL` gets passed to your Express app. Using `env_file` is cleaner than listing every variable under `environment:`.

```yaml
    ports:
      - "3000:3000"
```
Maps host port 3000 to container port 3000. The browser on your Mac reaches the backend at `http://localhost:3000`.

```yaml
    depends_on:
      - db
```
Tells Docker Compose to start the `db` service before the `backend` service. Note: this only waits for the container to **start**, not for PostgreSQL to be **ready to accept connections**. For this simple project, that's fine — the backend retries on connection failure.

### frontend Service

```yaml
  frontend:
    build: ./frontend
```
Builds the image from `./frontend/Dockerfile`.

```yaml
    ports:
      - "5173:80"
```
Maps host port 5173 (matching Vite's dev server port) to nginx's port 80 inside the container. You open `http://localhost:5173` in your browser.

```yaml
    depends_on:
      - backend
```
Starts the backend before the frontend.

### Volumes

```yaml
volumes:
  pgdata:
```
Declares the named volume `pgdata`. Docker manages this volume on your Mac's filesystem (stored in `/var/lib/docker/volumes/`). It persists across `docker compose down` and is only deleted if you run `docker compose down -v`.

---

## How It All Fits Together

```
Browser (your Mac)
  │
  │  http://localhost:5173
  ▼
frontend container (nginx, port 80 → host 5173)
  │  serves static HTML/JS/CSS
  │
  │  http://localhost:3000/tasks
  ▼
backend container (Express, port 3000 → host 3000)
  │
  │  postgresql://postgres:postgres@db:5432/taskdb
  ▼
db container (PostgreSQL 18, port 5432 → host 5432)
  │
  │  data stored in pgdata volume
  ▼
Persistent disk storage
```

The frontend and backend communicate through the **host machine's ports** — the browser calls `localhost:3000` which Docker routes to the backend container. The backend and database communicate through **Docker's internal network** — the backend connects to hostname `db` which Docker resolves to the database container's IP.
