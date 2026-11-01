# AICTE SmartApproval — Two Independent Portals Architecture

## System Overview

AICTE SmartApproval is decoupled into **two independent frontend applications** connected to **one shared FastAPI backend** and **one shared MySQL 8.0 database**:

```text
┌───────────────────────────────────────────────┐     ┌───────────────────────────────────────────────┐
│              Institution Portal               │     │                Reviewer Portal                │
│           (apps/institution-portal)           │     │            (apps/reviewer-portal)             │
│            http://localhost:5173              │     │             http://localhost:5174             │
│            http://127.0.0.1:5173              │     │             http://127.0.0.1:5174             │
│         https://institution.example.com       │     │          https://reviewer.example.com         │
└───────────────────────┬───────────────────────┘     └───────────────────────┬───────────────────────┘
                        │                                                     │
                        │ JWT Bearer (Role: institution)                      │ JWT Bearer (Role: reviewer)
                        ▼                                                     ▼
              ┌───────────────────────────────────────────────────────────────────────────────────────────┐
              │                               Shared FastAPI Backend                                      │
              │                     http://localhost:8000 / https://api.example.com                       │
              │                                                                                           │
              │  [Auth & RBAC] [Applications State Machine] [Digital Twin & Simulator] [Compliance Engine]│
              │  [Cross-Doc Consistency] [PyMuPDF Verification] [SLA Early-Warning] [SHA-256 Audit Trail]│
              └─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                                            │
                                                            │ SQLAlchemy Connection Pool
                                                            ▼
                                            ┌───────────────────────────────┐
                                            │    Shared MySQL 8 Database    │
                                            │     (aicte_smartapproval)     │
                                            └───────────────────────────────┘
```

## Deployment Port & Origin Matrix

| Application | Local Port / Origin | Production Domain Example | Primary Persona / Role |
| :--- | :--- | :--- | :--- |
| **Institution Portal** | `http://localhost:5173`<br>`http://127.0.0.1:5173` | `https://institution.example.com` | Institutional Signatories & Applicants (`institution`) |
| **Reviewer Portal** | `http://localhost:5174`<br>`http://127.0.0.1:5174` | `https://reviewer.example.com` | AICTE Scrutiny Officers & Committees (`reviewer`) |
| **FastAPI Backend** | `http://localhost:8000`<br>`http://127.0.0.1:8000` | `https://api.example.com` | Shared Statutory REST Engine (`/api`, `/docs`) |
| **MySQL 8.0 Database** | `localhost:3306` | Internal VPC / Cluster | Persistent ACID Storage (`aicte_smartapproval`) |

> **No Administrator Portal Frontend**: The frontend architecture strictly consists of the two independent portals above (`apps/institution-portal` and `apps/reviewer-portal`). `apps/admin-portal` does not exist and is not deployed.

## Explicit CORS Configuration

Cross-Origin Resource Sharing (CORS) is enforced by the FastAPI backend using explicit, whitelisted origins for localhost and 127.0.0.1 across both portal ports:

```python
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://institution.example.com",
    "https://reviewer.example.com",
    "https://api.example.com"
]
```

## Independent Portal Boundaries

1. **Independent Builds & Configurations**: Each portal maintains its own `package.json`, `vite.config.ts`, TypeScript configuration (`tsconfig.json`), dependencies, and isolated build output in `apps/<portal-name>/dist/`.
2. **Dedicated Entrypoints & Routers**: Each portal features its own `index.html`, `main.tsx`, and `App.tsx` routing hierarchy.
3. **Dedicated Login Experiences**:
   - `apps/institution-portal` serves only the institutional sign-in experience on `http://localhost:5173/login`.
   - `apps/reviewer-portal` serves only the scrutiny officer sign-in experience on `http://localhost:5174/login`.
   - Cross-portal authentication attempts are strictly blocked by the backend with HTTP `403 Forbidden`.
4. **Zero Cross-Portal Links**: Neither portal contains navigation selectors or links into the other portal's private workspaces.

## Restricted Administrative Maintenance Procedure

Because the user-facing frontend is strictly partitioned into the two portals, platform administrative functions do not have a frontend UI. Instead, authorized administrators execute maintenance tasks via secure, restricted backend procedures:

1. **RBAC Isolation Guarantee**:
   - Institution users and scrutiny reviewers are strictly restricted to their own authorized scopes.
   - Any attempt by non-admin roles to access `/api/users`, configure rules, or execute chain audits is unconditionally rejected by backend middleware with HTTP `403 Forbidden`.
2. **Secure Maintenance CLI / Direct API Authentication**:
   - Authorized system administrators authenticate directly against the shared FastAPI backend via `POST /api/auth/login` using administrative credentials.
   - The resulting JWT bearer token grants access to administrative maintenance endpoints:
     - `GET /api/users` & `POST /api/users`: User provisioning and account status management.
     - `POST /api/audit/verify-chain`: Verification of the SHA-256 cryptographic hash-chain audit ledger.
     - `GET /api/compliance/rules` & `POST /api/compliance/rules`: Statutory rule inspection and updates.
   - These tasks can be performed through the interactive API documentation at `http://127.0.0.1:8000/docs` (restricted to internal networks) or automated server-side management scripts.
3. **Database Records & Audit History Invariance**:
   - All administrative database tables, user records (including the administrative persona `admin@aicte.gov.in`), statutory rules, and audit logs remain fully intact and operational in the shared MySQL database.
