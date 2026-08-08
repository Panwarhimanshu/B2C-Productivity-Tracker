# B2C Daily Task Tracking System

A production-ready, login-based task tracking web application for B2C teams.

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18 + Vite + Tailwind CSS      |
| Backend    | Node.js + Express                   |
| Database   | MongoDB + Mongoose                  |
| Auth       | JWT (access + refresh tokens)       |
| Charts     | Recharts                            |
| Export     | ExcelJS                             |

## Roles

| Role      | Access Level  | Description                                      |
|-----------|--------------|--------------------------------------------------|
| RM        | Normal User  | Submit daily reports, view personal performance  |
| TEAM_LEAD | Admin        | View & edit team reports, team analytics         |
| HOD       | Super Admin  | Full access, user/zone management, all reports   |

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)


## API Endpoints

### Auth
| Method | Endpoint            | Description          |
|--------|---------------------|----------------------|
| POST   | /api/auth/login     | Login                |
| POST   | /api/auth/refresh   | Refresh access token |
| POST   | /api/auth/logout    | Logout               |
| GET    | /api/auth/me        | Get current user     |

### Users (HOD/TEAM_LEAD)
| Method | Endpoint                | Description       |
|--------|-------------------------|-------------------|
| GET    | /api/users              | List users        |
| POST   | /api/users              | Create user (HOD) |
| PUT    | /api/users/:id          | Update user (HOD) |
| PATCH  | /api/users/:id/hide     | Deactivate (HOD)  |
| PATCH  | /api/users/:id/reactivate | Reactivate (HOD)|

### Reports
| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| POST   | /api/reports          | Submit report (RM)   |
| GET    | /api/reports/my       | My reports (RM)      |
| GET    | /api/reports/team     | Team reports (TL)    |
| GET    | /api/reports/all      | All reports (HOD)    |
| PUT    | /api/reports/:id      | Edit report          |
| GET    | /api/reports/analytics| Analytics data       |
| GET    | /api/reports/export   | Export to Excel      |
| GET    | /api/reports/template | Get form template    |

### Zones (HOD)
| Method | Endpoint       | Description    |
|--------|----------------|----------------|
| GET    | /api/zones     | List zones     |
| POST   | /api/zones     | Create zone    |
| PUT    | /api/zones/:id | Update zone    |
| DELETE | /api/zones/:id | Deactivate zone|


## Key Features

- **JWT Auth** with auto-refresh token flow (transparent to user)
- **RBAC** enforced on both frontend routes and backend API
- **Dynamic form system** — fields configurable via FormTemplate model
- **Duplicate prevention** — one report per user per day
- **Soft delete** for users (isActive flag, data preserved)
- **Excel export** for reports
- **Audit log** on report modifications
- **Dark/light theme** toggle
- **Recharts** analytics with area & bar charts
- **Pagination** on all listing pages
