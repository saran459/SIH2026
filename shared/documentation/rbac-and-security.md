# Role-Based Access Control (RBAC) & Security Policy

## Authentication & Authorization Model

### 1. Centralized Identity, Two Decentralized Portals
- Authentication takes place via the shared FastAPI backend at `POST /api/auth/login`.
- The user's role is stored in the MySQL database (`User.role`), **never** trusted from client payload.
- When logging in from either of the two frontend portals, the portal submits its role scope parameter:
  - `portal: "institution"` for Institution Portal (`http://localhost:5173`)
  - `portal: "reviewer"` for Reviewer Workbench (`http://localhost:5174`)
- The backend verifies that `User.role == expected_portal_role`.
- If a mismatch occurs:
  - An institution user attempting to authenticate on the Reviewer Portal (`http://localhost:5174/login`) is rejected with HTTP `403 Forbidden` (`detail: "Access Denied: This login page is reserved for the Reviewer & Compliance Workbench."`).
  - A reviewer attempting to authenticate on the Institution Portal (`http://localhost:5173/login`) is rejected with HTTP `403 Forbidden` (`detail: "Access Denied: This login page is reserved for the Institution Portal."`).
  - An administrator attempting to authenticate on either frontend portal is rejected with HTTP `403 Forbidden` because no Administrator Portal UI exists.
  - All unauthorized cross-portal access attempts are cryptographically recorded in the `audit_events` ledger.

### 2. Strict Backend-Enforced RBAC Permissions Matrix

| Resource / Endpoint | Institution Role | Reviewer Role | Admin Role (Backend Maintenance) |
| :--- | :---: | :---: | :---: |
| `POST /api/auth/login`, `/me`, `/logout` | ✅ | ✅ | ✅ |
| `GET /api/applications` | Own Institution Only | Assigned / Active Queue Only | All Dossiers (Maintenance Audit) |
| `GET /api/applications/{id}` | Own Institution Only | Assigned Scrutiny Only | Permitted |
| `POST /api/applications` (Draft) | ✅ | ❌ (403 Forbidden) | ❌ (403 Forbidden) |
| `POST /api/applications/{id}/submit` | ✅ (Own Draft) | ❌ (403 Forbidden) | ❌ (403 Forbidden) |
| `POST /api/applications/{id}/request-correction` | ❌ (403 Forbidden) | ✅ (Assigned Application) | ✅ (Maintenance Override) |
| `POST /api/applications/{id}/approve`, `/reject` | ❌ (403 Forbidden) | ✅ (Assigned Application) | ✅ (Maintenance Override) |
| `POST /api/applications/{id}/digital-twin/simulate`| ✅ (Isolated Sandbox) | ✅ | ✅ |
| `POST /api/findings/{id}/resolve` | ❌ (403 Forbidden) | ✅ (With Reviewer Notes) | ✅ |
| `GET /api/users` | ❌ (403 Forbidden) | ❌ (403 Forbidden) | ✅ (Backend Maintenance Only) |
| `POST /api/users` | ❌ (403 Forbidden) | ❌ (403 Forbidden) | ✅ (Backend Maintenance Only) |
| `POST /api/compliance/rules` | ❌ (403 Forbidden) | ❌ (403 Forbidden) | ✅ (Backend Maintenance Only) |
| `POST /api/audit/verify-chain` | ❌ (403 Forbidden) | ❌ (403 Forbidden) | ✅ (Backend Maintenance Only) |
| `GET /api/reports/reviewer-workload` | ❌ (403 Forbidden) | ✅ | ✅ |

### 3. Cross-Tenant Data Isolation
- **Institution Isolation**: An authenticated institution user is strictly scoped by their `current_user.institution_id`. Accessing or querying any other institution's application, document, compliance finding, or digital twin yields HTTP `403 Forbidden`.
- **Reviewer Scoping**: A scrutiny officer can only view applications assigned to them or unassigned dossiers in the public review queue. An officer attempting to open an application assigned to another reviewer is denied access with HTTP `403 Forbidden`.

### 4. Cryptographic Token Lifecycle
- Standard JWT (HS256) bearer token with configured expiration (`ACCESS_TOKEN_EXPIRE_MINUTES`).
- Token claims include `user_id`, `email`, `role`, and `institution_id`.
- Every authenticated request requires `Authorization: Bearer <token>`.

---

## Restricted Administrative Maintenance Procedure

Because the user-facing interface consists strictly of **two portals** (`apps/institution-portal` and `apps/reviewer-portal`) with **no Administrator Portal frontend UI**, necessary administrative and security-management operations are conducted through restricted maintenance procedures:

### Maintenance Principle & Privilege Protection
- **No Privilege Escalation**: Institution users and scrutiny reviewers cannot gain administrative privileges under any circumstances.
- **Backend Model & Data Preservation**: All administrative database tables, user records, security roles, and audit trail verifiers remain intact in the database and backend codebase.

### Secure Maintenance Workflow

#### 1. Obtaining Administrative Authentication
Administrators authenticate directly with the shared FastAPI backend via a secured shell or API client:
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@aicte.gov.in",
    "password": "password123"
  }'
```
Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1Ni...",
  "token_type": "bearer",
  "role": "admin",
  "email": "admin@aicte.gov.in"
}
```

#### 2. User Governance & Account Management
List or provision system users:
```bash
# List all system users
curl -X GET "http://localhost:8000/api/users" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"

# Provision a new user
curl -X POST "http://localhost:8000/api/users" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "officer.sharma@aicte.gov.in",
    "full_name": "Dr. R. Sharma",
    "role": "reviewer",
    "designation": "Senior Scrutiny Officer",
    "password": "TemporaryPassword123!"
  }'
```

#### 3. Cryptographic Audit Hash-Chain Verification
Walk the complete SHA-256 hash chain from genesis block to the latest ledger entry to ensure zero database tampering:
```bash
curl -X POST "http://localhost:8000/api/audit/verify-chain" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```
Response:
```json
{
  "status": "VALID",
  "chain_length": 135,
  "tamper_detected": false,
  "verified_at": "2026-10-23T19:30:00Z"
}
```

#### 4. Compliance Rule Maintenance
Review or update statutory handbook rules:
```bash
curl -X GET "http://localhost:8000/api/compliance/rules" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

#### 5. Interactive Maintenance via Swagger UI
Authorized personnel can also execute maintenance tasks via FastAPI's interactive Swagger documentation at `http://127.0.0.1:8000/docs`, authorized with the administrative JWT token, accessible only over secure loopback or internal administrative VPNs.
