# Docker Guide

Run the full-stack app using Docker — no need to install Node.js, PostgreSQL, or anything else on your machine.

---

## Prerequisites

1. **Install Docker Desktop**
   Download it from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)

2. **Verify installation**
   ```bash
   docker --version
   docker compose version
   ```
   If both print a version number, you're good to go.

---

## Quick Start (All-in-One)

From the project root:

```bash
docker compose up --build
```

This starts three containers:

| Service   | What it does                | URL                      |
|-----------|-----------------------------|--------------------------|
| db        | PostgreSQL 18 database      | `localhost:5432`         |
| backend   | Express.js API server       | `http://localhost:3000`  |
| frontend  | React app served by nginx   | `http://localhost:5173`  |

On first run, create the `tasks` table:

```bash
docker compose exec db psql -U postgres -d taskdb -c "CREATE TABLE tasks (id SERIAL PRIMARY KEY, title TEXT NOT NULL);"
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

To stop everything:
```bash
docker compose down
```

To stop **and delete** the database data:
```bash
docker compose down -v
```

---

## Running Services Individually

Useful for testing each Dockerfile on its own.

### Frontend Only

```bash
cd frontend
docker build -t frontend .
docker run -p 5173:80 frontend
```

Open [http://localhost:5173](http://localhost:5173). The UI will load but API calls will fail (no backend running).

### Backend Only (with local Postgres)

If you already have PostgreSQL running on your Mac (from the main README):

```bash
cd backend
docker build -t backend .
docker run -p 3000:3000 -e DATABASE_URL="postgresql://$(whoami):@host.docker.internal:5432/taskdb" backend
```

Test it:
```bash
curl http://localhost:3000/tasks
```

`host.docker.internal` lets the container reach your Mac's localhost.

### Backend Only (with containerized Postgres)

Start the database first:

```bash
docker run -d --name mydb -p 5432:5432 -e POSTGRES_DB=taskdb postgres:18-alpine
```

Create the table:

```bash
docker exec mydb psql -U postgres -d taskdb -c "CREATE TABLE tasks (id SERIAL PRIMARY KEY, title TEXT NOT NULL);"
```

Then start the backend:

```bash
cd backend
docker build -t backend .
docker run -p 3000:3000 -e DATABASE_URL="postgresql://postgres:@mydb:5432/taskdb" --link mydb backend
```

Clean up when done:
```bash
docker stop mydb
docker rm mydb
```

---

## Common Docker Commands

| Command                        | What it does                                      |
|--------------------------------|---------------------------------------------------|
| `docker compose up --build`    | Build images and start all services               |
| `docker compose up -d`         | Start in detached mode (runs in background)       |
| `docker compose down`          | Stop and remove all containers                    |
| `docker compose down -v`       | Same as above, but also deletes database volume   |
| `docker compose logs backend`  | View logs for a specific service                  |
| `docker compose logs -f`       | Follow (tail) logs in real time                   |
| `docker compose ps`            | List running containers                           |
| `docker compose restart backend` | Restart a specific service                      |

---

## Project Structure (Docker files)

```
react-express-pg/
├── docker-compose.yml        # Orchestrates all three services
├── backend/
│   ├── Dockerfile            # Node.js + Express
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile            # Multi-stage: Node build → nginx serve
│   └── .dockerignore
└── DOCKER.md                 # This file
```
