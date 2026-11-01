# AICTE SmartApproval — Shared FastAPI Backend

Statutory workflow automation, compliance monitoring, and cryptographic audit ledger engine for the AICTE SmartApproval system. Connects to one shared MySQL 8 database and serves two independent frontend portals:
1. Institution Portal (`http://localhost:5173`, `http://127.0.0.1:5173`)
2. Reviewer Workbench (`http://localhost:5174`, `http://127.0.0.1:5174`)

---

## Architecture & Modules

```text
backend/
├── app/
│   ├── api/             # REST Routers (auth, applications, compliance, digital twin, users, etc.)
│   ├── core/            # Configuration & Database connection pool
│   ├── middleware/      # Audit logging & latency measurement middleware
│   ├── models/          # SQLAlchemy ORM models (MySQL 8 InnoDB)
│   ├── repositories/    # Database query access layers
│   ├── schemas/         # Pydantic validation & response schemas
│   ├── security/        # JWT bearer tokens & Bcrypt password hashing
│   ├── seed/            # Demonstration database seeder
│   ├── services/        # Digital twin simulator, OCR, PyMuPDF, audit chain
│   ├── tasks/           # SLA deadline monitoring & escalation tasks
│   └── main.py          # FastAPI application entrypoint & lifecycle
├── alembic/             # Alembic database schema migrations
├── alembic.ini          # Alembic configuration
├── tests/               # Pytest test suite & E2E integration tests
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
└── run.py               # Uvicorn launcher
```

---

## Setup & Running

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.12)
- MySQL 8.0 running locally on `localhost:3306` (or falls back to SQLite `aicte_smartapproval.db`)

### 2. Virtual Environment & Dependencies
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Database Configuration
Configure `backend/.env`:
```env
DATABASE_URL=mysql+pymysql://root:12345@localhost:3306/aicte_smartapproval
SECRET_KEY=aicte-smartapproval-secret-key-change-in-production-smart-india-hackathon-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
UPLOAD_DIR=./uploads
ALLOWED_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","http://localhost:5174","http://127.0.0.1:5174","http://localhost:8000","http://127.0.0.1:8000","https://institution.example.com","https://reviewer.example.com","https://api.example.com"]
```

### 4. Run Alembic Migrations
```powershell
alembic current
alembic upgrade head
```

### 5. Start the Server
```powershell
python run.py
```
> The API starts at: **http://127.0.0.1:8000**  
> Interactive Swagger Documentation: **http://127.0.0.1:8000/docs**

---

## Restricted Administrative Maintenance Operations

Administrative operations (e.g. user administration, rule updates, audit chain verification) do not have a frontend UI portal. Instead, authorized administrators execute maintenance tasks via authenticated API requests or server-side CLI scripts:
- **Authentication**: `POST /api/auth/login` with administrative credentials returns a JWT token with `role: "admin"`.
- **User Governance**: `GET /api/users` and `POST /api/users`.
- **Tamper-Evident Ledger Audit**: `POST /api/audit/verify-chain`.
- **Compliance Rules**: `GET /api/compliance/rules` and `POST /api/compliance/rules`.

Non-administrative users (institutions and reviewers) attempting to access these endpoints receive HTTP `403 Forbidden`.

---

## Automated Test Suite

```powershell
# Unit & RBAC isolation tests
python -m pytest tests/test_backend.py -v

# End-to-end two-portal verification
python tests/test_portals_e2e.py
```
Verifies API health, preconfigured demo accounts, RBAC endpoint isolation, Digital Twin isolation, SHA-256 cryptographic hash-chain verification, and builds of both independent frontend portals.
