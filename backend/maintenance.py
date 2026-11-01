"""
AICTE SmartApproval — Secure Administrative Maintenance CLI
=============================================================
This command-line utility provides restricted, administrative procedures
for authorized system operators and administrators, ensuring secure operations
without requiring an administrative web interface.

All administrative actions are cryptographically logged in the SHA-256
audit ledger.

Usage examples:
  python maintenance.py verify-audit-chain
  python maintenance.py list-users
  python maintenance.py create-user --email officer@aicte.gov.in --name "Dr. Sharma" --role reviewer --password SecurePassword123
  python maintenance.py check-deadlines
  python maintenance.py list-rules
"""
import sys
import argparse
from app.database import SessionLocal
from app.models.user import User
from app.models.institution import Institution
from app.models.compliance import ComplianceRule
from app.models.audit import AuditEvent
from app.services.auth_service import get_password_hash
from app.services.audit_service import log_audit_event, verify_audit_chain
from app.tasks import check_sla_deadlines
from app.seed.seed_data import reset_clean_state, seed_demo_applications, init_system_baseline
from app.config import settings


def cmd_reset_clean_state(args):
    if not args.confirm:
        print("[!] ERROR: This command resets demo applications, documents, and reports to a clean initial state.")
        print("    You must provide --confirm to execute.")
        sys.exit(1)

    db = SessionLocal()
    try:
        summary = reset_clean_state(db=db, force=args.force)
        print("\n[OK] Clean initial state successfully established.")
    finally:
        db.close()


def cmd_seed_demo_data(args):
    if not args.confirm:
        print("[!] ERROR: You must provide --confirm to populate demo applications.")
        sys.exit(1)

    db = SessionLocal()
    try:
        seed_demo_applications(db=db)
        print("\n[OK] Demo applications successfully populated.")
    finally:
        db.close()


def cmd_verify_audit_chain(args):
    db = SessionLocal()
    try:
        print("[*] Initiating cryptographic SHA-256 hash-chain verification...")
        is_valid, total_events, broken_id, msg, first_hash, last_hash = verify_audit_chain(db)
        print(f"    Total Audit Blocks Examined: {total_events}")
        print(f"    Verification Status: {'VALID (TAMPER-EVIDENT INTEGRITY VERIFIED)' if is_valid else 'CORRUPTED/INVALID'}")
        if broken_id:
            print(f"    Broken Block ID: {broken_id}")
        print(f"    Details: {msg}")
        if not is_valid:
            sys.exit(1)
    finally:
        db.close()


def cmd_list_users(args):
    db = SessionLocal()
    try:
        users = db.query(User).order_by(User.id.asc()).all()
        print(f"\n{'ID':<5} {'Role':<12} {'Status':<10} {'Email':<30} {'Name':<25} {'Institution'}")
        print("-" * 105)
        for u in users:
            inst_name = u.institution.name if u.institution else "—"
            status = "Active" if u.is_active else "Inactive"
            print(f"{u.id:<5} {u.role:<12} {status:<10} {u.email:<30} {u.full_name:<25} {inst_name}")
        print("-" * 105)
        print(f"Total users: {len(users)}\n")
    finally:
        db.close()


def cmd_create_user(args):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == args.email).first()
        if existing:
            print(f"[!] Error: User with email '{args.email}' already exists.")
            sys.exit(1)

        if args.role == "institution" and not args.institution_id:
            print("[!] Error: --institution-id is required when creating an institution user.")
            sys.exit(1)

        if args.institution_id:
            inst = db.query(Institution).filter(Institution.id == args.institution_id).first()
            if not inst:
                print(f"[!] Error: Institution ID {args.institution_id} not found.")
                sys.exit(1)

        hashed = get_password_hash(args.password)
        new_user = User(
            email=args.email,
            hashed_password=hashed,
            full_name=args.name,
            role=args.role,
            institution_id=args.institution_id if args.role == "institution" else None,
            designation=args.designation or ("Reviewer" if args.role == "reviewer" else "Authorized Official"),
            phone=args.phone or "",
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Cryptographically append event to audit ledger
        log_audit_event(
            db=db,
            actor_email="system_admin_cli@aicte.gov.in",
            actor_role="admin",
            action_type="USER_CREATED_CLI",
            actor_id=new_user.id,
            details={
                "created_user_id": new_user.id,
                "email": new_user.email,
                "role": new_user.role,
                "channel": "CLI_MAINTENANCE"
            }
        )

        print(f"[+] User created successfully: ID {new_user.id} ({new_user.email}, Role: {new_user.role})")
    finally:
        db.close()


def cmd_check_deadlines(args):
    db = SessionLocal()
    try:
        print("[*] Checking SLA deadlines and triggering milestone escalations...")
        updated = check_sla_deadlines(db)
        print(f"[+] SLA check completed. {updated} deadline(s) updated.")
    finally:
        db.close()


def cmd_list_rules(args):
    db = SessionLocal()
    try:
        rules = db.query(ComplianceRule).order_by(ComplianceRule.id.asc()).all()
        print(f"\n{'ID':<5} {'Code':<18} {'Category':<15} {'Severity':<10} {'Min Val':<10} {'Rule Name'}")
        print("-" * 90)
        for r in rules:
            min_v = str(r.min_value) if r.min_value is not None else "—"
            print(f"{r.id:<5} {r.code:<18} {r.category:<15} {r.severity:<10} {min_v:<10} {r.name}")
        print("-" * 90)
        print(f"Total statutory rules: {len(rules)}\n")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(
        description="AICTE SmartApproval — Secure Administrative Maintenance CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    subparsers = parser.add_subparsers(dest="command", help="Available maintenance commands")

    # verify-audit-chain
    subparsers.add_parser("verify-audit-chain", help="Cryptographically verify the SHA-256 audit ledger hash chain")

    # list-users
    subparsers.add_parser("list-users", help="List all registered platform users and roles")

    # create-user
    p_user = subparsers.add_parser("create-user", help="Provision a new platform user")
    p_user.add_argument("--email", required=True, help="User email address")
    p_user.add_argument("--name", required=True, help="User full name")
    p_user.add_argument("--role", required=True, choices=["institution", "reviewer", "admin"], help="User role")
    p_user.add_argument("--password", required=True, help="User initial password")
    p_user.add_argument("--institution-id", type=int, default=None, help="Institution ID (required for institution users)")
    p_user.add_argument("--designation", default=None, help="Designation/Title")
    p_user.add_argument("--phone", default="", help="Phone number")

    # check-deadlines
    subparsers.add_parser("check-deadlines", help="Execute SLA deadline checker & escalations")

    # list-rules
    subparsers.add_parser("list-rules", help="List all statutory compliance rules")

    # reset-clean-state
    p_reset = subparsers.add_parser("reset-clean-state", help="Safely reset platform to clean initial state (clears demo applications/jobs/reports)")
    p_reset.add_argument("--confirm", action="store_true", required=True, help="Confirm development reset of demo records")
    p_reset.add_argument("--force", action="store_true", default=False, help="Force reset even if environment check triggers")

    # seed-demo-data
    p_seed = subparsers.add_parser("seed-demo-data", help="Deliberately populate sample demo applications for testing")
    p_seed.add_argument("--confirm", action="store_true", required=True, help="Confirm manual seeding of demo data")

    args = parser.parse_args()

    if args.command == "verify-audit-chain":
        cmd_verify_audit_chain(args)
    elif args.command == "list-users":
        cmd_list_users(args)
    elif args.command == "create-user":
        cmd_create_user(args)
    elif args.command == "check-deadlines":
        cmd_check_deadlines(args)
    elif args.command == "list-rules":
        cmd_list_rules(args)
    elif args.command == "reset-clean-state":
        cmd_reset_clean_state(args)
    elif args.command == "seed-demo-data":
        cmd_seed_demo_data(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
