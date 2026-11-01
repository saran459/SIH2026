import sys
sys.path.insert(0, 'backend')
from app.core.database import SessionLocal
from sqlalchemy import text

def run_migration():
    db = SessionLocal()
    try:
        existing_cols = [r[0] for r in db.execute(text('DESCRIBE institutions')).fetchall()]
        print('Existing columns:', existing_cols)

        cols_to_add = [
            ('district', "VARCHAR(100) NULL AFTER address"),
            ('women_institution', "VARCHAR(10) DEFAULT 'N' AFTER established_year"),
            ('minority_institution', "VARCHAR(10) DEFAULT 'N' AFTER women_institution"),
            ('other_id', "VARCHAR(50) NULL AFTER minority_institution")
        ]

        for col_name, col_def in cols_to_add:
            if col_name not in existing_cols:
                print(f"Adding column {col_name}...")
                db.execute(text(f"ALTER TABLE institutions ADD COLUMN {col_name} {col_def};"))
            else:
                print(f"Column {col_name} already exists.")

        cols_to_modify = [
            ('city', "VARCHAR(100) NULL DEFAULT ''"),
            ('state', "VARCHAR(100) NULL DEFAULT ''"),
            ('pincode', "VARCHAR(20) NULL DEFAULT ''"),
            ('contact_email', "VARCHAR(255) NULL DEFAULT ''"),
            ('contact_phone', "VARCHAR(50) NULL DEFAULT ''"),
            ('address', "TEXT NULL")
        ]

        for col_name, col_def in cols_to_modify:
            print(f"Modifying {col_name} to be nullable with default...")
            db.execute(text(f"ALTER TABLE institutions MODIFY COLUMN {col_name} {col_def};"))

        indexes = [r[2] for r in db.execute(text('SHOW INDEX FROM institutions')).fetchall()]
        if 'idx_institutions_district' not in indexes:
            print("Adding index on district...")
            db.execute(text("CREATE INDEX idx_institutions_district ON institutions(district);"))

        if 'idx_institutions_state' not in indexes:
            print("Adding index on state...")
            db.execute(text("CREATE INDEX idx_institutions_state ON institutions(state);"))

        db.commit()
        print("Schema migration completed successfully!")
    except Exception as e:
        db.rollback()
        print("Migration error:", e)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()

