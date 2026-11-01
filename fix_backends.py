# 1. Fix applications.py resubmit_application
with open('backend/app/api/applications.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = """def resubmit_application(
    id: int,
    comments: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    app = transition_workflow(
        db=db,
        application=app,
        to_state="Resubmitted",
        actor=current_user,
        action_name="Application Resubmitted",
        comments=comments or "Institutional corrections and updated evidences uploaded."
    )"""

replacement = """def resubmit_application(
    id: int,
    comments: Optional[str] = Query(None),
    payload: Optional[dict] = Body(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    comment_text = comments or (payload.get("comments") if payload else None) or (payload.get("reason") if payload else None) or "Institutional corrections and updated evidences uploaded."

    app = transition_workflow(
        db=db,
        application=app,
        to_state="Resubmitted",
        actor=current_user,
        action_name="Application Resubmitted",
        comments=comment_text
    )"""

if target in text:
    text = text.replace(target, replacement)
    with open('backend/app/api/applications.py', 'w', encoding='utf-8') as f:
        f.write(text)
    print("applications.py resubmit updated")
else:
    print("applications.py resubmit target not found")

# 2. Fix notifications.py delete_all_deadlines
with open('backend/app/api/notifications.py', 'r', encoding='utf-8') as f:
    n_text = f.read()

n_target = """@router.delete("/deadlines", status_code=status.HTTP_200_OK)
def delete_all_deadlines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Deadline)
    if current_user.role == "institution":
        query = query.join(Application).filter(Application.institution_id == current_user.institution_id)
    count = query.delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": f"{count} deadline(s) deleted."}"""

n_repl = """@router.delete("/deadlines", status_code=status.HTTP_200_OK)
def delete_all_deadlines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "institution":
        app_ids = [a.id for a in db.query(Application.id).filter(Application.institution_id == current_user.institution_id).all()]
        count = db.query(Deadline).filter(Deadline.application_id.in_(app_ids)).delete(synchronize_session=False) if app_ids else 0
    else:
        count = db.query(Deadline).delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": f"{count} deadline(s) deleted."}"""

if n_target in n_text:
    n_text = n_text.replace(n_target, n_repl)
    with open('backend/app/api/notifications.py', 'w', encoding='utf-8') as f:
        f.write(n_text)
    print("notifications.py delete_all_deadlines updated")

# 3. Fix reports.py delete_all_reports and get_verification_report_for_application fallback
with open('backend/app/api/reports.py', 'r', encoding='utf-8') as f:
    r_text = f.read()

r_target = """    report = db.query(ApplicationReport).filter(
        ApplicationReport.application_id == application_id
    ).order_by(desc(ApplicationReport.id)).first()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automated verification report has not been generated for this application yet."
        )

    return build_report_detail(report)"""

r_repl = """    report = db.query(ApplicationReport).filter(
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

    return build_report_detail(report)"""

if r_target in r_text:
    r_text = r_text.replace(r_target, r_repl)

r_del_target = """@router.delete("/verification", status_code=status.HTTP_200_OK)
def delete_all_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.application import Application
    query = db.query(ApplicationReport)
    if current_user.role == "institution":
        query = query.join(Application).filter(Application.institution_id == current_user.institution_id)
    count = query.delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": f"{count} report(s) deleted."}"""

r_del_repl = """@router.delete("/verification", status_code=status.HTTP_200_OK)
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
    return {"status": "success", "message": f"{count} report(s) deleted."}"""

if r_del_target in r_text:
    r_text = r_text.replace(r_del_target, r_del_repl)

with open('backend/app/api/reports.py', 'w', encoding='utf-8') as f:
    f.write(r_text)
print("reports.py updated")

# 4. Fix compliance.py delete_all_findings
with open('backend/app/api/compliance.py', 'r', encoding='utf-8') as f:
    c_text = f.read()

c_del_target = """@router.delete("/compliance/findings", status_code=status.HTTP_200_OK)
@router.delete("/findings", status_code=status.HTTP_200_OK)
def delete_all_findings(
    application_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.application import Application
    query = db.query(ComplianceFinding)
    if application_id:
        query = query.filter(ComplianceFinding.application_id == application_id)
    elif current_user.role == "institution":
        query = query.join(Application).filter(Application.institution_id == current_user.institution_id)
    count = query.delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": f"{count} compliance finding(s) deleted."}"""

c_del_repl = """@router.delete("/compliance/findings", status_code=status.HTTP_200_OK)
@router.delete("/findings", status_code=status.HTTP_200_OK)
def delete_all_findings(
    application_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models.application import Application
    if application_id:
        count = db.query(ComplianceFinding).filter(ComplianceFinding.application_id == application_id).delete(synchronize_session=False)
    elif current_user.role == "institution":
        app_ids = [a.id for a in db.query(Application.id).filter(Application.institution_id == current_user.institution_id).all()]
        count = db.query(ComplianceFinding).filter(ComplianceFinding.application_id.in_(app_ids)).delete(synchronize_session=False) if app_ids else 0
    else:
        count = db.query(ComplianceFinding).delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": f"{count} compliance finding(s) deleted."}"""

if c_del_target in c_text:
    c_text = c_text.replace(c_del_target, c_del_repl)
    with open('backend/app/api/compliance.py', 'w', encoding='utf-8') as f:
        f.write(c_text)
    print("compliance.py updated")

