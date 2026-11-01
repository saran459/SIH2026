# AICTE SmartApproval — Preserved Innovations Guide

## 1. AICTE Approval Digital Twin
- **Mathematical Readiness Model**: Computes a dynamic readiness score on a 0–100 scale:
  `Readiness = Base (100) - (Critical Findings * 25) - (High Findings * 15) - (Medium Findings * 5) - (Missing Mandatory Docs * 15)`.
- **Statutory Handbook Baseline**: Strictly derived from Approval Process Handbook (APH 2026-27) parameters.

## 2. Interactive What-If Simulator
- **Simulation Isolation Sandbox**: Allows institutional users and scrutiny officers to test hypothetical corrective actions:
  - *"What if Fire Safety Certificate is uploaded?"*
  - *"What if faculty count is corrected from 38 to 42?"*
- **Persistent State Invariance**: The simulator computes score deltas entirely in-memory without mutating MySQL database records or issuing live workflow events.

## 3. Cross-Document Consistency Intelligence
- **Correlation Across Independent Filings**: Cross-references figures reported across distinct documents:
  - Faculty List count vs Balance Sheet salary headcount vs AICTE portal declaration.
  - Built-up area in Building Completion Certificate vs Municipal Plan vs Fire NOC.
- **Evidence Comparison UI**: Dual-column tabular display highlighting conflicting values and page numbers.

## 4. AI-Assisted Document Verification
- **PyMuPDF (Fitz) Text Extraction**: Extracts text layers and computes SHA-256 integrity checksums.
- **Regex Field Parser**: Automatically extracts standard certificate numbers, issue dates, and authority names.
- **Explainable Discrepancy Flagging**: Distinguishes between parsing issues and statutory non-compliance.

## 5. Compliance Monitoring Engine
- **Sample Demonstration Rules**: Based on APH 2026-27 norms for faculty-to-student ratios, built-up areas, and safety certificates.
- **Severity Classification**: `Critical`, `High`, `Medium`, and `Low`.
- **Finding Resolution Auditing**: Only authorized scrutiny officers can resolve findings with mandatory reviewer notes.

## 6. Approval Delay Early-Warning Engine
- **SLA Deadline Tracking**: Monitors institutional and scrutiny review windows.
- **Milestone Statuses**: `On Track`, `Approaching` (< 48h to deadline), `Overdue`, and `Blocked`.

## 7. Evidence-First Compliance Copilot
- **Statutory Policy Assistant**: Answers institutional questions grounded strictly in Approval Process Handbook norms with section citations.

## 8. Alert Management System
- **Real-Time Notification Center**: Push notifications for submission milestones, scrutiny queries, and SLA deadlines with unread counters.

## 9. Tamper-Evident SHA-256 Cryptographic Hash Chain Audit Trail
- **Cryptographic Hash Chaining**: Every system mutation calculates:
  `Hash(Event_N) = SHA256(Hash(Event_N-1) || Event_N.payload)`
- **Mathematical Integrity Verification**: Admin tool walks the complete chain from the genesis block to detect any direct database modifications.
