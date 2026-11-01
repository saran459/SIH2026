import re
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.application import Application
from app.models.compliance import ComplianceRule, ComplianceFinding
from app.models.document import Document
from app.models.reviewer import ReviewerComment
from app.models.policy import PolicySource
from app.schemas.report import PolicyAssistantResponse

def answer_policy_query(
    db: Session,
    query: str,
    application_id: Optional[int] = None,
    user_institution_id: Optional[int] = None
) -> PolicyAssistantResponse:
    q_lower = query.lower().strip()
    
    # 1. Fetch Application context if provided
    app = None
    app_findings = []
    app_docs = []
    app_comments = []
    if application_id:
        app = db.query(Application).filter(Application.id == application_id).first()
        if app:
            app_findings = db.query(ComplianceFinding).filter(
                ComplianceFinding.application_id == application_id,
                ComplianceFinding.status != "Resolved"
            ).all()
            app_docs = db.query(Document).filter(Document.application_id == application_id).all()
            app_comments = db.query(ReviewerComment).filter(
                ReviewerComment.application_id == application_id
            ).all()

    # Query matching logic
    # Scenario A: "Which documents are missing?"
    if any(k in q_lower for k in ["missing document", "documents missing", "what documents", "mandatory document", "which documents"]):
        if app:
            missing_findings = [f for f in app_findings if f.finding_type == "Missing Document" or "Missing" in f.title]
            if missing_findings:
                items = [f"• {f.title}: {f.description}" for f in missing_findings]
                direct = f"For Application {app.application_number}, the following document deficiencies have been identified:\n" + "\n".join(items)
                return PolicyAssistantResponse(
                    query=query,
                    direct_answer=direct,
                    cited_rules=["CMP-DOC-001 (Mandatory Core Documents Bundle)"],
                    source_reference="AICTE Approval Process Handbook (APH) 2026-27, Appendix 16 (Documents to be Uploaded)",
                    recommended_action="Access the Document Centre to upload the missing certificates in PDF format.",
                    is_simulated=False
                )
            else:
                return PolicyAssistantResponse(
                    query=query,
                    direct_answer=f"All mandatory baseline documents for Application {app.application_number} have been uploaded into the portal.",
                    cited_rules=["CMP-DOC-001"],
                    source_reference="AICTE Approval Process Handbook (APH) 2026-27",
                    recommended_action="Ensure document extraction is complete and all scanned stamps are legible.",
                    is_simulated=False
                )
        else:
            return PolicyAssistantResponse(
                query=query,
                direct_answer="According to AICTE APH Chapter II, all institutions must submit 5 mandatory core document sets: (1) Society/Trust Registration & MoA, (2) Contiguous Land Ownership / Lease Deeds, (3) Approved Building Plans & Occupancy Certificate, (4) Valid State Fire Directorate NOC, and (5) Certified Faculty Roster.",
                cited_rules=["APH Clause 2.4", "CMP-DOC-001"],
                source_reference="AICTE Approval Process Handbook (APH) 2026-27, Chapter II, Clause 2.4.1",
                recommended_action="Prepare notarized PDF copies of all 5 mandatory certificates before submitting.",
                is_simulated=False
            )

    # Scenario B: "Why is this application marked as needing review?" / "status"
    if any(k in q_lower for k in ["why is this application", "needing review", "action required", "score", "readiness"]):
        if app:
            direct = f"Application {app.application_number} currently has a Readiness Score of {app.readiness_score}/100 with status '{app.status}'. "
            if app_findings:
                direct += f"There are {len(app_findings)} unresolved compliance findings:\n"
                for idx, f in enumerate(app_findings[:3]):
                    direct += f"\n{idx+1}. [{f.severity}] {f.title}: {f.description}"
            else:
                direct += "No active compliance violations recorded. Progressing according to scheduled review timelines."

            return PolicyAssistantResponse(
                query=query,
                direct_answer=direct,
                cited_rules=[f.rule.rule_code if f.rule else "CMP-AUDIT-001" for f in app_findings[:2]] or ["APH Chapter II"],
                source_reference="AICTE Approval Process Handbook (APH) 2026-27",
                recommended_action="Review each finding in the Compliance Monitor tab and utilize the Digital Twin simulator to test resolutions.",
                is_simulated=False
            )

    # Scenario C: "What caused the consistency warning?" / "mismatch"
    if any(k in q_lower for k in ["consistency", "mismatch", "discrepancy", "cross-document"]):
        if app:
            mismatches = [f for f in app_findings if f.finding_type == "Cross-Document Inconsistency"]
            if mismatches:
                m = mismatches[0]
                direct = f"A cross-document mismatch was flagged: '{m.title}'.\n{m.description}\nEvidence: {m.evidence_excerpt or 'Observed discrepancies across uploaded files.'}"
                return PolicyAssistantResponse(
                    query=query,
                    direct_answer=direct,
                    cited_rules=["CMP-VER-003 (Statutory Consistency Across Evidences)"],
                    source_reference="AICTE Approval Process Handbook (APH) 2026-27, Section 3.8",
                    recommended_action=m.recommended_action or "Review both documents side-by-side in the Document Comparison panel.",
                    is_simulated=False
                )
            else:
                return PolicyAssistantResponse(
                    query=query,
                    direct_answer=f"No unresolved cross-document inconsistencies are currently flagged for Application {app.application_number}.",
                    cited_rules=["CMP-VER-003"],
                    source_reference="AICTE Approval Process Handbook (APH) 2026-27",
                    recommended_action="Continue with standard verification workflow.",
                    is_simulated=False
                )

    # Scenario D: "Summarise outstanding corrections"
    if any(k in q_lower for k in ["correction", "outstanding", "reviewer comment", "clarification"]):
        if app:
            pending_comm = [c for c in app_comments if c.status == "Pending Response"]
            if pending_comm:
                direct = f"There are {len(pending_comm)} open correction requests from the AICTE Scrutiny Committee:\n"
                for c in pending_comm:
                    direct += f"\n• [{c.request_type}] {c.title}: \"{c.comment}\" (Due: {c.due_date.strftime('%d %b %Y') if c.due_date else 'Immediate'})"
                return PolicyAssistantResponse(
                    query=query,
                    direct_answer=direct,
                    cited_rules=["APH Chapter II, Clause 2.14 (Scrutiny Committee Queries)"],
                    source_reference="AICTE Approval Process Handbook (APH) 2026-27",
                    recommended_action="Submit formal institutional clarifications and updated documentation via the Reviewer Comments tab.",
                    is_simulated=False
                )
            else:
                return PolicyAssistantResponse(
                    query=query,
                    direct_answer=f"Zero outstanding reviewer correction requests are pending for Application {app.application_number}.",
                    cited_rules=["APH Chapter II"],
                    source_reference="AICTE Approval Process Handbook (APH) 2026-27",
                    recommended_action="No institution action is presently required.",
                    is_simulated=False
                )

    # General AICTE handbook queries search from policy_sources
    policy_matches = db.query(PolicySource).all()
    matched_clause = None
    for p in policy_matches:
        if any(term in q_lower for term in p.keywords.lower().split(",")):
            matched_clause = p
            break

    if matched_clause:
        return PolicyAssistantResponse(
            query=query,
            direct_answer=matched_clause.content,
            cited_rules=[f"{matched_clause.chapter}, {matched_clause.clause}"],
            source_reference=f"{matched_clause.document_name}, {matched_clause.clause}",
            recommended_action="Ensure all submitted infrastructure and faculty figures adhere to the specified statutory minimums.",
            is_simulated=False
        )

    # Default general guidance response
    return PolicyAssistantResponse(
        query=query,
        direct_answer=(
            "Under the AICTE Approval Process Handbook (APH) 2026-27, institutional compliance is evaluated across 5 core dimensions: "
            "(1) Valid Trust/Society registration and land title, (2) Architect-certified barrier-free built-up instructional area, "
            "(3) Cadre-compliant Faculty-to-Student Ratio (1:20 for UG Engineering), (4) State Fire Directorate and Environmental NOCs, and "
            "(5) Audited balance sheets and endowment funds. To see application-specific findings, select your active application."
        ),
        cited_rules=["AICTE Act 1987 Section 10(k)", "APH 2026-27 Chapter I & II"],
        source_reference="AICTE Approval Process Handbook (APH) 2026-27",
        recommended_action="Use the Digital Twin Simulator to test your institution's compliance readiness score.",
        is_simulated=False,
        warning="General handbook response. Select a specific active application for contextual findings."
    )
