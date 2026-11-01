import os
import sys
import json
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal
from app.models.institution import Institution
from sqlalchemy import text

def import_all_institutions():
    start_time = time.time()
    
    # Locate JSON file
    possible_paths = [
        os.path.join('backend', 'data', 'all-institutions.json'),
        os.path.join('backend', 'data', 'AICTE institutions.json'),
        os.path.join('data', 'all-institutions.json'),
        os.path.join('data', 'AICTE institutions.json')
    ]
    
    file_path = None
    for p in possible_paths:
        if os.path.exists(p):
            file_path = p
            break
            
    if not file_path:
        raise FileNotFoundError(f"Could not find all-institutions.json in any expected location: {possible_paths}")

    print(f"Reading dataset from: {file_path}")
    with open(file_path, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)

    total_records = len(raw_data)
    print(f"Total raw records in JSON: {total_records}")

    db = SessionLocal()
    try:
        # Load existing AICTE IDs from database to preserve existing records
        existing_rows = db.execute(text("SELECT id, aicte_permanent_id FROM institutions")).fetchall()
        existing_map = {r[1]: r[0] for r in existing_rows if r[1]}
        print(f"Preserving {len(existing_map)} existing database institutions.")

        # Deduplicate records by aicte_id
        dedup_records = {}
        skipped_non_inst = 0

        for item in raw_data:
            if not isinstance(item, dict):
                skipped_non_inst += 1
                continue
            
            # Check for valid institute record
            inst_name = (item.get('institute_name') or '').strip()
            aicte_id = (item.get('aicte_id') or '').strip()
            
            if not inst_name or not aicte_id:
                skipped_non_inst += 1
                continue
                
            if aicte_id not in dedup_records:
                district = (item.get('district') or '').strip()
                address = (item.get('address') or '').strip()
                inst_type = (item.get('institution_type') or 'Private-Self Financed').strip()
                women = (item.get('women') or 'N').strip()
                minority = (item.get('minority') or 'N').strip()
                other_id = (item.get('other_id') or '').strip()

                dedup_records[aicte_id] = {
                    "name": inst_name[:255],
                    "aicte_permanent_id": aicte_id[:50],
                    "institution_type": inst_type[:100],
                    "address": address or None,
                    "district": district[:100] if district else None,
                    "city": district[:100] if district else "",
                    "state": "",
                    "pincode": "",
                    "website": "",
                    "contact_email": "",
                    "contact_phone": "",
                    "head_of_institution_name": "",
                    "established_year": 2000,
                    "women_institution": women[:10] if women else "N",
                    "minority_institution": minority[:10] if minority else "N",
                    "other_id": other_id[:50] if other_id else None
                }

        unique_count = len(dedup_records)
        print(f"Deduplicated to {unique_count} unique institutions (skipped {skipped_non_inst} non-institution / metadata records).")

        # Separate into updates and new inserts
        to_insert = []
        updated_count = 0

        for aicte_id, row in dedup_records.items():
            if aicte_id in existing_map:
                # Update auxiliary fields if missing
                db.execute(text("""
                    UPDATE institutions 
                    SET district = COALESCE(district, :district),
                        women_institution = COALESCE(women_institution, :women_institution),
                        minority_institution = COALESCE(minority_institution, :minority_institution),
                        other_id = COALESCE(other_id, :other_id)
                    WHERE id = :id
                """), {
                    "district": row["district"],
                    "women_institution": row["women_institution"],
                    "minority_institution": row["minority_institution"],
                    "other_id": row["other_id"],
                    "id": existing_map[aicte_id]
                })
                updated_count += 1
            else:
                to_insert.append(row)

        print(f"Updated {updated_count} existing institutions.")
        print(f"Inserting {len(to_insert)} new institutions in batches...")

        # Bulk insert new records in chunks of 1000
        batch_size = 1000
        inserted_count = 0
        
        for i in range(0, len(to_insert), batch_size):
            chunk = to_insert[i:i + batch_size]
            db.bulk_insert_mappings(Institution, chunk)
            db.commit()
            inserted_count += len(chunk)
            print(f"  Progress: {inserted_count}/{len(to_insert)} institutions inserted...")

        total_in_db = db.execute(text("SELECT COUNT(*) FROM institutions")).scalar()
        elapsed = round(time.time() - start_time, 2)

        print("=" * 65)
        print(f"IMPORT SUCCESSFUL in {elapsed}s")
        print(f"  Total records in file: {total_records}")
        print(f"  Unique colleges imported: {inserted_count}")
        print(f"  Existing colleges updated: {updated_count}")
        print(f"  Total colleges now in database: {total_in_db}")
        print("=" * 65)

    except Exception as e:
        db.rollback()
        print(f"Import failed with error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import_all_institutions()

