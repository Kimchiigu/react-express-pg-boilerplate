# React + Express + PostgreSQL

A simple full-stack task manager app with:

- **Frontend** — Vite + React
- **Backend** — Express.js
- **Database** — PostgreSQL 18

---

## Clone this Repository

```bash
git clone https://github.com/Kimchiigu/react-express-pg-boilerplate.git
```

If you fork this repository, then change the username to your GitHub username

```bash
git clone https://github.com/<username>/react-express-pg-boilerplate.git
```

## Prerequisites

Make sure you have **Homebrew** installed. If not, run this in Terminal:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

---

## Step 1 — Install PostgreSQL

```bash
brew install postgresql@18
brew services start postgresql@18
```

Verify it's running:

```bash
psql postgres
```

If you see a `postgres=#` prompt, it's working. Type `\q` to exit.

Notes:
```bash
\l # list all available database
\c <database_name # connect to selected database
\dt # list all available table (must connect to db first)
```

---

## Step 2 — Create the Database

Open the PostgreSQL prompt:

```bash
psql postgres
```

Then run these commands one by one:

```sql
CREATE DATABASE taskdb;
\c taskdb

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL
);

-- Optional (Add task manually)
INSERT INTO tasks (title) VALUES ('Buy Milk'), ('Go to Gym');
```

Type `\q` to exit.

---

## Step 3 — Set Up the Backend

```bash
cd backend
npm install
```

Create your `.env` file by copying the example:

```bash
cp .env.example .env
```

Open `.env` and replace the placeholders:

```
DATABASE_URL=postgresql://<your_mac_username>:@localhost:5432/taskdb
```

To find your Mac username, run:

```bash
whoami
```

So if your username is `john`, your `.env` would look like:

```
DATABASE_URL=postgresql://john:@localhost:5432/taskdb
```

> **Note:** We leave the password blank because PostgreSQL on Mac uses local trust authentication by default.

Start the backend server:

```bash
npm start
```

You should see: `Backend running on port 3000`

---

## Step 4 — Set Up the Frontend

Open a **new Terminal tab** (`Cmd + T`) and run:

```bash
cd frontend
npm install
npm run dev
```

It will print a local URL like `http://localhost:5173` — open it in your browser.

---

## Project Structure

```
react-express-pg/
├── frontend/          # Vite + React app
│   ├── src/           # React components
│   └── package.json
├── backend/           # Express.js API server
│   ├── index.js       # API routes (GET/POST /tasks)
│   ├── .env.example   # Database config template
│   └── package.json
└── README.md
```

---

## API Endpoints

| Method | Endpoint     | Description       |
|--------|-------------|-------------------|
| GET    | `/tasks`    | Get all tasks     |
| POST   | `/tasks`    | Create a new task |

POST body example:
```json
{ "title": "Learn React" }
```
