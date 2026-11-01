# AICTE SmartApproval — Reviewer & Compliance Officer Workbench

Standalone frontend application for AICTE Scrutiny Officers, Evaluation Committees, and Compliance Reviewers to inspect applications, verify extracted document fields, analyze cross-document discrepancies, request corrections, and issue statutory decisions under the AICTE Approval Process Handbook (APH 2026-27).

## Features

- **Scrutiny Overview**: Real-time review queue metrics and SLA deadlines.
- **My Assigned Applications**: Filterable dossiers allocated to the scrutiny officer.
- **Review Queue**: High-throughput queue management with status indicators.
- **Split-Screen Dual-Pane Workbench**:
  - *Left Panel*: Application details, submitted documents, file previews, and extracted fields.
  - *Right Panel*: Compliance findings, severity ratings, reviewer notes, correction request controls, and final decision controls (Approve/Reject with mandatory reason).
- **Cross-Document Consistency Intelligence**: Side-by-side comparative inspection highlighting contradictory figures (e.g. faculty count in Faculty List vs Balance Sheet).
- **Compliance Findings**: Granular tracking and resolution of statutory non-compliances.
- **Correction Requests**: Track institutional correction responses and resubmissions.
- **Scrutiny SLA Deadlines**: Milestone tracking with countdowns and delay early-warning indicators.
- **Workload & Analytics**: Committee throughput and reviewer workload metrics.
- **Audit History**: Tamper-evident ledger of all scrutiny evaluations.
- **Reviewer Profile**: Official credentials and committee assignment status.

## Local Development

```powershell
# Navigate to this portal directory
cd apps/reviewer-portal

# Install dependencies (if not installed at root)
npm install

# Start Vite dev server on port 5174
npm run dev
```

Default local URL: **http://localhost:5174**  
Login route: **http://localhost:5174/login**

## Environment Configuration

Configure `.env`:
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_PORTAL_NAME="AICTE SmartApproval — Reviewer Workbench"
VITE_PORTAL_TYPE=reviewer
VITE_PORT=5174
```

## Production Build & Deployment

```powershell
npm run build
```
Build output is saved to `dist/`. Deploy as a static Single Page Application mapped to domain:
`https://reviewer.example.com`
Ensure all non-file route requests fallback to `index.html`.
