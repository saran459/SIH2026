import io
import csv
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.application import Application
from app.models.compliance import ComplianceFinding, ComplianceRule
from app.models.deadline import Deadline
from app.models.user import User
from app.models.institution import Institution
from app.models.application_report import ApplicationReport
from app.schemas.verification import ApplicationReportListItemResponse, ApplicationReportDetailResponse
from app.schemas.report import ComplianceMatrixResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/applications/csv")
def export_applications_csv(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Application).join(Institution)
    if current_user.role == "institution":
        query = query.filter(Application.institution_id == current_user.institution_id)
    if status_filter:
        query = query.filter(Application.status == status_filter)

    apps = query.order_by(Application.id.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Application Number",
        "Institution Name",
        "AICTE Permanent ID",
        "Category",
        "Academic Year",
        "Level",
        "Program",
        "Workflow Status",
        "Readiness Score (%)",
        "Total Faculty Declared",
        "Total Intake Declared",
        "Built-up Area (sqm)",
        "Land Area (acres)",
        "Submission Date",
        "Decision Date",
        "Report Generated At"
    ])

    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    for a in apps:
        writer.writerow([
            a.application_number,
            a.institution.name,
            a.institution.aicte_permanent_id,
            a.category,
            a.academic_year,
            a.level,
            a.program,
            a.status,
            a.readiness_score,
            a.total_faculty_declared,
            a.total_intake_declared,
            a.built_up_area_sqm,
            a.land_area_acres,
            a.submission_date.strftime("%Y-%m-%d") if a.submission_date else "N/A",
            a.decision_date.strftime("%Y-%m-%d") if a.decision_date else "N/A",
            now_str
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=aicte_applications_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@router.get("/compliance/csv")
def export_compliance_findings_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ComplianceFinding).join(Application).join(Institution)
    if current_user.role == "institution":
        query = query.filter(Application.institution_id == current_user.institution_id)

    findings = query.order_by(ComplianceFinding.id.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Finding ID",
        "Application Number",
        "Institution Name",
        "Finding Type",
        "Severity",
        "Status",
        "Title",
        "Description",
        "Expected Value",
        "Observed Value",
        "Recommended Action",
        "Resolution Notes",
        "Created At"
    ])

    for f in findings:
        writer.writerow([
            f.id,
            f.application.application_number,
            f.application.institution.name,
            f.finding_type,
            f.severity,
            f.status,
            f.title,
            f.description,
            f.expected_value or "",
            f.observed_value or "",
            f.recommended_action or "",
            f.resolution_notes or "",
            f.created_at.strftime("%Y-%m-%d %H:%M:%S")
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=aicte_compliance_findings_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@router.get("/reviewer-workload")
def get_reviewer_workload_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "institution":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Institution users cannot access reviewer workload metrics."
        )

    # Scoping: Reviewers only see their own assigned dossiers; Admins can see all
    if current_user.role == "reviewer":
        reviewers = db.query(User).filter(User.id == current_user.id).all()
    else:
        reviewers = db.query(User).filter(User.role == "reviewer").all()

    results = []
    now = datetime.utcnow()

    for r in reviewers:
        assigned_apps = db.query(Application).filter(Application.assigned_reviewer_id == r.id).all()
        app_ids = [a.id for a in assigned_apps]

        under_review = sum(1 for a in assigned_apps if a.status == "Under Review")
        correction_req = sum(1 for a in assigned_apps if a.status == "Correction Required")
        active_count = under_review + correction_req
        approved_count = sum(1 for a in assigned_apps if a.status == "Approved")
        rejected_count = sum(1 for a in assigned_apps if a.status == "Rejected")
        completed_count = approved_count + rejected_count
        submitted_count = sum(1 for a in assigned_apps if a.status == "Submitted")

        # Open compliance findings on assigned applications
        findings_count = db.query(ComplianceFinding).filter(
            ComplianceFinding.application_id.in_(app_ids),
            ComplianceFinding.status != "Resolved"
        ).count() if app_ids else 0

        # Deadlines on assigned applications
        overdue_deadlines = db.query(Deadline).filter(
            Deadline.application_id.in_(app_ids),
            Deadline.status != "Completed",
            Deadline.due_date < now
        ).count() if app_ids else 0

        approaching_deadlines = db.query(Deadline).filter(
            Deadline.application_id.in_(app_ids),
            Deadline.status != "Completed",
            Deadline.due_date >= now,
            Deadline.due_date <= now + timedelta(days=7)
        ).count() if app_ids else 0

        on_track_deadlines = db.query(Deadline).filter(
            Deadline.application_id.in_(app_ids),
            Deadline.status != "Completed",
            Deadline.due_date > now + timedelta(days=7)
        ).count() if app_ids else 0

        # Status distribution
        statuses = ["Under Review", "Correction Required", "Approved", "Rejected", "Submitted", "Resubmitted", "Draft"]
        status_dist = []
        for st in statuses:
            cnt = sum(1 for a in assigned_apps if a.status == st)
            if cnt > 0:
                status_dist.append({"status": st, "count": cnt})

        # Category distribution
        category_counts = {}
        for a in assigned_apps:
            category_counts[a.category] = category_counts.get(a.category, 0) + 1
        category_dist = [{"category": k, "count": v} for k, v in category_counts.items()]

        avg_score = round(sum(a.readiness_score for a in assigned_apps) / len(assigned_apps), 1) if assigned_apps else 0.0

        rev_dict = {
            "reviewer_id": r.id,
            "reviewer_name": r.full_name,
            "reviewer_email": r.email,
            "email": r.email,
            "total_assigned": len(assigned_apps),
            "assigned_count": len(assigned_apps),
            "active_reviews": active_count,
            "under_review_count": under_review,
            "pending_correction_count": correction_req,
            "pending_correction_reviews": correction_req,
            "approved_count": approved_count,
            "rejected_count": rejected_count,
            "completed_reviews": completed_count,
            "decisions_count": completed_count,
            "submitted_count": submitted_count,
            "compliance_findings_count": findings_count,
            "average_readiness_score": avg_score,
            "deadlines_metrics": {
                "overdue": overdue_deadlines,
                "approaching": approaching_deadlines,
                "on_track": on_track_deadlines,
                "total_active": overdue_deadlines + approaching_deadlines + on_track_deadlines
            },
            "status_distribution": status_dist,
            "category_distribution": category_dist
        }
        results.append(rev_dict)

    primary = results[0] if results else {
        "reviewer_id": current_user.id,
        "reviewer_name": current_user.full_name,
        "reviewer_email": current_user.email,
        "email": current_user.email,
        "total_assigned": 0,
        "assigned_count": 0,
        "active_reviews": 0,
        "under_review_count": 0,
        "pending_correction_count": 0,
        "pending_correction_reviews": 0,
        "approved_count": 0,
        "rejected_count": 0,
        "completed_reviews": 0,
        "decisions_count": 0,
        "submitted_count": 0,
        "compliance_findings_count": 0,
        "average_readiness_score": 0.0,
        "deadlines_metrics": {"overdue": 0, "approaching": 0, "on_track": 0, "total_active": 0},
        "status_distribution": [],
        "category_distribution": []
    }

    return {
        "report_title": "AICTE Scrutiny Committee Reviewer Workload & Performance Analytics",
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "total_reviewers": len(reviewers),
        "reviewers": results,
        "my_metrics": primary,
        # Top-level metric aliases for direct access
        "reviewer_id": primary["reviewer_id"],
        "reviewer_name": primary["reviewer_name"],
        "reviewer_email": primary["reviewer_email"],
        "total_assigned": primary["total_assigned"],
        "assigned_count": primary["assigned_count"],
        "active_reviews": primary["active_reviews"],
        "under_review_count": primary["under_review_count"],
        "pending_correction_count": primary["pending_correction_count"],
        "approved_count": primary["approved_count"],
        "rejected_count": primary["rejected_count"],
        "decisions_count": primary["decisions_count"],
        "completed_reviews": primary["completed_reviews"],
        "compliance_findings_count": primary["compliance_findings_count"],
        "average_readiness_score": primary["average_readiness_score"],
        "deadlines_metrics": primary["deadlines_metrics"],
        "status_distribution": primary["status_distribution"],
        "category_distribution": primary["category_distribution"]
    }

@router.get("/compliance-matrix", response_model=ComplianceMatrixResponse)
def get_compliance_matrix(
    application_id: Optional[int] = Query(None, description="Filter matrix by application ID"),
    academic_year: Optional[str] = Query(None, description="Filter matrix by academic year"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter matrix by application status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns an aggregated compliance matrix across statutory rules and applications
    with standardized check outcomes (Pass, Fail, Warning, Not Applicable, Not Run).
    """
    app_query = db.query(Application).join(Institution)
    if current_user.role == "institution":
        app_query = app_query.filter(Application.institution_id == current_user.institution_id)

    if application_id:
        app_query = app_query.filter(Application.id == application_id)
    if academic_year:
        app_query = app_query.filter(Application.academic_year == academic_year)
    if status_filter and status_filter.lower() != "all":
        app_query = app_query.filter(Application.status == status_filter)

    applications = app_query.order_by(desc(Application.updated_at)).all()
    rules = db.query(ComplianceRule).order_by(ComplianceRule.id.asc()).all()

    rule_headers = [
        {
            "rule_code": r.rule_code,
            "title": r.title,
            "category": r.category,
            "severity": r.severity,
            "source_reference": r.source_reference,
            "is_enabled": r.is_enabled
        }
        for r in rules
    ]

    matrix_rows = []
    total_passed = 0
    total_failed = 0
    total_warning = 0
    total_na = 0
    total_not_run = 0

    for app in applications:
        findings = db.query(ComplianceFinding).filter(ComplianceFinding.application_id == app.id).all()
        # Has this application been evaluated?
        has_run = (app.status not in ["Draft"] and (len(app.compliance_assessments) > 0 or len(findings) > 0 or app.readiness_score != 100.0 or app.documents_count > 0))

        row_evaluations = []
        app_passed = 0
        app_failed = 0
        app_warning = 0
        app_na = 0
        app_not_run = 0

        for r in rules:
            if not r.is_enabled:
                eval_status = "Not Run"
                details = "Rule is currently disabled in compliance configuration"
                penalty = 0
            elif not has_run:
                eval_status = "Not Run"
                details = "Preliminary automated scrutiny has not yet run on this dossier"
                penalty = 0
            elif r.applicable_category != "All" and r.applicable_category != app.category and r.applicable_category != app.level:
                eval_status = "Not Applicable"
                details = f"Not applicable to category '{app.category}' or level '{app.level}'"
                penalty = 0
            else:
                rule_findings = [f for f in findings if (f.rule_id == r.id or (f.rule and f.rule.rule_code == r.rule_code)) and f.status != "Resolved"]
                if not rule_findings:
                    eval_status = "Pass"
                    details = "Statutory requirement verified and satisfied"
                    penalty = 0
                else:
                    has_critical_or_high = any(f.severity in ["Critical", "High"] for f in rule_findings)
                    if has_critical_or_high:
                        eval_status = "Fail"
                        penalty = r.score_penalty
                        details = rule_findings[0].description
                    else:
                        eval_status = "Warning"
                        penalty = int(r.score_penalty * 0.5)
                        details = rule_findings[0].description

            if eval_status == "Pass":
                app_passed += 1
                total_passed += 1
            elif eval_status == "Fail":
                app_failed += 1
                total_failed += 1
            elif eval_status == "Warning":
                app_warning += 1
                total_warning += 1
            elif eval_status == "Not Applicable":
                app_na += 1
                total_na += 1
            else:
                app_not_run += 1
                total_not_run += 1

            row_evaluations.append({
                "rule_code": r.rule_code,
                "title": r.title,
                "category": r.category,
                "severity": r.severity,
                "status": eval_status,
                "details": details,
                "penalty_applied": penalty
            })

        matrix_rows.append({
            "application_id": app.id,
            "application_number": app.application_number,
            "institution_id": app.institution_id,
            "institution_name": app.institution.name if app.institution else "N/A",
            "academic_year": app.academic_year,
            "category": app.category,
            "program": app.program,
            "status": app.status,
            "readiness_score": app.readiness_score,
            "open_findings_count": len([f for f in findings if f.status != "Resolved"]),
            "passed_checks_count": app_passed,
            "failed_checks_count": app_failed,
            "warning_checks_count": app_warning,
            "not_applicable_checks_count": app_na,
            "not_run_checks_count": app_not_run,
            "rule_evaluations": row_evaluations
        })

    return {
        "matrix": matrix_rows,
        "rules": rule_headers,
        "summary": {
            "total_applications": len(applications),
            "total_rules": len(rules),
            "total_passed_evaluations": total_passed,
            "total_failed_evaluations": total_failed,
            "total_warning_evaluations": total_warning,
            "total_not_applicable_evaluations": total_na,
            "total_not_run_evaluations": total_not_run
        },
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    }

@router.get("/sla-performance")
def get_sla_performance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns early warning and SLA deadline performance metrics for approval processing.
    """
    deadline_query = db.query(Deadline).join(Application)
    if current_user.role == "institution":
        deadline_query = deadline_query.filter(Application.institution_id == current_user.institution_id)

    deadlines = deadline_query.order_by(Deadline.due_date.asc()).all()
    now = datetime.utcnow()

    records = []
    on_track_cnt = 0
    approaching_cnt = 0
    overdue_cnt = 0
    completed_cnt = 0

    for dl in deadlines:
        is_completed = dl.status == "Completed"
        if is_completed:
            status_calc = "Completed"
            completed_cnt += 1
        elif dl.due_date < now:
            status_calc = "Overdue"
            overdue_cnt += 1
        elif (dl.due_date - now).days <= 3:
            status_calc = "Approaching"
            approaching_cnt += 1
        else:
            status_calc = "On Track"
            on_track_cnt += 1

        days_remaining = (dl.due_date - now).days if not is_completed else 0

        records.append({
            "deadline_id": dl.id,
            "application_id": dl.application_id,
            "application_number": dl.application.application_number if dl.application else None,
            "institution_name": dl.application.institution.name if (dl.application and dl.application.institution) else "N/A",
            "title": dl.title,
            "deadline_type": dl.deadline_type,
            "due_date": dl.due_date.strftime("%Y-%m-%d %H:%M:%S"),
            "status": status_calc,
            "days_remaining": days_remaining,
            "completed_at": dl.completed_at.strftime("%Y-%m-%d %H:%M:%S") if dl.completed_at else None
        })

    return {
        "records": records,
        "summary": {
            "total_tracked": len(deadlines),
            "on_track": on_track_cnt,
            "approaching": approaching_cnt,
            "overdue": overdue_cnt,
            "completed": completed_cnt
        },
        "generated_at": now.strftime("%Y-%m-%d %H:%M:%S UTC")
    }

def build_report_list_item(report: ApplicationReport) -> ApplicationReportListItemResponse:
    reasons = json.loads(report.human_verification_reasons) if report.human_verification_reasons else []
    app_num = report.application.application_number if report.application else None
    inst_name = report.institution.name if report.institution else None

    # Standardize to report labels: Pending, Processing, Completed, Needs Manual Review, Failed
    report_status_map = {
        "Flagged for Manual Review": "Needs Manual Review",
        "Needs Manual Review": "Needs Manual Review",
        "Ready for Decision": "Completed",
        "Completed": "Completed",
        "Generated": "Completed",
        "Pending": "Pending",
        "Processing": "Processing",
        "Failed": "Failed"
    }
    standard_status = report_status_map.get(report.status, report.status)

    return ApplicationReportListItemResponse(
        id=report.id,
        report_number=report.report_number,
        application_id=report.application_id,
        application_number=app_num,
        institution_id=report.institution_id,
        institution_name=inst_name,
        status=standard_status,
        readiness_score=report.readiness_score,
        risk_level=report.risk_level,
        summary=report.summary,
        documents_processed_count=report.documents_processed_count,
        passed_checks_count=report.passed_checks_count,
        failed_checks_count=report.failed_checks_count,
        warning_checks_count=report.warning_checks_count,
        requires_human_verification=report.requires_human_verification,
        human_verification_reasons=reasons,
        audit_event_hash=report.audit_event_hash,
        created_at=report.created_at,
        updated_at=report.updated_at
    )

CHECK_OUTCOME_NORMALIZER = {
    "PASSED": "Pass",
    "Pass": "Pass",
    "FAILED": "Fail",
    "Fail": "Fail",
    "WARNING": "Warning",
    "Warning": "Warning",
    "NOT_APPLICABLE": "Not Applicable",
    "Not Applicable": "Not Applicable",
    "NOT_RUN": "Not Run",
    "Not Run": "Not Run"
}

def build_report_detail(report: ApplicationReport) -> ApplicationReportDetailResponse:
    base = build_report_list_item(report)
    parsed_data = json.loads(report.report_data) if report.report_data else {}

    # Ensure all checklist items and modules follow standardized check outcomes
    if "compliance_checklist" in parsed_data and isinstance(parsed_data["compliance_checklist"], list):
        for item in parsed_data["compliance_checklist"]:
            if isinstance(item, dict) and "status" in item:
                item["status"] = CHECK_OUTCOME_NORMALIZER.get(item["status"], item["status"])

    if "ai_modules_execution_status" in parsed_data and isinstance(parsed_data["ai_modules_execution_status"], list):
        for mod in parsed_data["ai_modules_execution_status"]:
            if isinstance(mod, dict) and "status" in mod:
                mod["status"] = CHECK_OUTCOME_NORMALIZER.get(mod["status"], mod["status"])

    if "document_integrity_and_tampering_checks" in parsed_data and isinstance(parsed_data["document_integrity_and_tampering_checks"], list):
        for chk in parsed_data["document_integrity_and_tampering_checks"]:
            if isinstance(chk, dict) and "status" in chk:
                chk["status"] = CHECK_OUTCOME_NORMALIZER.get(chk["status"], chk["status"])

    return ApplicationReportDetailResponse(
        **base.dict(),
        score_explanation=report.score_explanation,
        report_data=parsed_data
    )

@router.get("/verification", response_model=List[ApplicationReportListItemResponse])
def get_verification_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    risk_level: Optional[str] = None,
    application_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ApplicationReport).join(Application).join(Institution)

    # Scoping by role
    if current_user.role == "institution":
        query = query.filter(ApplicationReport.institution_id == current_user.institution_id)
    elif current_user.role == "reviewer":
        # Reviewer can see all submitted/under-review application reports
        pass

    if status_filter and status_filter.lower() != "all":
        query = query.filter(ApplicationReport.status == status_filter)

    if risk_level and risk_level.lower() != "all":
        query = query.filter(ApplicationReport.risk_level == risk_level)

    if application_id:
        query = query.filter(ApplicationReport.application_id == application_id)

    if search:
        search_term = search.strip()
        query = query.filter(
            (ApplicationReport.report_number.ilike(f"%{search_term}%")) |
            (Application.application_number.ilike(f"%{search_term}%")) |
            (Institution.name.ilike(f"%{search_term}%"))
        )

    reports = query.order_by(desc(ApplicationReport.created_at)).all()
    return [build_report_list_item(r) for r in reports]

@router.get("/verification/{id}", response_model=ApplicationReportDetailResponse)
def get_verification_report_by_id(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(ApplicationReport).filter(ApplicationReport.id == id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification report not found.")

    if current_user.role == "institution" and report.institution_id != current_user.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return build_report_detail(report)

@router.get("/application/{application_id}", response_model=ApplicationReportDetailResponse)
def get_verification_report_for_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.role == "institution" and app.institution_id != current_user.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    report = db.query(ApplicationReport).filter(
        ApplicationReport.application_id == application_id
    ).order_by(desc(ApplicationReport.id)).first()

    if not report:
        try:
            from app.services.automated_review_service import generate_and_persist_verification_report
            report = generate_and_persist_verification_report(db, app)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Automated verification report has not been generated for this application yet."
            )

    return build_report_detail(report)

@router.delete("/verification/{id}", status_code=status.HTTP_200_OK)
def delete_report(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(ApplicationReport).filter(ApplicationReport.id == id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    db.delete(report)
    db.commit()
    return {"status": "success", "message": "Report deleted."}

@router.delete("/verification", status_code=status.HTTP_200_OK)
def delete_all_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.application import Application
    if current_user.role == "institution":
        app_ids = [a.id for a in db.query(Application.id).filter(Application.institution_id == current_user.institution_id).all()]
        count = db.query(ApplicationReport).filter(ApplicationReport.application_id.in_(app_ids)).delete(synchronize_session=False) if app_ids else 0
    else:
        count = db.query(ApplicationReport).delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": f"{count} report(s) deleted."}
