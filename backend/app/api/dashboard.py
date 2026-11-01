from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from app.api.deps import require_role
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.application import Application
from app.models.compliance import ComplianceFinding
from app.models.deadline import Deadline
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.report import (
    DashboardSummaryResponse,
    StatusDistributionPoint,
    TrendDataPoint,
    FindingsByCategoryPoint,
    DashboardAnalyticsResponse
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Application)
    findings_query = db.query(ComplianceFinding).filter(ComplianceFinding.status != "Resolved")
    deadline_query = db.query(Deadline).filter(Deadline.status != "Completed")

    # Scope by institution if institution role
    if current_user.role == "institution":
        query = query.filter(Application.institution_id == current_user.institution_id)
        findings_query = findings_query.join(Application).filter(Application.institution_id == current_user.institution_id)
        deadline_query = deadline_query.join(Application).filter(Application.institution_id == current_user.institution_id)
    elif current_user.role == "reviewer":
        # Reviewer sees assigned applications and unassigned
        pass

    total = query.count()
    draft = query.filter(Application.status == "Draft").count()
    under_review = query.filter(Application.status == "Under Review").count()
    correction_req = query.filter(Application.status == "Correction Required").count()
    approved = query.filter(Application.status == "Approved").count()
    rejected = query.filter(Application.status == "Rejected").count()

    now = datetime.utcnow()
    overdue = deadline_query.filter(Deadline.due_date < now).count()
    open_findings = findings_query.count()

    # Calculate average readiness score (0.0 when no records exist)
    avg_score = db.query(func.avg(Application.readiness_score))
    if current_user.role == "institution":
        avg_score = avg_score.filter(Application.institution_id == current_user.institution_id)
    raw_avg = avg_score.scalar()
    avg_val = round(float(raw_avg), 1) if raw_avg is not None else 0.0

    return DashboardSummaryResponse(
        total_applications=total,
        draft_applications=draft,
        under_review_applications=under_review,
        awaiting_corrections_applications=correction_req,
        approved_applications=approved,
        rejected_applications=rejected,
        overdue_actions=overdue,
        compliance_issues_requiring_attention=open_findings,
        average_readiness_score=avg_val
    )

@router.get("/analytics", response_model=DashboardAnalyticsResponse)
def get_dashboard_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    summary = get_dashboard_summary(current_user=current_user, db=db)

    # Status distribution
    statuses = ["Draft", "Submitted", "Under Review", "Correction Required", "Resubmitted", "Approved", "Rejected"]
    status_dist = []
    for st in statuses:
        q = db.query(Application).filter(Application.status == st)
        if current_user.role == "institution":
            q = q.filter(Application.institution_id == current_user.institution_id)
        cnt = q.count()
        status_dist.append(StatusDistributionPoint(status=st, count=cnt))

    # Findings by category
    categories = ["Documentation", "Faculty & Staff", "Infrastructure", "Safety & NOC", "Cross-Document Inconsistency"]
    findings_cat = []
    for cat in categories:
        if cat == "Cross-Document Inconsistency":
            cnt = db.query(ComplianceFinding).filter(
                ComplianceFinding.finding_type == "Cross-Document Inconsistency",
                ComplianceFinding.status != "Resolved"
            )
        else:
            cnt = db.query(ComplianceFinding).filter(
                ComplianceFinding.title.ilike(f"%{cat}%") | ComplianceFinding.description.ilike(f"%{cat}%"),
                ComplianceFinding.status != "Resolved"
            )
        if current_user.role == "institution":
            cnt = cnt.join(Application).filter(Application.institution_id == current_user.institution_id)
        findings_cat.append(FindingsByCategoryPoint(category=cat, count=cnt.count()))

    # Dynamic monthly trends for the trailing 6 calendar months (calculated from actual DB records)
    now = datetime.utcnow()
    monthly_trends = []
    for offset in range(5, -1, -1):
        target_date = now - timedelta(days=offset * 30)
        year = target_date.year
        month = target_date.month
        month_label = target_date.strftime("%b %Y")

        sub_q = db.query(Application).filter(
            func.extract('year', Application.created_at) == year,
            func.extract('month', Application.created_at) == month
        )
        appr_q = db.query(Application).filter(
            Application.status == "Approved",
            func.extract('year', Application.decision_date) == year,
            func.extract('month', Application.decision_date) == month
        )
        rej_q = db.query(Application).filter(
            Application.status == "Rejected",
            func.extract('year', Application.decision_date) == year,
            func.extract('month', Application.decision_date) == month
        )

        if current_user.role == "institution":
            sub_q = sub_q.filter(Application.institution_id == current_user.institution_id)
            appr_q = appr_q.filter(Application.institution_id == current_user.institution_id)
            rej_q = rej_q.filter(Application.institution_id == current_user.institution_id)

        monthly_trends.append(TrendDataPoint(
            month=month_label,
            submissions=sub_q.count(),
            approvals=appr_q.count(),
            rejections=rej_q.count()
        ))

    return DashboardAnalyticsResponse(
        summary=summary,
        status_distribution=status_dist,
        status_breakdown=status_dist,
        monthly_trends=monthly_trends,
        findings_by_category=findings_cat
    )

@router.delete("/clear-scrutiny-data", status_code=status.HTTP_200_OK)
def clear_scrutiny_data(
    current_user: User = Depends(require_role(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    from app.models.document import ExtractedField, Document
    from app.models.compliance import ComplianceFinding, ComplianceAssessment
    from app.models.application import Application, WorkflowEvent
    from app.models.reviewer import ReviewerComment
    from app.models.application_report import ApplicationReport
    from app.models.deadline import Deadline, Notification
    from app.models.verification_job import VerificationJob

    db.query(ExtractedField).delete(synchronize_session=False)
    db.query(ReviewerComment).delete(synchronize_session=False)
    db.query(ComplianceFinding).delete(synchronize_session=False)
    db.query(ComplianceAssessment).delete(synchronize_session=False)
    db.query(VerificationJob).delete(synchronize_session=False)
    db.query(Document).delete(synchronize_session=False)
    db.query(ApplicationReport).delete(synchronize_session=False)
    db.query(WorkflowEvent).delete(synchronize_session=False)
    db.query(Deadline).delete(synchronize_session=False)
    db.query(Notification).delete(synchronize_session=False)
    cnt = db.query(Application).delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": f"Scrutiny data cleared ({cnt} applications removed)."}
