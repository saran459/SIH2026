# AICTE SmartApproval — Institution Portal

Standalone frontend application for Educational Institutions and Applicants to prepare, simulate, verify, and submit statutory approval filings under the AICTE Approval Process Handbook (APH 2026-27).

## Features

- **Dashboard**: Real-time statutory metrics calculated live from MySQL via FastAPI.
- **My Applications**: Comprehensive tracking of institutional drafts, submissions, and scrutiny outcomes.
- **Create Application**: Multi-step statutory filing wizard.
- **Document Centre**: Secure PDF upload, integrity SHA-256 calculation, and PyMuPDF text/field extraction review.
- **Compliance Monitor**: Explainable statutory checks against configured handbook rules.
- **Approval Digital Twin & Interactive What-If Simulator**: Live 0–100 mathematical readiness model with sandbox delta projection without persistent mutation.
- **Correction Requests**: Immediate receipt of scrutiny queries with direct evidence upload and resubmission.
- **Alerts & Deadlines**: SLA milestone monitoring with early warnings.
- **Reports**: Statutory dossier export and compliance summaries.
- **Institution Profile**: Institutional data, Permanent AICTE ID, contact signatories.
- **Help & APH Guide**: Integrated policy assistant with statutory citations.

## Local Development

```powershell
# Navigate to this portal directory
cd apps/institution-portal

# Install dependencies (if not installed at root)
npm install

# Start Vite dev server on port 5173
npm run dev
```

Default local URL: **http://localhost:5173**  
Login route: **http://localhost:5173/login**

## Environment Configuration

Configure `.env`:
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_PORTAL_NAME="AICTE SmartApproval — Institution Portal"
VITE_PORTAL_TYPE=institution
VITE_PORT=5173
```

## Production Build & Deployment

```powershell
npm run build
```
Build output is saved to `dist/`. Deploy as a static Single Page Application (e.g. AWS S3 + CloudFront, Vercel, Netlify, Nginx) mapped to domain:
`https://institution.example.com`
Ensure all non-file route requests fallback to `index.html`.
