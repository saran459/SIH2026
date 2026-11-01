with open('backend/app/api/auth.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = """@router.get("/institutions")
def list_registration_institutions(db: Session = Depends(get_db)):
    \"\"\"Public list of registered institutions for applicant registration.\"\"\"
    institutions = db.query(Institution).order_by(Institution.name.asc()).all()
    return [
        {
            "id": inst.id,
            "name": inst.name,
            "aicte_permanent_id": inst.aicte_permanent_id,
            "city": inst.city,
            "state": inst.state
        }
        for inst in institutions
    ]"""

repl = """@router.get("/institutions")
def list_registration_institutions(
    search: Optional[str] = Query(None),
    limit: int = Query(30, le=100),
    db: Session = Depends(get_db)
):
    \"\"\"Public list of registered institutions for applicant registration with search and pagination.\"\"\"
    query = db.query(Institution)
    if search and len(search.strip()) >= 2:
        term = search.strip()
        query = query.filter(
            Institution.name.ilike(f"%{term}%") |
            Institution.aicte_permanent_id.ilike(f"%{term}%") |
            Institution.district.ilike(f"%{term}%")
        )
    institutions = query.order_by(Institution.name.asc()).limit(limit).all()
    return [
        {
            "id": inst.id,
            "name": inst.name,
            "aicte_permanent_id": inst.aicte_permanent_id,
            "district": inst.district or inst.city or "",
            "city": inst.city or inst.district or "",
            "state": inst.state or "",
            "institution_type": inst.institution_type or "Private-Self Financed"
        }
        for inst in institutions
    ]"""

if target in text:
    text = text.replace(target, repl)
    with open('backend/app/api/auth.py', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated auth.py successfully")
else:
    print("Target not found in auth.py")

