# Attendly - Student Attendance Management System

Node.js + Express + EJS, PostgreSQL on Neon, hosted on Render.

## Run locally
    npm install
    npm run dev          # http://localhost:3000

## Environment variables (.env locally, Environment tab on Render)
| Name | Required | Notes |
|---|---|---|
| DATABASE_URL | yes | Neon connection string |
| SESSION_SECRET | yes | long random text |
| NODE_ENV | on Render | production |
| APP_TZ | optional | default Asia/Kolkata (decides what "today" means) |
| LOW_ATTENDANCE | optional | default 75 (% threshold for warnings) |

## One-time database setup
1. Neon SQL Editor: run `sql/schema.sql` (safe to re-run; adds indexes).
2. `node sql/seed.js` creates the first admin (admin@college.edu / Admin@12345). Change the password under "My account".
3. Optional demo data for screenshots: `node sql/demo.js` (remove later with `node sql/demo.js --clear`).

## Roles
- Admin: everything, including classes, students and users.
- Teacher: dashboard, mark attendance, reports, CSV export, view classes and students.
