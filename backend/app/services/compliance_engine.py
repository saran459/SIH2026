from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.application import Application
from app.models.document import Document
from app.models.compliance import ComplianceRule, ComplianceAssessment, ComplianceFinding
from app.models.reviewer import ReviewerComment
from app.models.deadline import Deadline
from app.services.consistency_engine import check_cross_document_consistency

REQUIRED_DOC_CATEGORIES = [
    "Institution Registration",
    "Faculty Information",
    "Infrastructure Information",
    "Affidavit / Declaration",
    "Fire Safety NOC"
]

def evaluate_compliance_rules(
    application: Application,
    documents: List[Document],
    comments: List[ReviewerComment],
    rules: List[ComplianceRule]
) -> Dict[str, Any]:
    """
    Unified canonical rule evaluation engine.
    Evaluates statutory compliance rules against application declarations and supporting documents.
    Standard outcomes for every rule check:
      - Pass
      - Fail
      - Warning
      - Not Applicable
      - Not Run
    """
    checklist_results = []
    rule_findings = []
    deductions = []
    human_verification_reasons = []

    uploaded_categories = {doc.category for doc in documents}
    
    passed_count = 0
    failed_count = 0
    warning_count = 0
    na_count = 0
    not_run_count = 0

    for rule in rules:
        rule_passed = True
        finding_reason = ""
        observed = ""
        expected = ""
        action_rec = ""
        penalty = 0

        # Check disabled / not applicable first
        if not rule.is_enabled:
            outcome_status = "Not Run"
            expected = "Rule Evaluation"
            observed = "Disabled"
            finding_reason = "Rule is currently disabled in compliance configuration."
            penalty = 0
            not_run_count += 1
        elif rule.applicable_category != "All" and rule.applicable_category != application.category and rule.applicable_category != application.level:
            outcome_status = "Not Applicable"
            expected = f"Applicable Category: {rule.applicable_category}"
            observed = f"Application: {application.category} / {application.level}"
            finding_reason = "Rule requirement not applicable to this application category."
            penalty = 0
            na_count += 1
        else:
            # Rule Specific Evaluations
            if rule.rule_code == "CMP-DOC-001":  # Mandatory Core Documents Uploaded
                missing = [cat for cat in REQUIRED_DOC_CATEGORIES if cat not in uploaded_categories]
                if missing:
                    rule_passed = False
                    finding_reason = f"Missing mandatory document categories: {', '.join(missing)}."
                    expected = f"All 5 core documents ({', '.join(REQUIRED_DOC_CATEGORIES)})"
                    observed = f"{len(uploaded_categories)} uploaded ({', '.join(uploaded_categories) if uploaded_categories else 'None'})"
                    action_rec = f"Upload required documents: {', '.join(missing)}."
                    penalty = rule.score_penalty
                    human_verification_reasons.append(f"Missing mandatory documents: {', '.join(missing)}")
                else:
                    rule_passed = True

            elif rule.rule_code == "CMP-DOC-002":  # Document Text Extraction and Legibility
                if not documents:
                    rule_passed = False
                    finding_reason = "No documents uploaded to evaluate text extraction."
                    expected = "At least one processed document with verified extraction."
                    observed = "0 documents uploaded"
                    action_rec = "Upload application supporting documents."
                    penalty = rule.score_penalty
                    human_verification_reasons.append("No uploaded supporting documents found for text extraction.")
                else:
                    incomplete = [d for d in documents if d.extraction_status in ["Uploaded", "Processing", "Failed"]]
                    if incomplete:
                        rule_passed = False
                        finding_reason = f"{len(incomplete)} documents pending text extraction or failed processing."
                        expected = "Extraction Complete for all uploaded documents"
                        observed = f"{len(incomplete)} unextracted / failed documents"
                        action_rec = "Trigger document extraction processing or replace unreadable scanned files."
                        penalty = int(rule.score_penalty * 0.5)
                        human_verification_reasons.append(f"{len(incomplete)} documents require manual text review.")
                    else:
                        rule_passed = True

            elif rule.rule_code == "CMP-FAC-001":  # Cadre-Compliant Faculty-to-Student Ratio (FSR)
                intake = application.total_intake_declared or 0
                faculty = application.total_faculty_declared or 0
                if intake > 0:
                    required_faculty = int(intake / 20)  # AICTE statutory 1:20 norm
                    if faculty < required_faculty:
                        rule_passed = False
                        finding_reason = f"Declared faculty strength ({faculty}) is below AICTE norm of 1:20 for sanctioned intake of {intake} (requires min {required_faculty} faculty members)."
                        expected = f"Min {required_faculty} qualified faculty members"
                        observed = f"{faculty} declared faculty members"
                        action_rec = f"Appoint at least {required_faculty - faculty} additional faculty or adjust intake request."
                        penalty = rule.score_penalty
                        human_verification_reasons.append(f"Faculty deficit: {faculty} declared vs {required_faculty} statutory minimum.")
                    else:
                        rule_passed = True
                else:
                    rule_passed = True

            elif rule.rule_code == "CMP-INF-001":  # Contiguous Land Holding Requirement
                land = application.land_area_acres or 0.0
                if land < 2.5:
                    rule_passed = False
                    finding_reason = f"Declared contiguous land area of {land} acres is below AICTE statutory minimum of 2.5 acres."
                    expected = ">= 2.5 contiguous acres (Urban) or >= 7.5 acres (Rural)"
                    observed = f"{land} acres"
                    action_rec = "Submit mutation certificate / registered sale deed showing adequate contiguous acreage."
                    penalty = rule.score_penalty
                    human_verification_reasons.append(f"Land area deficiency: {land} acres (statutory norm >= 2.5 acres).")
                else:
                    rule_passed = True

            elif rule.rule_code == "CMP-INF-002":  # Instructional Built-up Carpet Area
                area = application.built_up_area_sqm or 0.0
                if area < 4000.0:
                    rule_passed = False
                    finding_reason = f"Instructional and administrative built-up area of {area:.1f} sqm is below minimum norm of 4,000 sqm."
                    expected = ">= 4,000 sqm instructional area"
                    observed = f"{area:.1f} sqm"
                    action_rec = "Provide updated architect floor plans verifying certified covered carpet area."
                    penalty = rule.score_penalty
                    human_verification_reasons.append(f"Built-up area deficiency: {area:.1f} sqm (norm >= 4,000 sqm).")
                else:
                    rule_passed = True

            elif rule.rule_code == "CMP-SAF-001":  # State Fire Safety Directorate NOC
                has_fire_noc = any("Fire Safety" in (doc.category or "") or "Fire" in (doc.original_name or "") for doc in documents)
                if not has_fire_noc:
                    rule_passed = False
                    finding_reason = "Valid Fire Safety Certificate / NOC from State Fire Directorate not detected in uploaded evidence."
                    expected = "Current Fire Safety NOC valid for academic session"
                    observed = "Document missing from bundle"
                    action_rec = "Upload official State Fire Department NOC certificate."
                    penalty = rule.score_penalty
                    human_verification_reasons.append("State Fire Directorate NOC not provided.")
                else:
                    rule_passed = True

            elif rule.rule_code == "CMP-REV-001":  # Zero Outstanding Reviewer Corrections
                pending_corrections = [c for c in comments if c.status == "Pending Response"]
                if pending_corrections:
                    rule_passed = False
                    finding_reason = f"{len(pending_corrections)} reviewer correction requests remain unanswered by institution."
                    expected = "0 pending correction requests"
                    observed = f"{len(pending_corrections)} unanswered correction items"
                    action_rec = "Review remarks from Reviewer Workbench and submit requested clarification documents."
                    penalty = int(rule.score_penalty * 0.5)
                    human_verification_reasons.append(f"{len(pending_corrections)} unresolved reviewer queries pending.")
                else:
                    rule_passed = True

            # Determine Outcome Status
            if not rule_passed:
                if rule.rule_code in ["CMP-DOC-002", "CMP-REV-001"] or rule.severity in ["Low", "Medium"]:
                    outcome_status = "Warning"
                    warning_count += 1
                else:
                    outcome_status = "Fail"
                    failed_count += 1
            else:
                outcome_status = "Pass"
                passed_count += 1

        # Build Checklist Item
        checklist_results.append({
            "rule_code": rule.rule_code,
            "title": rule.title,
            "category": rule.category,
            "severity": rule.severity,
            "status": outcome_status,
            "expected_value": expected if outcome_status in ["Fail", "Warning"] else ("Norms Satisfied" if outcome_status == "Pass" else observed),
            "observed_value": observed if outcome_status in ["Fail", "Warning"] else ("Compliant" if outcome_status == "Pass" else observed),
            "source_reference": rule.source_reference,
            "penalty_applied": penalty
        })

        if outcome_status in ["Fail", "Warning"]:
            deductions.append({
                "rule": rule.rule_code,
                "title": rule.title,
                "severity": rule.severity,
                "penalty": penalty,
                "reason": finding_reason
            })
            rule_findings.append({
                "rule_id": rule.id,
                "rule_code": rule.rule_code,
                "title": f"{rule.title}: {'Advisory Warning Detected' if outcome_status == 'Warning' else 'Non-Compliance Detected'}",
                "description": finding_reason,
                "severity": rule.severity if outcome_status == "Fail" else "Medium",
                "status": "Open",
                "expected_value": expected,
                "observed_value": observed,
                "recommended_action": action_rec,
                "finding_type": "Rule Violation",
                "requires_human_verification": (outcome_status == "Fail")
            })

    return {
        "checklist_results": checklist_results,
        "rule_findings": rule_findings,
        "deductions": deductions,
        "human_verification_reasons": human_verification_reasons,
        "passed_count": passed_count,
        "failed_count": failed_count,
        "warning_count": warning_count,
        "not_applicable_count": na_count,
        "not_run_count": not_run_count,
        "total_rules": len(rules)
    }

def evaluate_application_compliance(
    db: Session,
    application_id: int,
    assessor_id: Optional[int] = None
) -> ComplianceAssessment:
    """
    Evaluates statutory compliance, persists findings and assessment snapshot to MySQL,
    and updates application readiness score.
    """
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise ValueError(f"Application {application_id} not found.")

    rules = db.query(ComplianceRule).all()
    documents = db.query(Document).filter(Document.application_id == application_id).all()
    comments = db.query(ReviewerComment).filter(ReviewerComment.application_id == application_id).all()

    # Run cross-document consistency checks first
    check_cross_document_consistency(db, application_id)

    # Run unified canonical rule evaluation
    eval_res = evaluate_compliance_rules(application, documents, comments, rules)

    # Fetch all existing rule violation findings for this application to prevent duplicates
    existing_findings = db.query(ComplianceFinding).filter(
        ComplianceFinding.application_id == application_id,
        ComplianceFinding.finding_type == "Rule Violation"
    ).all()
    existing_by_title = {f.title: f for f in existing_findings}

    # Clean existing non-resolved rule violation findings that are no longer flagged
    new_titles = {rf["title"] for rf in eval_res["rule_findings"]}
    for ef in existing_findings:
        if ef.status != "Resolved" and ef.title not in new_titles:
            db.delete(ef)

    # Insert or update rule findings idempotently
    for rf in eval_res["rule_findings"]:
        if rf["title"] in existing_by_title:
            existing_f = existing_by_title[rf["title"]]
            if existing_f.status == "Resolved":
                # Finding was already resolved by reviewer; preserve resolved record without duplicating
                continue
            # Update existing open finding in-place
            existing_f.description = rf["description"]
            existing_f.severity = rf["severity"]
            existing_f.expected_value = rf["expected_value"]
            existing_f.observed_value = rf["observed_value"]
            existing_f.recommended_action = rf["recommended_action"]
        else:
            finding = ComplianceFinding(
                application_id=application.id,
                rule_id=rf["rule_id"],
                finding_type=rf["finding_type"],
                title=rf["title"],
                description=rf["description"],
                severity=rf["severity"],
                status=rf["status"],
                expected_value=rf["expected_value"],
                observed_value=rf["observed_value"],
                recommended_action=rf["recommended_action"]
            )
            db.add(finding)

    # Cross-document inconsistency penalties
    unresolved_mismatches = db.query(ComplianceFinding).filter(
        ComplianceFinding.application_id == application_id,
        ComplianceFinding.finding_type == "Cross-Document Inconsistency",
        ComplianceFinding.status != "Resolved"
    ).all()

    total_deductions = sum(d["penalty"] for d in eval_res["deductions"]) + (len(unresolved_mismatches) * 10.0)
    final_score = max(10.0, round(100.0 - total_deductions, 1))

    # Determine assessment status
    if eval_res["failed_count"] > 0 or len(unresolved_mismatches) > 0:
        assessment_status = "Action Required" if final_score >= 60 else "Non-Compliant"
    elif eval_res["warning_count"] > 0:
        assessment_status = "Action Required"
    else:
        assessment_status = "Compliant"

    application.readiness_score = final_score

    assessment = ComplianceAssessment(
        application_id=application.id,
        assessed_by_user_id=assessor_id,
        readiness_score=final_score,
        total_rules_evaluated=eval_res["total_rules"],
        passed_count=eval_res["passed_count"],
        failed_count=eval_res["failed_count"],
        needs_review_count=eval_res["warning_count"],
        status=assessment_status
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment
