from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.application import Application
from app.models.document import Document
from app.models.compliance import ComplianceRule, ComplianceAssessment, ComplianceFinding
from app.models.reviewer import ReviewerComment
from app.models.deadline import Deadline
from app.schemas.digital_twin import (
    DigitalTwinResponse,
    CategoryScoreBreakdown,
    FindingImpact,
    WhatIfScenarioRequest,
    WhatIfScenarioResponse
)
from app.schemas.compliance import ComplianceFindingResponse

def get_digital_twin_state(db: Session, application_id: int) -> DigitalTwinResponse:
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise ValueError(f"Application {application_id} not found.")

    findings = db.query(ComplianceFinding).filter(
        ComplianceFinding.application_id == application_id,
        ComplianceFinding.status != "Resolved"
    ).all()

    rules = db.query(ComplianceRule).filter(ComplianceRule.is_enabled == True).all()
    deadlines = db.query(Deadline).filter(Deadline.application_id == application_id).all()
    comments = db.query(ReviewerComment).filter(ReviewerComment.application_id == application_id).all()
    last_assessment = db.query(ComplianceAssessment).filter(
        ComplianceAssessment.application_id == application_id
    ).order_by(ComplianceAssessment.id.desc()).first()

    # Calculate category score breakdown
    categories = ["Documentation", "Faculty & Staff", "Infrastructure", "Safety & NOC", "Review & Correction"]
    category_breakdowns = []
    
    for cat in categories:
        cat_rules = [r for r in rules if r.category == cat or cat in r.category]
        total_in_cat = max(1, len(cat_rules))
        # Count open findings in this category
        cat_rule_ids = {r.id for r in cat_rules}
        cat_findings = [f for f in findings if f.rule_id in cat_rule_ids]
        failed_in_cat = len(cat_findings)
        passed_in_cat = max(0, total_in_cat - failed_in_cat)
        pct = round((passed_in_cat / total_in_cat) * 100, 1)

        category_breakdowns.append(
            CategoryScoreBreakdown(
                category=cat,
                total_checks=total_in_cat,
                passed_checks=passed_in_cat,
                score_percentage=pct
            )
        )

    # Finding impacts on readiness score
    finding_impacts = []
    penalty_map = {"Critical": 25, "High": 15, "Medium": 10, "Low": 5}
    for f in findings:
        pts = penalty_map.get(f.severity, 10)
        finding_impacts.append(
            FindingImpact(
                finding_id=f.id,
                title=f.title,
                severity=f.severity,
                penalty_points=pts,
                category=f.finding_type,
                resolvable=True
            )
        )

    # Deadlines count
    now = datetime.utcnow()
    overdue_count = sum(1 for d in deadlines if d.due_date < now and d.status != "Completed")
    upcoming_count = sum(1 for d in deadlines if d.due_date >= now and d.status != "Completed")

    # Priority Action recommendations
    priority_actions = []
    for f in findings[:4]:
        if f.recommended_action:
            priority_actions.append(f"{f.title}: {f.recommended_action}")

    if not priority_actions:
        priority_actions.append("All baseline compliance checks satisfied. Proceed to final verification and submission.")

    score = app.readiness_score or 100.0
    if score >= 85.0:
        label = "Ready for Submission / Board Review"
    elif score >= 60.0:
        label = "Action Required (Minor Deficiencies)"
    else:
        label = "High Risk (Significant Non-Compliance)"

    return DigitalTwinResponse(
        application_id=app.id,
        application_number=app.application_number,
        institution_id=app.institution_id,
        institution_name=app.institution.name,
        workflow_status=app.status,
        current_score=round(score, 1),
        status_label=label,
        last_assessment_date=last_assessment.created_at if last_assessment else app.updated_at,
        category_breakdown=category_breakdowns,
        unresolved_findings=[ComplianceFindingResponse.from_orm(f) for f in findings],
        finding_impacts=finding_impacts,
        overdue_actions_count=overdue_count,
        upcoming_deadlines_count=upcoming_count,
        priority_actions=priority_actions
    )

def simulate_what_if_scenario(
    db: Session,
    application_id: int,
    scenario: WhatIfScenarioRequest
) -> WhatIfScenarioResponse:
    """
    CRITICAL: Pure in-memory simulation.
    Does NOT alter persistent database records, audit trails, or workflow status.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise ValueError(f"Application {application_id} not found.")

    findings = db.query(ComplianceFinding).filter(
        ComplianceFinding.application_id == application_id,
        ComplianceFinding.status != "Resolved"
    ).all()

    rules = db.query(ComplianceRule).filter(ComplianceRule.is_enabled == True).all()

    baseline_score = app.readiness_score or 100.0
    simulated_score = baseline_score
    resolved_ids = set(scenario.resolved_finding_ids)

    penalty_map = {"Critical": 25, "High": 15, "Medium": 10, "Low": 5}
    affected_findings = []

    for f in findings:
        pts = penalty_map.get(f.severity, 10)
        # Check if finding is simulated resolved
        if f.id in resolved_ids:
            simulated_score = min(100.0, simulated_score + pts)
            affected_findings.append(ComplianceFindingResponse.from_orm(f))
        elif scenario.simulated_upload_missing_docs and f.finding_type == "Missing Document":
            simulated_score = min(100.0, simulated_score + pts)
            affected_findings.append(ComplianceFindingResponse.from_orm(f))
        elif scenario.simulated_respond_to_corrections and ("Correction" in f.title or "Correction" in f.finding_type):
            simulated_score = min(100.0, simulated_score + pts)
            affected_findings.append(ComplianceFindingResponse.from_orm(f))

    # Parameter simulations
    if scenario.simulated_faculty_count is not None:
        intake = app.total_intake_declared
        required = int(intake / 20) if intake > 0 else 0
        if scenario.simulated_faculty_count >= required:
            # If there was a faculty finding that wasn't already in resolved_ids
            fac_findings = [f for f in findings if "Faculty" in f.title and f.id not in resolved_ids]
            for f in fac_findings:
                simulated_score = min(100.0, simulated_score + penalty_map.get(f.severity, 15))
                affected_findings.append(ComplianceFindingResponse.from_orm(f))

    remaining_issues = max(0, len(findings) - len(affected_findings))
    score_delta = round(simulated_score - baseline_score, 1)

    if baseline_score >= 85.0:
        base_status = "Ready for Submission"
    elif baseline_score >= 60.0:
        base_status = "Action Required"
    else:
        base_status = "High Risk"

    if simulated_score >= 85.0:
        sim_status = "Ready for Submission"
    elif simulated_score >= 60.0:
        sim_status = "Action Required"
    else:
        sim_status = "High Risk"

    # Category breakdowns simulated
    categories = ["Documentation", "Faculty & Staff", "Infrastructure", "Safety & NOC", "Review & Correction"]
    sim_breakdowns = []
    for cat in categories:
        pct = min(100.0, max(20.0, round(simulated_score * 0.95 + 5.0, 1)))
        sim_breakdowns.append(
            CategoryScoreBreakdown(
                category=cat,
                total_checks=5,
                passed_checks=int((pct / 100.0) * 5),
                score_percentage=pct
            )
        )

    next_steps = []
    if affected_findings:
        next_steps.append(f"Execute real resolution for {len(affected_findings)} simulated items via Document Centre & Reviewer Workbench.")
    if remaining_issues > 0:
        next_steps.append(f"Address remaining {remaining_issues} compliance issues to achieve full statutory clearance.")
    else:
        next_steps.append("Simulated model achieves 100% statutory clearance. Ready for formal submission.")

    return WhatIfScenarioResponse(
        application_id=app.id,
        baseline_score=round(baseline_score, 1),
        simulated_score=round(simulated_score, 1),
        score_delta=score_delta,
        baseline_status=base_status,
        simulated_status=sim_status,
        resolved_findings_count=len(affected_findings),
        remaining_issues_count=remaining_issues,
        affected_findings=affected_findings,
        simulated_category_breakdown=sim_breakdowns,
        suggested_next_steps=next_steps,
        is_simulation=True
    )
