import os
from datetime import datetime, timedelta
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.institution import Institution
from app.models.user import User
from app.models.application import Application, WorkflowEvent
from app.models.document import Document, ExtractedField
from app.models.compliance import ComplianceRule, ComplianceAssessment, ComplianceFinding
from app.models.reviewer import ReviewerComment
from app.models.deadline import Deadline, Notification, NotificationPreference
from app.models.audit import AuditEvent
from app.models.policy import PolicySource
from app.models.verification_job import VerificationJob
from app.models.application_report import ApplicationReport
from app.services.auth_service import get_password_hash
from app.services.audit_service import log_audit_event, GENESIS_HASH, verify_audit_chain
from app.config import settings

def init_system_baseline(db: Session = None):
    """
    Initializes standard platform prerequisites (Institutions, User Credentials,
    AICTE APH 2026-27 Compliance Rules, and Policy Sources).
    DOES NOT prepopulate any demo applications, documents, review jobs, or reports.
    """
    close_at_end = False
    if db is None:
        db = SessionLocal()
        close_at_end = True

    try:
        # 1. Core Statutory Institutions
        if db.query(Institution).count() == 0:
            inst1 = Institution(
                name="Greenfield Institute of Technology",
                aicte_permanent_id="1-445892101",
                institution_type="Private-Self Financed",
                address="Plot No. 42, Tech Knowledge Corridor, Outer Ring Road",
                city="Bengaluru",
                state="Karnataka",
                pincode="560103",
                website="https://greenfield-tech.edu.in",
                contact_email="registrar@greenfield-tech.edu.in",
                contact_phone="+91 80 2845 7701",
                head_of_institution_name="Dr. K. S. Ramanathan",
                established_year=2008
            )
            inst2 = Institution(
                name="Coastal Valley Engineering College",
                aicte_permanent_id="1-332918442",
                institution_type="Autonomous",
                address="Seaside Campus, NH-66 Bypass, Kalamassery",
                city="Kochi",
                state="Kerala",
                pincode="682022",
                website="https://coastalvalley.ac.in",
                contact_email="principal@coastalvalley.ac.in",
                contact_phone="+91 484 257 6620",
                head_of_institution_name="Dr. Meera Nambiar",
                established_year=2012
            )
            inst3 = Institution(
                name="Sunrise Institute of Applied Sciences & Management",
                aicte_permanent_id="1-889102431",
                institution_type="Government-Aided",
                address="Vidyanagar, Old Pune-Mumbai Highway, Chinchwad",
                city="Pune",
                state="Maharashtra",
                pincode="411019",
                website="https://sunrise-applied.edu.in",
                contact_email="contact@sunrise-applied.edu.in",
                contact_phone="+91 20 2744 5511",
                head_of_institution_name="Prof. Rajesh V. Patil",
                established_year=2003
            )
            db.add_all([inst1, inst2, inst3])
            db.commit()

        inst1 = db.query(Institution).filter(Institution.aicte_permanent_id == "1-445892101").first()
        inst2 = db.query(Institution).filter(Institution.aicte_permanent_id == "1-332918442").first()

        # 2. Platform Authentication Users (3 Personas)
        if db.query(User).count() == 0:
            password_hash = get_password_hash("password123")
            user_inst1 = User(
                email="institution@greenfield.edu",
                hashed_password=password_hash,
                full_name="Prof. Anand Deshmukh",
                role="institution",
                institution_id=inst1.id if inst1 else None,
                designation="Registrar & AICTE Approval In-Charge",
                phone="+91 98450 11223"
            )
            user_inst2 = User(
                email="principal@coastalvalley.ac.in",
                hashed_password=password_hash,
                full_name="Dr. Meera Nambiar",
                role="institution",
                institution_id=inst2.id if inst2 else None,
                designation="Principal & Professor",
                phone="+91 94471 33445"
            )
            user_reviewer = User(
                email="reviewer@aicte.gov.in",
                hashed_password=password_hash,
                full_name="Dr. Sudhir Bhattacharya",
                role="reviewer",
                institution_id=None,
                designation="Senior Scrutiny Officer, AICTE SWRO",
                phone="+91 11 2958 1000"
            )
            user_admin = User(
                email="admin@aicte.gov.in",
                hashed_password=password_hash,
                full_name="AICTE Super Administrator",
                role="admin",
                institution_id=None,
                designation="Director (Approval Bureau), AICTE HQ",
                phone="+91 11 2958 1001"
            )
            db.add_all([user_inst1, user_inst2, user_reviewer, user_admin])
            db.commit()

        # 3. Configurable Compliance Rules (AICTE APH 2026-27 Norms)
        if db.query(ComplianceRule).count() == 0:
            rules = [
                ComplianceRule(
                    rule_code="CMP-DOC-001",
                    title="Mandatory Core Documents Uploaded",
                    description="Institution must submit all 5 core statutory bundles: Society Registration, Land Title Deed, Building Plans, Fire Safety NOC, and Faculty Roster.",
                    category="Documentation",
                    severity="Critical",
                    applicable_category="All",
                    evaluation_method="document_presence",
                    source_reference="AICTE APH 2026-27, Appendix 16",
                    score_penalty=25
                ),
                ComplianceRule(
                    rule_code="CMP-DOC-002",
                    title="Document Text Extraction and Legibility",
                    description="Uploaded PDF files must be machine-readable with certified digital signatures and valid optical character recognition (OCR) parsing.",
                    category="Documentation",
                    severity="Medium",
                    applicable_category="All",
                    evaluation_method="rule_engine",
                    source_reference="AICTE APH 2026-27, Clause 2.4.2",
                    score_penalty=10
                ),
                ComplianceRule(
                    rule_code="CMP-FAC-001",
                    title="Cadre-Compliant Faculty-to-Student Ratio (FSR)",
                    description="Undergraduate Engineering requires minimum Faculty-to-Student Ratio of 1:20 (Cadre ratio 1:2:6 for Professor, Assoc. Prof, Asst. Prof).",
                    category="Faculty & Staff",
                    severity="Critical",
                    applicable_category="Engineering & Technology",
                    evaluation_method="numeric_threshold",
                    source_reference="AICTE APH 2026-27, Chapter II, Table 2.1",
                    score_penalty=20
                ),
                ComplianceRule(
                    rule_code="CMP-INF-001",
                    title="Contiguous Land Holding Requirement",
                    description="Institution must possess minimum 2.5 acres (Mega/Metro) or 7.5 acres (Rural) of continuous freehold or long-term leasehold land.",
                    category="Infrastructure",
                    severity="Critical",
                    applicable_category="All",
                    evaluation_method="numeric_threshold",
                    source_reference="AICTE APH 2026-27, Chapter II, Clause 2.5",
                    score_penalty=20
                ),
                ComplianceRule(
                    rule_code="CMP-INF-002",
                    title="Instructional Built-up Carpet Area",
                    description="Total built-up instructional and administrative covered carpet area must be at least 4,000 sqm for technical degree institutions.",
                    category="Infrastructure",
                    severity="High",
                    applicable_category="All",
                    evaluation_method="numeric_threshold",
                    source_reference="AICTE APH 2026-27, Chapter II, Table 2.3",
                    score_penalty=15
                ),
                ComplianceRule(
                    rule_code="CMP-SAF-001",
                    title="State Fire Safety Directorate NOC",
                    description="Valid Certificate of Fire Safety and Evacuation clearance issued by State Disaster Response & Fire Force must be uploaded.",
                    category="Safety & NOC",
                    severity="Critical",
                    applicable_category="All",
                    evaluation_method="document_presence",
                    source_reference="AICTE APH 2026-27, Clause 2.7.3",
                    score_penalty=20
                ),
                ComplianceRule(
                    rule_code="CMP-REV-001",
                    title="Zero Outstanding Reviewer Corrections",
                    description="All queries or deficiency notices issued by AICTE Scrutiny Committee must have verified explanatory responses submitted within deadline.",
                    category="Review & Correction",
                    severity="High",
                    applicable_category="All",
                    evaluation_method="rule_engine",
                    source_reference="AICTE APH 2026-27, Clause 2.14",
                    score_penalty=15
                )
            ]
            db.add_all(rules)
            db.commit()

        # 4. Policy Handbook Chunks for Evidence-First Assistant
        if db.query(PolicySource).count() == 0:
            policies = [
                PolicySource(
                    title="Cadre Ratio & Faculty Norms",
                    document_name="AICTE Approval Process Handbook (APH) 2026-27",
                    chapter="Chapter II",
                    clause="Clause 2.4",
                    topic="Faculty Requirements",
                    content="Undergraduate Engineering & Technology programs must maintain a minimum Faculty-to-Student Ratio of 1:20 based on approved intake. Cadre distribution among Professor, Associate Professor, and Assistant Professor must adhere to 1:2:6. All appointments must be backed by university selection committee approval.",
                    mandatory_requirements="1:20 FSR, 1:2:6 cadre ratio, Pay Commission scale compliance",
                    keywords="faculty,staff,ratio,cadre,fsr,professor,teacher,teaching"
                ),
                PolicySource(
                    title="Land & Site Requirements",
                    document_name="AICTE Approval Process Handbook (APH) 2026-27",
                    chapter="Chapter II",
                    clause="Clause 2.5",
                    topic="Infrastructure Land",
                    content="Institutions must possess continuous, unencumbered freehold land or long-term leasehold land (minimum 30 years). Minimum land requirement is 2.5 acres for Mega/Metro cities, 4.0 acres for Urban category, and 7.5 acres for Rural areas. Land mutation certificate in the name of the registered society/trust is mandatory.",
                    mandatory_requirements="Continuous piece of land, registered title, approved municipal master plan",
                    keywords="land,acres,area,hectares,site,title,lease,freehold"
                ),
                PolicySource(
                    title="Building Safety & Fire Clearance",
                    document_name="AICTE Approval Process Handbook (APH) 2026-27",
                    chapter="Chapter II",
                    clause="Clause 2.7",
                    topic="Safety Norms",
                    content="No technical institution shall be permitted to operate without a valid Fire Safety Certificate / NOC issued by the State Fire Directorate or local competent authority. Emergency egress stairs, wet risers, fire alarms, and seismic structural fitness certificates are mandatory statutory prerequisites.",
                    mandatory_requirements="Current Fire Directorate NOC, Barrier-free accessibility, Lift safety certificate",
                    keywords="fire,safety,noc,hazard,building,plan,emergency"
                )
            ]
            db.add_all(policies)
            db.commit()

        # 5. Genesis Audit Ledger Block
        if db.query(AuditEvent).count() == 0:
            log_audit_event(
                db=db,
                actor_email="system@aicte-smartapproval.gov.in",
                actor_role="admin",
                action_type="GENESIS_SYSTEM_INITIALIZE",
                details={"version": "1.0.0-sih", "demo_mode": False, "status": "clean_baseline"}
            )

    except Exception as e:
        db.rollback()
        print(f"Error during baseline system init: {e}")
        raise e
    finally:
        if close_at_end:
            db.close()

def reset_clean_state(db: Session = None, force: bool = False) -> Dict[str, Any]:
    """
    Safely clears demo applications, documents, verification jobs, reports,
    deadlines, notifications, and findings while preserving schema, authentication,
    and statutory compliance rules.
    Development-only operation protected by environment checks.
    """
    close_at_end = False
    if db is None:
        db = SessionLocal()
        close_at_end = True

    try:
        env = getattr(settings, "ENVIRONMENT", "development").lower()
        if env == "production" and not force:
            raise RuntimeError("CRITICAL SAFETY BLOCK: reset_clean_state cannot be executed in production environment!")

        print("[*] Initiating safe reset to clean initial state...")

        # Disable FK checks on MySQL for clean multi-table wipe
        is_mysql = db.bind.dialect.name == "mysql"
        if is_mysql:
            db.execute(__import__("sqlalchemy").text("SET FOREIGN_KEY_CHECKS = 0"))

        # 1. Reviewer comments (references findings and applications)
        comments_cleared = db.query(ReviewerComment).delete()

        # 2. Verification Jobs and Automated Reports
        jobs_cleared = db.query(VerificationJob).delete()
        reports_cleared = db.query(ApplicationReport).delete()

        # 3. Compliance findings and assessments
        findings_cleared = db.query(ComplianceFinding).delete()
        assessments_cleared = db.query(ComplianceAssessment).delete()

        # 4. Documents and OCR extracted fields
        fields_cleared = db.query(ExtractedField).delete()
        docs_cleared = db.query(Document).delete()

        # 5. Deadlines and Notifications
        deadlines_cleared = db.query(Deadline).delete()
        notifications_cleared = db.query(Notification).delete()
        prefs_cleared = db.query(NotificationPreference).delete()

        # 6. Workflow events and Applications
        workflows_cleared = db.query(WorkflowEvent).delete()
        apps_cleared = db.query(Application).delete()

        # 7. Audit Trail: Reset back to pristine Genesis block
        audits_cleared = db.query(AuditEvent).delete()
        db.commit()

        if is_mysql:
            db.execute(__import__("sqlalchemy").text("SET FOREIGN_KEY_CHECKS = 1"))

        # Create Genesis block
        log_audit_event(
            db=db,
            actor_email="system@aicte-smartapproval.gov.in",
            actor_role="admin",
            action_type="GENESIS_SYSTEM_INITIALIZE",
            details={"version": "1.0.0-sih", "demo_mode": False, "status": "clean_initial_state"}
        )

        # 7. Clean physical uploads directory (preserving the directory itself)
        upload_dir = settings.UPLOAD_DIR
        if os.path.exists(upload_dir):
            for fname in os.listdir(upload_dir):
                fpath = os.path.join(upload_dir, fname)
                if os.path.isfile(fpath) and not fname.startswith("."):
                    try:
                        os.remove(fpath)
                    except Exception:
                        pass

        # 8. Ensure baseline statutory prerequisites remain intact
        init_system_baseline(db)

        # 9. Verify cryptographic audit chain integrity
        is_valid, count, broken_id, msg, first_hash, last_hash = verify_audit_chain(db)
        if not is_valid:
            raise RuntimeError(f"Audit chain verification failed after reset: {msg}")

        summary = {
            "applications_cleared": apps_cleared,
            "documents_cleared": docs_cleared,
            "extracted_fields_cleared": fields_cleared,
            "verification_jobs_cleared": jobs_cleared,
            "application_reports_cleared": reports_cleared,
            "compliance_findings_cleared": findings_cleared,
            "compliance_assessments_cleared": assessments_cleared,
            "reviewer_comments_cleared": comments_cleared,
            "deadlines_cleared": deadlines_cleared,
            "notifications_cleared": notifications_cleared,
            "workflows_cleared": workflows_cleared,
            "audit_events_reset": audits_cleared,
            "audit_chain_verified": is_valid
        }
        print("[+] System successfully reset to clean initial state:")
        for k, v in summary.items():
            print(f"    - {k}: {v}")
        return summary

    finally:
        if close_at_end:
            db.close()

def seed_database(db: Session = None):
    """
    Backward-compatible startup entry point.
    Initializes baseline platform prerequisites WITHOUT demo applications.
    """
    init_system_baseline(db)

def seed_demo_applications(db: Session = None):
    """
    Deliberate, manual-only developer helper to populate sample applications and documents.
    NEVER executed on normal startup or automatic initialization.
    """
    close_at_end = False
    if db is None:
        db = SessionLocal()
        close_at_end = True

    try:
        init_system_baseline(db)

        inst1 = db.query(Institution).filter(Institution.aicte_permanent_id == "1-445892101").first()
        inst2 = db.query(Institution).filter(Institution.aicte_permanent_id == "1-332918442").first()
        inst3 = db.query(Institution).filter(Institution.aicte_permanent_id == "1-889102431").first()

        user_inst1 = db.query(User).filter(User.email == "institution@greenfield.edu").first()
        user_inst2 = db.query(User).filter(User.email == "principal@coastalvalley.ac.in").first()
        user_reviewer = db.query(User).filter(User.email == "reviewer@aicte.gov.in").first()
        user_admin = db.query(User).filter(User.email == "admin@aicte.gov.in").first()

        now = datetime.utcnow()

        app1 = Application(
            application_number="AICTE-2026-APP-1001",
            institution_id=inst1.id,
            category="Extension of Approval (EOA)",
            academic_year="2026-27",
            level="Undergraduate (UG)",
            program="Engineering & Technology",
            status="Under Review",
            created_by_user_id=user_inst1.id,
            assigned_reviewer_id=user_reviewer.id,
            submission_date=now - timedelta(days=12),
            review_start_date=now - timedelta(days=5),
            total_faculty_declared=40,
            total_intake_declared=600,
            built_up_area_sqm=14500.0,
            land_area_acres=8.2,
            readiness_score=75.0
        )
        db.add(app1)
        db.commit()
        print("[+] Demo application seeded manually.")
    finally:
        if close_at_end:
            db.close()

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    init_system_baseline()
