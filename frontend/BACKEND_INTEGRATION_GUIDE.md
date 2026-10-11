# Backend Integration & Team Developer Guide
**NeuroForge SDLC Project Management Platform**
*Target: Spring Boot 3.x / Java 17+ / PostgreSQL or MySQL*

> **STATUS OVERVIEW**:
> - ✅ **Authentication & Session Management**: Fully implemented & active.
> - ✅ **Live User Presence & Status Transitions**: Fully implemented in `UserController` (`PATCH /api/users/{id}/status`) and `User` entity (`availabilityStatus`).
> - ✅ **Task & Subtask Status Transitions**: Fully implemented in `TaskController` (`PATCH /api/tasks/{id}/status`) and `SubtaskController` (`PATCH /api/subtasks/{id}/status`).
> - ✅ **Teams & Project Member Allocations**: Fully implemented in `TeamController` and `ProjectController`.
> - ✅ **AI Assistant SDLC Chatbot**: Fully implemented in `ChatController` (`POST /api/chat`).
> - ✅ **Calendar & Meeting Scheduling Events**: Fully implemented in `CalendarController` (`/api/calendar`).
> - ✅ **DevOps & CI/CD Pipelines UI**: Fully implemented in frontend (`ProjectWorkspace.jsx` -> `DevOpsPipelineView.jsx`) with live telemetry, trigger controls, and Railway environment health cards.
> - ✅ **Codebase Integration Points**: All 65 frontend integration comments have been cleaned up and verified.

---

## Table of Contents
1. [Team Member Quick Start (Frontend)](#1-team-member-quick-start-frontend)
2. [Completed Backend Architecture & Endpoints](#2-completed-backend-architecture--endpoints)
   - [A. User Status & Presence Integration](#a-user-status--presence-integration)
   - [B. Task & Subtask Status Transition APIs](#b-task--subtask-status-transition-apis)
   - [C. Complete REST API Reference](#c-complete-rest-api-reference)
3. [DevOps & CI/CD Module Backend Specification](#3-devops--cicd-module-backend-specification)
4. [Railway Cloud Deployment & Production Configuration](#4-railway-cloud-deployment--production-configuration)
5. [Database Migration](#5-database-migration)
6. [cURL Verification Commands](#6-curl-verification-commands)
7. [Frontend Integration Points Cleanup Status](#7-frontend-integration-points-cleanup-status)

---

## 1. Team Member Quick Start (Frontend)

To run the frontend and verify the exact UI on any team member's machine:

```bash
# 1. Pull the latest code
git checkout feature/ui-and-feature-advancement
git pull origin feature/ui-and-feature-advancement

# 2. Navigate to frontend directory and install dependencies
cd frontend
npm install

# 3. Start the Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser.
- **Offline / Standalone Ready**: If the Spring Boot backend is not running or has an empty database, the frontend automatically hydrates with seed projects, tasks, subtasks, and users.
- **Theme Switching**: Toggle between dark and light themes using the navbar sun/moon toggle.
- **Kanban & Subtask Views**: Seamlessly switch between **Cards**, **Timeline**, and **List** views.
- **AI Assistant Drawer**: Pinned floating trigger in the bottom-right corner sliding in as a right drawer with meeting scheduling and calendar synchronization.

---

## 2. Completed Backend Architecture & Endpoints

### A. User Status & Presence Integration (✅ Completed)
The backend already supports dynamic presence updates for the team:
- **Entity**: `User.java` natively contains `availabilityStatus` (`"Active"`, `"In Meeting"`, `"Offline"`).
- **Endpoint**: `PATCH /api/users/{id}/status`
- **Request DTO**: `StatusUpdateRequest` containing `{ active: boolean, status: string }`
- **Response**: `UserResponse` with updated profile and status.

### B. Task & Subtask Status Transition APIs (✅ Completed)
Kanban drag-and-drop and status dropdowns are natively supported:
- **Task Status**: `PATCH /api/tasks/{id}/status`
  - Accepts `{ status: "To Do" | "In Progress" | "In Review" | "Done" }`
  - Role-protected: Developers can update their own tasks; Leads/Managers can update project tasks.
- **Subtask Status**: `PATCH /api/subtasks/{subtaskId}/status`
  - Accepts `{ status: "To Do" | "In Progress" | "In Review" | "Ready for Testing" | "In Testing" | "In QA" | "Done" }`

---

### C. Complete REST API Reference

All endpoints connect under `http://localhost:8080/api`.

#### 1. Authentication & Session (`/api/auth`)
| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/me` | Fetch authenticated user | ✅ Implemented |
| `POST` | `/signup` | Register new user | ✅ Implemented |
| `POST` | `/login` | Authenticate credentials | ✅ Implemented |
| `POST` | `/logout` | Invalidate token/session | ✅ Implemented |
| `DELETE` | `/api/users/me` | Self-service account delete | ✅ Implemented |

#### 2. Projects (`/api/projects`)
| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | List all accessible projects | ✅ Implemented |
| `POST` | `/` | Create a project, including an optional GitHub repository URL | ✅ Implemented |
| `PUT` | `/{id}` | Update project fields and its optional GitHub repository URL | ✅ Implemented |
| `PATCH` | `/{id}/status` | Update project status only | ✅ Implemented |
| `DELETE` | `/{id}` | Delete project & cascade | ✅ Implemented |
| `GET` | `/{projectId}/members` | List project team members | ✅ Implemented |
| `POST` | `/{projectId}/members` | Add member to project | ✅ Implemented |
| `PUT` | `/{projectId}/members/{userId}` | Update project role | ✅ Implemented |
| `PATCH` | `/{projectId}/members/{userId}/status` | Update member status | ✅ Implemented |
| `DELETE` | `/{projectId}/members/{userId}` | Remove member from project | ✅ Implemented |

#### 3. Tasks & Subtasks (`/api/tasks` & `/api/subtasks`)
| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks` | Get all tasks | ✅ Implemented |
| `GET` | `/api/tasks/{taskId}/subtasks` | Get subtasks for parent task | ✅ Implemented |
| `POST` | `/api/tasks` | Create parent task | ✅ Implemented |
| `PATCH` | `/api/tasks/{taskId}/status` | Update task status (Kanban / Execution roles) | ✅ Implemented |
| `PUT` | `/api/tasks/{id}` | Full update (Admin / Project Manager) | ✅ Implemented |
| `DELETE` | `/api/tasks/{taskId}` | Delete parent task | ✅ Implemented |
| `POST` | `/api/tasks/{taskId}/subtasks` | Create subtask under task | ✅ Implemented |
| `PATCH` | `/api/subtasks/{subtaskId}/status` | Update subtask status | ✅ Implemented |
| `PUT` | `/api/subtasks/{subtaskId}` | Full update of subtask | ✅ Implemented |
| `DELETE` | `/api/subtasks/{subtaskId}` | Delete subtask | ✅ Implemented |

#### 4. Users & Presence (`/api/users`)
| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | All users (Admin only) | ✅ Implemented |
| `GET` | `/options` | Assignable users (Managers/Leads) | ✅ Implemented |
| `POST` | `/` | Admin create user | ✅ Implemented |
| `PUT` | `/{id}` | Update user details | ✅ Implemented |
| `PATCH` | `/{id}/role` | Update user role | ✅ Implemented |
| `PATCH` | `/{id}/status` | Update active status | ✅ Implemented |
| `PUT` | `/me` | Update the authenticated user's profile fields (not role/password) | ✅ Implemented |
| `GET` | `/{id}/profile` | Comprehensive profile | ✅ Implemented |
| `DELETE` | `/{id}` | Delete user (Admin only) | ✅ Implemented |

#### 5. Teams (`/api/teams`)
| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/teams` | List organizational teams | ✅ Implemented |
| `GET` | `/api/teams/{id}/members` | List members of a team | ✅ Implemented |
| `POST` | `/api/teams` | Create organizational team | ✅ Implemented |
| `PUT` | `/api/teams/{id}` | Update team | ✅ Implemented |
| `DELETE` | `/api/teams/{id}` | Delete team | ✅ Implemented |

#### 6. AI Assistant Query (`/api/chat`)
| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/chat` | AI assistant query for projects, tasks & calendar | ✅ Implemented |

#### 7. Bug Reports (`/api/bugs`)
| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bugs` | List bugs in accessible projects | ✅ Implemented |
| `POST` | `/api/bugs` | Create a persistent bug report | ✅ Implemented |
| `PUT` | `/api/bugs/{id}` | Update bug details | ✅ Implemented |
| `PATCH` | `/api/bugs/{id}/status` | Update status and retest result | ✅ Implemented |
| `PATCH` | `/api/bugs/{id}/assignment` | Assign a bug within the project | ✅ Implemented |
| `GET` | `/api/bugs/{id}/comments` | Read persisted bug comments | ✅ Implemented |
| `POST` | `/api/bugs/{id}/comments` | Add a persisted comment | ✅ Implemented |
| `GET` | `/api/bugs/{id}/activity` | Read persisted activity history | ✅ Implemented |
| `POST` | `/api/bugs/{id}/summary` | Generate an AI summary for an accessible bug | ✅ Implemented |
| `DELETE` | `/api/bugs/{id}` | Delete a bug report | ✅ Implemented |

#### 8. Calendar & Scheduling Events (`/api/calendar`)
| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/calendar` | List user visible calendar events | ✅ Implemented |
| `GET` | `/api/calendar/{id}` | Get event details | ✅ Implemented |
| `GET` | `/api/calendar/project/{projectId}` | Get project calendar events | ✅ Implemented |
| `POST` | `/api/calendar` | Create calendar/meeting event | ✅ Implemented |
| `PUT` | `/api/calendar/{id}` | Update calendar event | ✅ Implemented |
| `PATCH` | `/api/calendar/{id}/date` | Reschedule event date/time | ✅ Implemented |
| `PATCH` | `/api/calendar/{id}/status` | Update event status | ✅ Implemented |
| `DELETE` | `/api/calendar/{id}` | Delete calendar event | ✅ Implemented |

---

## 3. DevOps & CI/CD Module Backend Specification

The frontend has implemented the **DevOps & CI/CD** tab in `ProjectWorkspace.jsx` (`DevOpsPipelineView.jsx`). When connected, the frontend sends requests to the following endpoints under `/api/projects/{projectId}/...`.

> **Note**: The frontend includes built-in offline/mock fallback for all these endpoints, so it continues to function smoothly with realistic telemetry even before the backend team implements them.

### A. Endpoints Overview

| Method | Endpoint | Description | Authorized Roles | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/projects/{projectId}/pipelines` | List pipeline runs for the project | All project members | ⏳ Pending Backend Implementation |
| `POST` | `/api/projects/{projectId}/pipelines/trigger` | Trigger a new build / pipeline run | `ADMIN`, `PROJECT_MANAGER`, `PROJECT_LEAD`, or Skill `DEVOPS` | ⏳ Pending Backend Implementation |
| `GET` | `/api/projects/{projectId}/environments` | List deployment environments & health status | All project members | ⏳ Pending Backend Implementation |

---

### B. Detailed Contracts & DTOs

#### 1. GET `/api/projects/{projectId}/pipelines`
Fetches recent CI/CD pipeline runs for the project.

**Response `200 OK`**:
```json
[
  {
    "id": 101,
    "commit": "73610ae",
    "commitMessage": "fix(backend): restore local H2 database defaults and add railway profile",
    "branch": "main",
    "status": "SUCCESS",
    "duration": "2m 14s",
    "triggeredBy": "System Admin",
    "createdAt": "25 minutes ago",
    "steps": [
      { "name": "Code Checkout & Git Sync", "duration": "8s", "status": "SUCCESS" },
      { "name": "Maven Build & Compile", "duration": "42s", "status": "SUCCESS" },
      { "name": "Unit & Integration Tests", "duration": "35s", "status": "SUCCESS" },
      { "name": "Static Security & Vulnerability Scan", "duration": "16s", "status": "SUCCESS" },
      { "name": "Docker Image Build & Push", "duration": "21s", "status": "SUCCESS" },
      { "name": "Railway Cloud Deployment", "duration": "12s", "status": "SUCCESS" }
    ]
  }
]
```
- **Allowed `status` values**: `"SUCCESS"` (green badge), `"RUNNING"` (blue spinning badge), `"FAILED"` (red badge), `"CANCELED"` (gray badge).

#### 2. POST `/api/projects/{projectId}/pipelines/trigger`
Dispatches a new CI/CD pipeline build for a specific branch and environment.

**Request Body**:
```json
{
  "branch": "main",
  "environment": "Production",
  "commitMessage": "Manual deployment trigger from workspace"
}
```

**Response `201 Created`**:
```json
{
  "id": 105,
  "commit": "head-hash",
  "commitMessage": "Manual deployment trigger from workspace",
  "branch": "main",
  "status": "RUNNING",
  "duration": "0m 05s",
  "triggeredBy": "Suravi Ghosh",
  "createdAt": "Just now",
  "steps": [
    { "name": "Code Checkout & Git Sync", "duration": "3s", "status": "SUCCESS" },
    { "name": "Maven Build & Compile", "duration": "--", "status": "RUNNING" },
    { "name": "Quality Gate & Testing", "duration": "--", "status": "PENDING" },
    { "name": "Deploy to Production", "duration": "--", "status": "PENDING" }
  ]
}
```

#### 3. GET `/api/projects/{projectId}/environments`
Retrieves live telemetry and health status for target deployment environments.

**Response `200 OK`**:
```json
[
  {
    "name": "Production",
    "status": "UP",
    "healthStatus": "Healthy",
    "url": "https://neuroforge-prod.up.railway.app",
    "version": "v1.2.0",
    "commit": "944464f",
    "lastDeployed": "Today at 18:42",
    "uptime": "99.98%",
    "branch": "main"
  },
  {
    "name": "Staging / QA",
    "status": "UP",
    "healthStatus": "Healthy",
    "url": "https://neuroforge-staging.up.railway.app",
    "version": "v1.2.1-rc",
    "commit": "ca5d23d",
    "lastDeployed": "Today at 21:15",
    "uptime": "100%",
    "branch": "develop"
  }
]
```

---

## 4. Railway Cloud Deployment & Production Configuration

We are using **Railway** (`railway.app`) for backend and MySQL deployment. Follow these exact instructions for a seamless setup:

### A. Dedicated Railway Spring Profile
The backend has a dedicated Spring profile configuration file:
`backend/src/main/resources/application-railway.properties`

To activate this profile on Railway, set this environment variable in your Railway service dashboard:
```properties
SPRING_PROFILES_ACTIVE=railway
```

### B. Railway MySQL Environment Variables
In Railway, when connecting the Spring Boot service to the Railway MySQL plugin, configure these variables in the **Variables** tab of the backend service:

| Variable Name | Recommended Railway Value | Description |
| :--- | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | `railway` | Activates the Railway profile |
| `DB_URL` | `jdbc:mysql://${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQLDATABASE}}` | Railway internal MySQL connection string |
| `DB_DRIVER` | `com.mysql.cj.jdbc.Driver` | MySQL JDBC Driver |
| `DB_USERNAME` | `${{MySQL.MYSQLUSER}}` | Railway MySQL username |
| `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` | Railway MySQL password |
| `HIBERNATE_DDL_AUTO` | `update` | Automatically creates and updates schema on deploy |
| `JWT_SECRET` | *(Random 32+ character string)* | Secret for signing JWT tokens |
| `ADMIN_PASSWORD` | *(Secure admin password)* | Bootstrap admin password |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,https://your-frontend.railway.app,https://your-frontend.vercel.app` | Allowed frontend domains (comma-separated) |

> [!IMPORTANT]
> **Never replace the local defaults** in `application.properties` with `mysql.railway.internal`. `mysql.railway.internal` only resolves inside Railway's private network. Using `application-railway.properties` or environment variables guarantees that **both** local development and Railway cloud deployment function without conflict.

### C. Frontend Production Deployment Configuration
1. **API Base URL**: The frontend connects to the backend using `VITE_API_BASE`.
   In `frontend/.env.production` (or your cloud platform's environment variables dashboard):
   ```properties
   VITE_API_BASE=https://your-backend-service.up.railway.app/api
   ```
2. **SPA Routing**:
   - `frontend/public/_redirects` is provided for Netlify deployment (`/*    /index.html   200`).
   - `frontend/vercel.json` is provided for Vercel deployment with route rewrites.

---

## 5. Database migration

The setup script creates the current schema without dropping existing data. For an
existing installation, run `backend/src/main/resources/db/V2__calendar_bug_repository_persistence.sql`
against the `neuroforge` database before deploying a backend build that uses the
calendar, bug-report comments/activity, or project repository persistence.

---

## 6. cURL Verification Commands

Backend developers can test the implemented endpoints directly:

### 1. Update User Live Status
```bash
curl -X PATCH http://localhost:8080/api/users/1/status \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"In Meeting","active":true}'
```

### 2. Update Parent Task Status (Kanban Drag & Drop)
```bash
curl -X PATCH http://localhost:8080/api/tasks/1/status \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"In Progress"}'
```

### 3. Update Subtask Status
```bash
curl -X PATCH http://localhost:8080/api/subtasks/101/status \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"In Review"}'
```

### 4. Fetch Project Pipeline Runs
```bash
curl -X GET http://localhost:8080/api/projects/1/pipelines \
  -H "Authorization: Bearer <TOKEN>"
```

### 5. Trigger Project Pipeline Run
```bash
curl -X POST http://localhost:8080/api/projects/1/pipelines/trigger \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"branch":"main","environment":"Production","commitMessage":"Sprint release v1.2"}'
```

### 6. Fetch Project Environments Health
```bash
curl -X GET http://localhost:8080/api/projects/1/environments \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 7. Frontend Integration Points Cleanup Status

All **65 `[BACKEND_INTEGRATION_POINT]` comments** across the 18 frontend files have been cleaned up:
- `npm run clean:comments` executed successfully.
- Frontend build compiled and verified with 0 errors via `npm run build`.
