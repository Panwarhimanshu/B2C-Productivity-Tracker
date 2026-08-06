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

## Project Structure

```
Productivity/
├── backend/
│   ├── src/
│   │   ├── config/         # DB & JWT config
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, authorize, validate, error
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # Express routers
│   │   ├── services/       # Export service
│   │   └── utils/          # Helpers
│   ├── scripts/seed.js     # Demo data seeder
│   └── server.js
├── frontend/
│   └── src/
│       ├── api/            # Axios API layer
│       ├── components/     # Reusable UI components
│       ├── context/        # Auth & Theme context
│       ├── pages/          # All page components
│       └── utils/          # Constants & helpers
└── docker-compose.yml
```

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone & Setup

```bash
# Backend
cd backend
cp .env.example .env    # Edit your MONGODB_URI and JWT secrets
npm install
npm run seed            # Seed demo data
npm run dev             # Starts on :5000

# Frontend (new terminal)
cd frontend
npm install
npm run dev             # Starts on :5173
```

### 2. Open in browser
Visit `http://localhost:5173`

## Demo Credentials

| Role      | Email                | Password   |
|-----------|----------------------|------------|
| HOD       | hod@company.com      | Admin@123  |
| Team Lead | tl1@company.com      | Admin@123  |
| Team Lead | tl2@company.com      | Admin@123  |
| RM        | rm1@company.com      | User@123   |
| RM        | rm2@company.com      | User@123   |

## Docker Deployment

```bash
docker-compose up --build -d
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
# MongoDB:  localhost:27017
```

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

## Environment Variables

```env
# Backend .env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/b2c_task_tracker
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
FRONTEND_URL=http://localhost:5173
```

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
