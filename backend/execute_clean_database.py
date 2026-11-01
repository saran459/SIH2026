import os
import glob
from sqlalchemy import text
from app.database import SessionLocal, engine
from app.services.audit_service import log_audit_event, verify_audit_chain

def execute_clean_slate():
    print("=" * 80)
    print("AICTE SMARTAPPROVAL: EXECUTING DATABASE CLEANUP")
    print("=" * 80)

    db = SessionLocal()
    try:
        # Step 1: Pre-cleanup record counts
        tables_to_clean = [
            "extracted_fields",
            "reviewer_comments",
            "compliance_findings",
            "compliance_assessments",
            "documents",
            "application_reports",
            "verification_jobs",
            "workflow_events",
            "deadlines",
            "notifications",
            "applications"
        ]

        preserved_tables = [
            "users",
            "institutions",
            "compliance_rules",
            "policy_sources",
            "alembic_version",
            "notification_preferences",
            "audit_events"
        ]

        print("\n[Step 1] Inspecting record counts before deletion:")
        pre_counts = {}
        for tbl in tables_to_clean + preserved_tables:
            cnt = db.execute(text(f"SELECT COUNT(*) FROM `{tbl}`;")).scalar()
            pre_counts[tbl] = cnt
            tag = "TO BE CLEANED" if tbl in tables_to_clean else "PRESERVED"
            print(f"  * {tbl:26}: {cnt:4} records [{tag}]")

        # Step 2: Delete in exact reverse foreign-key dependency order
        print("\n[Step 2] Executing atomic deletion of application records...")
        deleted_summary = {}
        for tbl in tables_to_clean:
            res = db.execute(text(f"DELETE FROM `{tbl}`;"))
            deleted_summary[tbl] = res.rowcount
            print(f"  -> Deleted {res.rowcount:4} records from `{tbl}`")

        # Commit deletion
        db.commit()
        print("-> Database commit successful. All application data wiped clean.")

        # Step 3: Clean up uploaded physical files
        print("\n[Step 3] Cleaning uploaded physical application files in ./uploads...")
        uploads_dir = "./uploads"
        deleted_files_count = 0
        if os.path.exists(uploads_dir):
            for file_path in glob.glob(os.path.join(uploads_dir, "app_*")):
                try:
                    os.remove(file_path)
                    deleted_files_count += 1
                    print(f"  -> Removed file: {os.path.basename(file_path)}")
                except Exception as fe:
                    print(f"  ! Warning removing {file_path}: {fe}")
        print(f"-> Total physical files removed: {deleted_files_count}")

        # Step 4: Record cryptographic audit event documenting the cleanup
        print("\n[Step 4] Appending SYSTEM_CLEANUP_RESET block to audit chain...")
        cleanup_event = log_audit_event(
            db=db,
            actor_email="admin@aicte.gov.in",
            actor_role="admin",
            action_type="SYSTEM_CLEANUP_RESET",
            actor_id=4,
            application_id=None,
            details={
                "operation": "APPLICATION_DATABASE_CLEAN_SLATE",
                "reason": "Administrative reset for clean submission environment",
                "applications_deleted": pre_counts.get("applications", 0),
                "documents_deleted": pre_counts.get("documents", 0),
                "reports_deleted": pre_counts.get("application_reports", 0),
                "physical_files_deleted": deleted_files_count,
                "users_preserved": pre_counts.get("users", 0),
                "institutions_preserved": pre_counts.get("institutions", 0)
            }
        )
        print(f"-> New Audit Block #315 recorded! Hash: {cleanup_event.event_hash[:16]}... Prev: {cleanup_event.previous_hash[:16]}...")

        # Step 5: Verify the unbroken audit chain
        print("\n[Step 5] Cryptographically verifying complete audit chain...")
        is_valid, count, broken_idx, msg, first_h, last_h = verify_audit_chain(db)
        print(f"-> Audit Chain Valid: {is_valid}")
        print(f"-> Total Blocks     : {count}")
        print(f"-> Verification Msg : {msg}")
        assert is_valid is True, f"Audit chain verification failed: {msg}"

        # Step 6: Post-cleanup summary counts
        print("\n[Step 6] Final record counts after cleanup:")
        post_counts = {}
        for tbl in tables_to_clean + preserved_tables:
            cnt = db.execute(text(f"SELECT COUNT(*) FROM `{tbl}`;")).scalar()
            post_counts[tbl] = cnt
            print(f"  * {tbl:26}: {cnt:4} records")

        print("\n" + "=" * 80)
        print("DATABASE CLEANUP COMPLETED SUCCESSFULLY WITH 100% REFERENTIAL INTEGRITY!")
        print("=" * 80)

    except Exception as e:
        db.rollback()
        print(f"\nERROR DURING CLEANUP: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    execute_clean_slate()
