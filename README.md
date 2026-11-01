# AICTE SmartApproval — Two Independent Portals

> **Integrated AICTE Approval Workflow Automation, Compliance Monitoring and Alert Management System**  
> *Decoupled Monorepo Architecture: Two Independent Frontends, One Shared FastAPI Backend, One Shared MySQL Database*

---

## 🌟 Architecture Overview

AICTE SmartApproval is decoupled into **two independent frontend applications**, each with its own package configuration, dedicated login experience, role-based dashboard, and deployment URL. Both portals communicate with **one shared FastAPI backend** and **one shared MySQL 8.0 database**:

```text
AICTE-SmartApproval/
│
├── apps/
│   ├── institution-portal/       # Port 5173 - https://institution.example.com
│   │   ├── src/                  # Institutional UI, What-If Simulator, Document Centre
│   │   ├── public/               # Public assets
│   │   ├── package.json          # Independent build & dependencies
│   │   ├── vite.config.ts        # Dev server on port 5173
│   │   ├── .env.example          # VITE_API_BASE_URL configuration
│   │   └── README.md
│   │
│   └── reviewer-portal/          # Port 5174 - https://reviewer.example.com
│       ├── src/                  # Dual-Pane Workbench, Cross-Doc Consistency Intelligence
│       ├── public/               # Public assets
│       ├── package.json          # Independent build & dependencies
│       ├── vite.config.ts        # Dev server on port 5174
│       ├── .env.example          # VITE_API_BASE_URL configuration
│       └── README.md
│
├── backend/                      # Port 8000 - https://api.example.com
│   ├── app/                      # Shared FastAPI statutory engine
│   │   ├── api/                  # REST API endpoints for all portals & maintenance
│   │   ├── core/                 # Config & database connection pool
│   │   ├── middleware/           # Audit & latency middleware
│   │   ├── models/               # SQLAlchemy models (MySQL 8 InnoDB)
│   │   ├── repositories/         # Database access abstractions
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── security/             # JWT authentication & password hashing
│   │   ├── seed/                 # Demonstration database seeder
│   │   ├── services/             # Digital Twin, What-If Simulator, OCR, PyMuPDF, Audit chain
│   │   ├── tasks/                # SLA deadline monitoring workers
│   │   └── main.py
│   ├── tests/                    # Pytest test suite & E2E verification
│   ├── alembic/                  # Alembic database schema migrations
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── shared/
│   ├── api-contracts/            # OpenAPI 3.0 specification (`openapi.json`)
│   └── documentation/            # Architecture, RBAC security policy, innovations guide
│
├── docker-compose.yml            # Multi-container orchestration (MySQL + Backend + 2 Portals)
├── package.json                  # Root monorepo orchestration
└── README.md
```

---

## 🚀 Portals, Deployment URLs & Credentials

| Portal | Local URL / Origin | Example Production Domain | Primary Persona | Demo Login Account |
| :--- | :--- | :--- | :--- | :--- |
| **Institution Portal** | `http://localhost:5173`<br>`http://127.0.0.1:5173` | `https://institution.example.com` | Higher Education Signatories & Applicants | `institution@greenfield.edu` / `password123` |
| **Reviewer Portal** | `http://localhost:5174`<br>`http://127.0.0.1:5174` | `https://reviewer.example.com` | AICTE Scrutiny Officers & Committees | `reviewer@aicte.gov.in` / `password123` |
| **Shared Backend API** | `http://localhost:8000`<br>`http://127.0.0.1:8000` | `https://api.example.com` | Shared Statutory REST Engine | Swagger Docs at `/docs` |
| **MySQL 8 Database** | `localhost:3306` | Internal VPC / Cluster | Persistent Storage | Database: `aicte_smartapproval` |

> **Strict Portal Access Control**: Each portal features an independent login page and isolated workspace. If an institution user tries to log in on the Reviewer portal, the backend validates the account role against MySQL records and rejects the attempt with HTTP 403 Forbidden, directing the user to their designated portal. Neither portal permits access to administrative privileges.

---

## 🌟 Preserved Innovations

1. **AICTE Approval Digital Twin**: Live mathematical readiness score (0–100) based on APH 2026-27 norms, documents, and unresolved findings.
2. **Interactive What-If Simulator**: Simulation sandbox projecting score deltas for hypothetical actions without mutating persistent records.
3. **Cross-Document Consistency Intelligence**: Side-by-side comparative inspection highlighting cross-document contradictions (e.g. faculty count vs audited financials).
4. **AI-Assisted Document Verification**: Fitz/PyMuPDF text extraction, SHA-256 integrity hashing, and regex field extraction.
5. **Compliance Monitoring Engine**: Explainable statutory checks, severity classification, and evidence citations.
6. **Approval Delay Early-Warning Engine**: SLA milestone tracker classifying deadlines into On Track, Approaching, and Overdue.
7. **Evidence-First Compliance Copilot / Policy Assistant**: Grounded statutory citations for APH guidelines.
8. **Alert Management**: Real-time persistent notifications, unread counts, and priority levels.
9. **Tamper-Evident SHA-256 Cryptographic Hash Chain Audit Trail**: Append-only hash chain with 1-click mathematical verification endpoint.

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+ (tested with Python 3.12)
- MySQL 8.0 running on `localhost:3306` (or fallback to local SQLite)

### 1. Start the Shared FastAPI Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Run migrations
alembic current

# Start backend server
python run.py
```
> FastAPI will start at: **http://127.0.0.1:8000**  
> OpenAPI documentation: **http://127.0.0.1:8000/docs**

### 2. Start the Two Independent Portals

From the root directory, install portal dependencies:
```powershell
npm install
```

Run either portal independently:

#### Institution Portal (Port 5173):
```powershell
# In terminal 1:
cd apps/institution-portal
npm run dev
# Or from root:
npm run dev:institution
```

#### Reviewer Portal (Port 5174):
```powershell
# In terminal 2:
cd apps/reviewer-portal
npm run dev
# Or from root:
npm run dev:reviewer
```

---

## 🛡️ Restricted Administrative Maintenance Procedure

In accordance with the two-portal architecture, **no Administrator Portal frontend application exists**. Platform administration and security management are performed strictly through restricted backend procedures:

1. **Privilege Boundary**:
   - Institution applicants and scrutiny reviewers cannot gain administrative access. Attempting to query admin-only endpoints returns HTTP `403 Forbidden`.
2. **Administrative Records Preservation**:
   - All admin database records, user tables, audit history, and statutory rule repositories are fully preserved in MySQL and FastAPI.
3. **Executing Administrative Tasks**:
   - Authorized administrators authenticate against `POST /api/auth/login` using administrative credentials (`admin@aicte.gov.in` / `password123`).
   - Using the returned JWT bearer token, administrators perform maintenance via curl, Python CLI scripts, or secure Swagger UI (`http://127.0.0.1:8000/docs`):
     - **User Provisioning & Governance**: `GET /api/users`, `POST /api/users`.
     - **Cryptographic Audit Chain Integrity Verification**: `POST /api/audit/verify-chain`.
     - **Statutory Handbook Rules**: `GET /api/compliance/rules`, `POST /api/compliance/rules`.

---

## 🐳 Docker Compose Deployment

To launch the complete infrastructure (MySQL 8.0 + FastAPI backend + 2 Frontend Portals) in isolated Docker containers:

```powershell
docker-compose up --build
```

---

## 🧪 Verification & Automated Testing

### 1. Backend Pytest Suite
```powershell
cd backend
python -m pytest tests/test_backend.py -v
```
*Validates API health, preconfigured accounts, RBAC isolation, Digital Twin simulation isolation, and SHA-256 hash-chain verification.*

### 2. End-to-End Two-Portal Verification Suite
```powershell
cd backend
python tests/test_portals_e2e.py
```
*Validates cross-portal denial, RBAC enforcement, innovation preservation, and independent build outputs of both portals.*

### 3. Independent Frontend Production Builds
```powershell
# Build both frontends independently via workspaces
npm run build:all

# Or build individually:
npm run build:institution
npm run build:reviewer
```
*Transforms and bundles all modules with 0 TypeScript or bundling errors.*

Local Development URLs

Institution Frontend: http://localhost:5173

Reviewer Frontend: http://localhost:5174

Administrator Frontend: http://localhost:5175

Backend API: http://localhost:8000

API Documentation: http://localhost:8000/docs
