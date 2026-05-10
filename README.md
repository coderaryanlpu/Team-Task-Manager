# TaskFlow — Team Task Manager

A full-stack web app for managing projects and tasks across teams, with role-based access control. Built as part of a full-stack assignment.

![Node.js](https://img.shields.io/badge/Node.js-v18+-green) ![Express](https://img.shields.io/badge/Express-4.x-lightgrey) ![React](https://img.shields.io/badge/React-18-blue) ![SQLite](https://img.shields.io/badge/SQLite-3-orange) ![JWT](https://img.shields.io/badge/Auth-JWT-yellow)

---

## Features

- **Authentication** — Signup/Login with JWT tokens, passwords hashed with bcrypt
- **Projects** — Create and manage projects, track progress with completion percentage
- **Tasks** — Create tasks with priority, due date, and assignee; track via Kanban board
- **Role-based access** — Two-tier RBAC (global admin/member + per-project manager/member)
- **Dashboard** — Live stats for your tasks, overdue count, and project overview
- **Team management** — Admin can view all users and change global roles

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Vite |
| Backend | Node.js, Express.js |
| Database | SQLite (via knex query builder) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Styling | Vanilla CSS (custom design system, dark theme) |

---

## Project Structure

```
taskflow/
├── server/
│   ├── index.js              # Express entry point
│   ├── db.js                 # Database setup + seed data
│   ├── middleware/
│   │   └── auth.js           # JWT verification middleware
│   └── routes/
│       ├── auth.js           # POST /api/auth/signup|login
│       ├── projects.js       # CRUD /api/projects
│       ├── tasks.js          # CRUD /api/tasks
│       └── users.js          # GET/PUT /api/users
├── client/
│   └── src/
│       ├── api/client.js     # Fetch wrapper with auto JWT
│       ├── context/AuthContext.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Projects.jsx
│       │   ├── ProjectDetail.jsx  # Kanban board
│       │   └── Team.jsx
│       └── components/
│           └── Layout.jsx    # Sidebar + outlet
├── package.json
└── .gitignore
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- npm

### 1. Clone the repo

```bash
git clone https://github.com/coderaryanlpu/Team-Task-Manager.git
cd Team-Task-Manager
```

### 2. Install backend dependencies

```bash
npm install
```

### 3. Start the backend

```bash
npm run dev
# server starts at http://localhost:3000
# demo data is seeded automatically on first run
```

### 4. Install and start the frontend (separate terminal)

```bash
cd client
npm install
npm run dev
# React app at http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Demo Accounts

Seeded automatically on first run:

| Role | Email | Password |
|---|---|---|
| Admin | admin@demo.com | admin123 |
| Member | jordan@demo.com | member123 |
| Member | casey@demo.com | member123 |

---

## API Endpoints

All routes except `/api/auth/*` require `Authorization: Bearer <token>` header.

### Auth
```
POST /api/auth/signup    { name, email, password, role }
POST /api/auth/login     { email, password }
```

### Projects
```
GET    /api/projects           list all (admin) or user's projects
POST   /api/projects           create project [admin only]
GET    /api/projects/:id       project detail + members
PUT    /api/projects/:id       update project [admin or manager]
DELETE /api/projects/:id       delete project [admin only]
POST   /api/projects/:id/members   add a member
DELETE /api/projects/:id/members/:uid  remove a member
```

### Tasks
```
GET    /api/tasks              my tasks (no project_id param)
GET    /api/tasks?project_id=X all tasks in a project
POST   /api/tasks              create task
PUT    /api/tasks/:id          update task
DELETE /api/tasks/:id          delete task
```

### Users
```
GET    /api/users              list all users
PUT    /api/users/:id/role     change user role [admin only]
```

---

## Role-Based Access Control

### Global Roles (on `users` table)

| Action | Admin | Member |
|---|---|---|
| Create / delete project | ✅ | ❌ |
| View all projects | ✅ | ❌ |
| View team page | ✅ | ❌ |
| Change user roles | ✅ | ❌ |

### Project Roles (on `project_members` table)

| Action | Manager | Member |
|---|---|---|
| Add/remove members | ✅ | ❌ |
| Assign task to others | ✅ | ❌ |
| Create & edit any task | ✅ | ❌ |
| Update own task status | ✅ | ✅ |

---

## Database Schema

```sql
users           id, name, email, password, role, created_at
projects        id, name, description, owner_id, status, created_at
project_members project_id, user_id, role          ← junction table
tasks           id, title, description, project_id, assigned_to,
                created_by, status, priority, due_date, created_at
```

---

## Deploying to Railway

1. Push this repo to GitHub
2. Create a new project on [railway.app](https://railway.app) → Deploy from GitHub
3. Set environment variables:
   ```
   JWT_SECRET=your_secret_here
   NODE_ENV=production
   ```
4. Set build/start commands in Railway settings:
   ```
   Build:  npm run build
   Start:  npm start
   ```

Railway injects `PORT` automatically. Express serves both the API and the React build from a single process.

---

## Future Improvements

- PostgreSQL for production (knex supports it — just swap the client config)
- Email verification + password reset via Nodemailer
- Real-time task updates with WebSockets
- Drag and drop on the Kanban board
- File attachments on tasks
- Activity log / audit trail
