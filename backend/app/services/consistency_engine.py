import re
from datetime import datetime, date
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.application import Application
from app.models.document import Document, ExtractedField
from app.models.compliance import ComplianceFinding

def normalize_text(val: Optional[str]) -> str:
    """Standardizes string by stripping punctuation, redundant whitespace and lowercasing."""
    if not val:
        return ""
    clean = re.sub(r"[^\w\s]", " ", val.lower())
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean

def normalize_institution_name(name: Optional[str]) -> str:
    """Removes common institutional legal entity affixes for fair comparison."""
    norm = normalize_text(name)
    stopwords = [
        "trust", "society", "educational", "education", "institute", "college",
        "of", "technology", "sciences", "applied", "engineering", "polytechnic",
        "private", "limited", "pvt", "ltd", "the"
    ]
    words = [w for w in norm.split() if w not in stopwords]
    return " ".join(words) if words else norm

def normalize_academic_year(ay: Optional[str]) -> str:
    """Standardizes academic session representations into canonical YYYY-YYYY format."""
    if not ay:
        return ""
    m = re.search(r"(202\d)\s*[-–/]\s*20?(\d{2})", ay)
    if m:
        start_yr = m.group(1)
        end_suffix = m.group(2)
        end_yr = f"20{end_suffix}" if len(end_suffix) == 2 else end_suffix
        return f"{start_yr}-{end_yr}"
    return ay.strip().replace(" ", "")

def parse_int_safe(val: Optional[str]) -> Optional[int]:
    if not val:
        return None
    try:
        clean = re.sub(r"[^\d]", "", str(val))
        return int(clean) if clean else None
    except Exception:
        return None

def parse_float_safe(val: Optional[str]) -> Optional[float]:
    if not val:
        return None
    try:
        clean = str(val).replace(",", "").strip()
        m = re.search(r"(\d+(?:\.\d+)?)", clean)
        return float(m.group(1)) if m else None
    except Exception:
        return None

def parse_date_safe(val: Optional[str]) -> Optional[date]:
    if not val:
        return None
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d.%m.%Y",
        "%B %d, %Y", "%B %d %Y", "%d %B %Y", "%d %b %Y"
    ]
    val_clean = str(val).strip()
    for fmt in formats:
        try:
            return datetime.strptime(val_clean, fmt).date()
        except ValueError:
            pass
    return None

def check_cross_document_consistency(db: Session, application_id: int) -> List[ComplianceFinding]:
    """
    Compares extracted fields across uploaded documents and checks them against
    application declarations across all 9 statutory dimensions:
      1. Institution Name
      2. Academic Year
      3. Registration Numbers
      4. Approved Intake Capacity
      5. Faculty Count
      6. Land Area
      7. Built-up Area
      8. NOC References
      9. Relevant Dates & Validity Periods

    Stores source document ID and page number references for explainable reviewer inspection.
    Prevents duplicate findings when re-executed or retried.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        return []

    documents = db.query(Document).filter(Document.application_id == application_id).all()
    if not documents:
        return []

    # Filter documents to only include the active (highest version) document per category
    latest_docs_by_category: Dict[str, Document] = {}
    for doc in documents:
        cat = doc.category
        if cat not in latest_docs_by_category or doc.version > latest_docs_by_category[cat].version:
            latest_docs_by_category[cat] = doc

    active_doc_ids = {d.id for d in latest_docs_by_category.values()}
    active_documents = [d for d in documents if d.id in active_doc_ids]

    # Map field_name -> list of (doc, extracted_field)
    field_occurrences: Dict[str, List[Tuple[Document, ExtractedField]]] = {}
    for doc in active_documents:
        for ef in doc.extracted_fields:
            if ef.field_name not in field_occurrences:
                field_occurrences[ef.field_name] = []
            field_occurrences[ef.field_name].append((doc, ef))

    # Clean existing non-resolved cross-document inconsistency findings for safe idempotency
    db.query(ComplianceFinding).filter(
        ComplianceFinding.application_id == application_id,
        ComplianceFinding.finding_type == "Cross-Document Inconsistency",
        ComplianceFinding.status != "Resolved"
    ).delete(synchronize_session=False)

    existing_resolved_titles = {
        f.title for f in db.query(ComplianceFinding).filter(
            ComplianceFinding.application_id == application_id,
            ComplianceFinding.finding_type == "Cross-Document Inconsistency",
            ComplianceFinding.status == "Resolved"
        ).all()
    }
    seen_finding_titles = set(existing_resolved_titles)

    new_findings: List[ComplianceFinding] = []

    def record_discrepancy(finding: ComplianceFinding):
        if finding.title not in seen_finding_titles:
            seen_finding_titles.add(finding.title)
            new_findings.append(finding)
            db.add(finding)

    # ------------------------------------------------------------------
    # 1. Institution Name Consistency
    # ------------------------------------------------------------------
    if "institution_name" in field_occurrences:
        occurrences = field_occurrences["institution_name"]
        for i in range(len(occurrences)):
            for j in range(i + 1, len(occurrences)):
                doc1, ef1 = occurrences[i]
                doc2, ef2 = occurrences[j]
                v1_raw = ef1.verified_value or ef1.extracted_value or ""
                v2_raw = ef2.verified_value or ef2.extracted_value or ""

                norm1 = normalize_institution_name(v1_raw)
                norm2 = normalize_institution_name(v2_raw)

                if norm1 and norm2 and norm1 != norm2 and len(norm1) >= 4 and len(norm2) >= 4:
                    finding = ComplianceFinding(
                        application_id=application_id,
                        finding_type="Cross-Document Inconsistency",
                        title=f"Name Inconsistency: '{v1_raw}' vs '{v2_raw}'",
                        description=(
                            f"Discrepancy detected between institutional title in '{doc1.original_name}' ('{v1_raw}') "
                            f"and '{doc2.original_name}' ('{v2_raw}'). Legal title across certificates must match registered society name."
                        ),
                        severity="Medium",
                        status="Open",
                        expected_value=app.institution.name if app.institution else "Uniform registered title",
                        observed_value=f"{doc1.original_name}: '{v1_raw}' | {doc2.original_name}: '{v2_raw}'",
                        document_id=doc1.id,
                        comparison_document_id=doc2.id,
                        page_number=ef1.page_number,
                        evidence_excerpt=f"Document 1 [{doc1.category} p.{ef1.page_number}]: '{v1_raw}'\nDocument 2 [{doc2.category} p.{ef2.page_number}]: '{v2_raw}'",
                        recommended_action="Ensure the official institutional registered title is uniform across trust deed, land title, and statutory NOC certificates."
                    )
                    record_discrepancy(finding)

    # ------------------------------------------------------------------
    # 2. Academic Year Consistency
    # ------------------------------------------------------------------
    if "academic_year" in field_occurrences:
        occurrences = field_occurrences["academic_year"]
        app_ay_norm = normalize_academic_year(app.academic_year)
        for i in range(len(occurrences)):
            doc1, ef1 = occurrences[i]
            val1_norm = normalize_academic_year(ef1.verified_value or ef1.extracted_value)
            
            # Check against declared application academic year
            if app_ay_norm and val1_norm and app_ay_norm != val1_norm:
                finding = ComplianceFinding(
                    application_id=application_id,
                    finding_type="Cross-Document Inconsistency",
                    title=f"Academic Year Mismatch: '{val1_norm}' vs '{app_ay_norm}'",
                    description=(
                        f"Document '{doc1.original_name}' specifies academic year '{val1_norm}', which conflicts with "
                        f"application declaration year '{app_ay_norm}'."
                    ),
                    severity="High",
                    status="Open",
                    expected_value=app_ay_norm,
                    observed_value=f"{doc1.original_name}: {val1_norm}",
                    document_id=doc1.id,
                    page_number=ef1.page_number,
                    evidence_excerpt=f"Extracted from {doc1.original_name} (p.{ef1.page_number}): '{ef1.extracted_value}' vs Application AY: '{app.academic_year}'",
                    recommended_action="Submit renewed document valid for academic year 2026-2027 or provide renewal receipt."
                )
                record_discrepancy(finding)

            # Check pairwise across documents
            for j in range(i + 1, len(occurrences)):
                doc2, ef2 = occurrences[j]
                val2_norm = normalize_academic_year(ef2.verified_value or ef2.extracted_value)
                if val1_norm and val2_norm and val1_norm != val2_norm:
                    finding = ComplianceFinding(
                        application_id=application_id,
                        finding_type="Cross-Document Inconsistency",
                        title=f"Academic Session Conflict: '{val1_norm}' vs '{val2_norm}'",
                        description=(
                            f"Contradicting academic sessions identified between '{doc1.original_name}' ({val1_norm}) "
                            f"and '{doc2.original_name}' ({val2_norm})."
                        ),
                        severity="High",
                        status="Open",
                        expected_value=f"Uniform session ({app_ay_norm or '2026-2027'})",
                        observed_value=f"{doc1.original_name}: {val1_norm} | {doc2.original_name}: {val2_norm}",
                        document_id=doc1.id,
                        comparison_document_id=doc2.id,
                        page_number=ef1.page_number,
                        evidence_excerpt=f"Document 1 [{doc1.category} p.{ef1.page_number}]: '{val1_norm}'\nDocument 2 [{doc2.category} p.{ef2.page_number}]: '{val2_norm}'",
                        recommended_action="Ensure all submitted evidence corresponds to the current statutory approval cycle."
                    )
                    record_discrepancy(finding)

    # ------------------------------------------------------------------
    # 3. Registration Number Consistency
    # ------------------------------------------------------------------
    if "registration_number" in field_occurrences:
        occurrences = field_occurrences["registration_number"]
        for i in range(len(occurrences)):
            for j in range(i + 1, len(occurrences)):
                doc1, ef1 = occurrences[i]
                doc2, ef2 = occurrences[j]
                reg1 = re.sub(r"\s+", "", (ef1.verified_value or ef1.extracted_value or "").upper())
                reg2 = re.sub(r"\s+", "", (ef2.verified_value or ef2.extracted_value or "").upper())

                if reg1 and reg2 and reg1 != reg2:
                    finding = ComplianceFinding(
                        application_id=application_id,
                        finding_type="Cross-Document Inconsistency",
                        title=f"Registration Number Discrepancy: '{reg1}' vs '{reg2}'",
                        description=(
                            f"Registration identifier mismatch detected between '{doc1.original_name}' ({reg1}) "
                            f"and '{doc2.original_name}' ({reg2}). Trust/Society registration numbers must match exactly."
                        ),
                        severity="High",
                        status="Open",
                        expected_value="Identical Society/Trust Registration Number",
                        observed_value=f"{doc1.original_name}: {reg1} | {doc2.original_name}: {reg2}",
                        document_id=doc1.id,
                        comparison_document_id=doc2.id,
                        page_number=ef1.page_number,
                        evidence_excerpt=f"Document 1 [{doc1.category} p.{ef1.page_number}]: '{reg1}'\nDocument 2 [{doc2.category} p.{ef2.page_number}]: '{reg2}'",
                        recommended_action="Verify registration certificates from Registrar of Societies / Charity Commissioner."
                    )
                    record_discrepancy(finding)

    # ------------------------------------------------------------------
    # 4. Approved Intake Capacity Consistency
    # ------------------------------------------------------------------
    if "intake_capacity" in field_occurrences:
        occurrences = field_occurrences["intake_capacity"]
        app_intake = app.total_intake_declared or 0
        for i in range(len(occurrences)):
            doc1, ef1 = occurrences[i]
            v1 = parse_int_safe(ef1.verified_value or ef1.extracted_value)
            
            # Check against application declared intake
            if v1 is not None and app_intake > 0 and v1 != app_intake:
                finding = ComplianceFinding(
                    application_id=application_id,
                    finding_type="Cross-Document Inconsistency",
                    title=f"Intake Capacity Mismatch: Declared {app_intake} vs Document {v1}",
                    description=(
                        f"Sanctioned intake in '{doc1.original_name}' ({v1}) differs from application "
                        f"declaration ({app_intake} seats)."
                    ),
                    severity="High",
                    status="Open",
                    expected_value=f"Consistent intake ({app_intake} seats)",
                    observed_value=f"Declared: {app_intake} | {doc1.original_name}: {v1}",
                    document_id=doc1.id,
                    page_number=ef1.page_number,
                    evidence_excerpt=f"Document '{doc1.original_name}' (p.{ef1.page_number}) states: '{ef1.extracted_value}' seats.",
                    recommended_action="Adjust application intake figure or provide AICTE previous Approval Letter verifying sanctioned capacity."
                )
                record_discrepancy(finding)

            # Pairwise across documents
            for j in range(i + 1, len(occurrences)):
                doc2, ef2 = occurrences[j]
                v2 = parse_int_safe(ef2.verified_value or ef2.extracted_value)
                if v1 is not None and v2 is not None and v1 != v2:
                    finding = ComplianceFinding(
                        application_id=application_id,
                        finding_type="Cross-Document Inconsistency",
                        title=f"Cross-Document Intake Contradiction ({v1} vs {v2} seats)",
                        description=(
                            f"Contradiction identified between '{doc1.original_name}' (Intake: {v1}) "
                            f"and '{doc2.original_name}' (Intake: {v2})."
                        ),
                        severity="High",
                        status="Open",
                        expected_value=f"Consistent intake (e.g. {max(v1, v2)} seats)",
                        observed_value=f"{doc1.original_name}: {v1} | {doc2.original_name}: {v2}",
                        document_id=doc1.id,
                        comparison_document_id=doc2.id,
                        page_number=ef1.page_number,
                        evidence_excerpt=f"Doc 1 [{doc1.category}]: {v1} seats\nDoc 2 [{doc2.category}]: {v2} seats",
                        recommended_action="Ensure branch-wise intake breakdown aligns across academic roster and approval documents."
                    )
                    record_discrepancy(finding)

    # ------------------------------------------------------------------
    # 5. Faculty Count Consistency
    # ------------------------------------------------------------------
    if "faculty_count" in field_occurrences:
        occurrences = field_occurrences["faculty_count"]
        app_faculty = app.total_faculty_declared or 0
        for i in range(len(occurrences)):
            doc1, ef1 = occurrences[i]
            v1 = parse_int_safe(ef1.verified_value or ef1.extracted_value)
            
            # Check against application declared faculty
            if v1 is not None and app_faculty > 0 and v1 != app_faculty:
                finding = ComplianceFinding(
                    application_id=application_id,
                    finding_type="Cross-Document Inconsistency",
                    title=f"Faculty Count Discrepancy: Declared {app_faculty} vs Document {v1}",
                    description=(
                        f"Faculty muster total in '{doc1.original_name}' ({v1}) does not match "
                        f"application declaration ({app_faculty} faculty members)."
                    ),
                    severity="High",
                    status="Open",
                    expected_value=f"{app_faculty} faculty members",
                    observed_value=f"Declared: {app_faculty} | {doc1.original_name}: {v1}",
                    document_id=doc1.id,
                    page_number=ef1.page_number,
                    evidence_excerpt=f"Document '{doc1.original_name}' (p.{ef1.page_number}) muster shows: {v1} faculty members.",
                    recommended_action="Verify biometric muster rolls and upload an explanatory staff roster affidavit."
                )
                record_discrepancy(finding)

            # Pairwise across documents
            for j in range(i + 1, len(occurrences)):
                doc2, ef2 = occurrences[j]
                v2 = parse_int_safe(ef2.verified_value or ef2.extracted_value)
                if v1 is not None and v2 is not None and v1 != v2:
                    finding = ComplianceFinding(
                        application_id=application_id,
                        finding_type="Cross-Document Inconsistency",
                        title=f"Cross-Document Faculty Discrepancy ({v1} vs {v2})",
                        description=(
                            f"Discrepancy detected between '{doc1.original_name}' (Faculty Count: {v1}) "
                            f"and '{doc2.original_name}' (Faculty Count: {v2}). "
                            f"Declared in application summary: {app_faculty}."
                        ),
                        severity="High",
                        status="Open",
                        expected_value=f"Consistent count (e.g. {max(v1, v2)})",
                        observed_value=f"{doc1.original_name}: {v1} | {doc2.original_name}: {v2}",
                        document_id=doc1.id,
                        comparison_document_id=doc2.id,
                        page_number=ef1.page_number,
                        evidence_excerpt=f"Document 1 [{doc1.category} p.{ef1.page_number}]: '{v1}'\nDocument 2 [{doc2.category} p.{ef2.page_number}]: '{v2}'",
                        recommended_action="Review appointment orders and payroll muster rolls. Submit an explanatory affidavit with verified staff roster."
                    )
                    record_discrepancy(finding)

    # ------------------------------------------------------------------
    # 6. Land Area Consistency
    # ------------------------------------------------------------------
    if "land_area_acres" in field_occurrences:
        occurrences = field_occurrences["land_area_acres"]
        app_land = app.land_area_acres or 0.0
        for i in range(len(occurrences)):
            doc1, ef1 = occurrences[i]
            v1 = parse_float_safe(ef1.verified_value or ef1.extracted_value)

            # Check against application declaration
            if v1 is not None and app_land > 0.0 and abs(v1 - app_land) > 0.2:
                finding = ComplianceFinding(
                    application_id=application_id,
                    finding_type="Cross-Document Inconsistency",
                    title=f"Land Area Discrepancy: Declared {app_land:.2f} Acres vs Document {v1:.2f} Acres",
                    description=(
                        f"Land area in '{doc1.original_name}' ({v1:.2f} Acres) diverges from declared "
                        f"holding ({app_land:.2f} Acres)."
                    ),
                    severity="High",
                    status="Open",
                    expected_value=f"{app_land:.2f} contiguous Acres",
                    observed_value=f"Declared: {app_land:.2f} | {doc1.original_name}: {v1:.2f}",
                    document_id=doc1.id,
                    page_number=ef1.page_number,
                    evidence_excerpt=f"Extracted from {doc1.original_name} (p.{ef1.page_number}): '{v1:.2f} Acres'",
                    recommended_action="Upload registered sale deeds or mutation entries supporting the claimed contiguous acreage."
                )
                record_discrepancy(finding)

            # Pairwise
            for j in range(i + 1, len(occurrences)):
                doc2, ef2 = occurrences[j]
                v2 = parse_float_safe(ef2.verified_value or ef2.extracted_value)
                if v1 is not None and v2 is not None and abs(v1 - v2) > 0.2:
                    finding = ComplianceFinding(
                        application_id=application_id,
                        finding_type="Cross-Document Inconsistency",
                        title=f"Land Holding Variance: {v1:.2f} vs {v2:.2f} Acres",
                        description=(
                            f"Acreage divergence observed between '{doc1.original_name}' ({v1:.2f} Acres) "
                            f"and '{doc2.original_name}' ({v2:.2f} Acres)."
                        ),
                        severity="High",
                        status="Open",
                        expected_value=f"Consistent contiguous acreage ({app_land:.2f} Acres)",
                        observed_value=f"{doc1.original_name}: {v1:.2f} Acres | {doc2.original_name}: {v2:.2f} Acres",
                        document_id=doc1.id,
                        comparison_document_id=doc2.id,
                        page_number=ef1.page_number,
                        evidence_excerpt=f"Doc 1 [{doc1.category}]: {v1:.2f} Acres\nDoc 2 [{doc2.category}]: {v2:.2f} Acres",
                        recommended_action="Submit demarcation certificate by competent revenue authority."
                    )
                    record_discrepancy(finding)

    # ------------------------------------------------------------------
    # 7. Built-up Area Consistency
    # ------------------------------------------------------------------
    if "built_up_area_sqm" in field_occurrences:
        occurrences = field_occurrences["built_up_area_sqm"]
        app_area = app.built_up_area_sqm or 0.0
        for i in range(len(occurrences)):
            doc1, ef1 = occurrences[i]
            v1 = parse_float_safe(ef1.verified_value or ef1.extracted_value)

            # Check against application declaration
            if v1 is not None and app_area > 0.0 and abs(v1 - app_area) > 100.0:
                finding = ComplianceFinding(
                    application_id=application_id,
                    finding_type="Cross-Document Inconsistency",
                    title=f"Built-up Area Variance: Declared {app_area:.1f} sqm vs Document {v1:.1f} sqm",
                    description=(
                        f"Covered carpet area in '{doc1.original_name}' ({v1:.1f} sqm) differs from "
                        f"application declaration ({app_area:.1f} sqm)."
                    ),
                    severity="High",
                    status="Open",
                    expected_value=f"{app_area:.1f} sqm instructional built-up area",
                    observed_value=f"Declared: {app_area:.1f} sqm | {doc1.original_name}: {v1:.1f} sqm",
                    document_id=doc1.id,
                    page_number=ef1.page_number,
                    evidence_excerpt=f"Extracted from {doc1.original_name} (p.{ef1.page_number}): '{v1:.1f} sqm'",
                    recommended_action="Provide updated architect certificate and sanctioned municipal building floor plans."
                )
                record_discrepancy(finding)

            # Pairwise
            for j in range(i + 1, len(occurrences)):
                doc2, ef2 = occurrences[j]
                v2 = parse_float_safe(ef2.verified_value or ef2.extracted_value)
                if v1 is not None and v2 is not None and abs(v1 - v2) > 150.0:
                    finding = ComplianceFinding(
                        application_id=application_id,
                        finding_type="Cross-Document Inconsistency",
                        title=f"Area Discrepancy: {v1:.1f} sqm vs {v2:.1f} sqm",
                        description=(
                            f"Built-up area mismatch between architect certificate in '{doc1.original_name}' "
                            f"({v1:.1f} sqm) and building plan approval in '{doc2.original_name}' ({v2:.1f} sqm)."
                        ),
                        severity="High",
                        status="Open",
                        expected_value=f"Verified plan area matching application ({app_area:.1f} sqm)",
                        observed_value=f"{doc1.original_name}: {v1:.1f} sqm | {doc2.original_name}: {v2:.1f} sqm",
                        document_id=doc1.id,
                        comparison_document_id=doc2.id,
                        page_number=ef1.page_number,
                        evidence_excerpt=f"Architect endorsement: {v1:.1f} sqm. Municipality approval: {v2:.1f} sqm.",
                        recommended_action="Provide updated occupancy certificate or architect justification for instructional area additions."
                    )
                    record_discrepancy(finding)

    # ------------------------------------------------------------------
    # 8. NOC Reference Number Consistency
    # ------------------------------------------------------------------
    if "noc_reference" in field_occurrences:
        occurrences = field_occurrences["noc_reference"]
        for i in range(len(occurrences)):
            for j in range(i + 1, len(occurrences)):
                doc1, ef1 = occurrences[i]
                doc2, ef2 = occurrences[j]
                # Compare only if both documents refer to the same authority/category
                cat1 = doc1.category.lower()
                cat2 = doc2.category.lower()
                if ("fire" in cat1 and "fire" in cat2) or ("registration" in cat1 and "registration" in cat2):
                    n1 = re.sub(r"\s+", "", (ef1.verified_value or ef1.extracted_value or "").upper())
                    n2 = re.sub(r"\s+", "", (ef2.verified_value or ef2.extracted_value or "").upper())
                    if n1 and n2 and n1 != n2:
                        finding = ComplianceFinding(
                            application_id=application_id,
                            finding_type="Cross-Document Inconsistency",
                            title=f"NOC Reference Conflict: '{n1}' vs '{n2}'",
                            description=(
                                f"Inconsistent statutory NOC clearance numbers identified between "
                                f"'{doc1.original_name}' ({n1}) and '{doc2.original_name}' ({n2})."
                            ),
                            severity="High",
                            status="Open",
                            expected_value="Uniform Statutory NOC Reference Number",
                            observed_value=f"{doc1.original_name}: {n1} | {doc2.original_name}: {n2}",
                            document_id=doc1.id,
                            comparison_document_id=doc2.id,
                            page_number=ef1.page_number,
                            evidence_excerpt=f"Doc 1 [{doc1.category}]: '{n1}'\nDoc 2 [{doc2.category}]: '{n2}'",
                            recommended_action="Submit verified NOC copy certified by the issuing government department."
                        )
                        record_discrepancy(finding)

    # ------------------------------------------------------------------
    # 9. Relevant Dates and Validity Periods
    # ------------------------------------------------------------------
    if "validity_date" in field_occurrences:
        occurrences = field_occurrences["validity_date"]
        today = date.today()
        # Statutory threshold: certificates must be valid for at least the start of current session
        for i in range(len(occurrences)):
            doc1, ef1 = occurrences[i]
            d1 = parse_date_safe(ef1.verified_value or ef1.extracted_value)
            if d1 is not None:
                # Check expired certificate
                if d1 < today:
                    finding = ComplianceFinding(
                        application_id=application_id,
                        finding_type="Cross-Document Inconsistency",
                        title=f"Expired Statutory Certificate: '{doc1.original_name}'",
                        description=(
                            f"The validity date in '{doc1.original_name}' expired on {d1.strftime('%d-%m-%Y')} "
                            f"(prior to current approval review date {today.strftime('%d-%m-%Y')})."
                        ),
                        severity="Critical",
                        status="Open",
                        expected_value=f"Valid through session (>= {today.strftime('%d-%m-%Y')})",
                        observed_value=f"Expired: {d1.strftime('%d-%m-%Y')}",
                        document_id=doc1.id,
                        page_number=ef1.page_number,
                        evidence_excerpt=f"Extracted from {doc1.original_name} (p.{ef1.page_number}): Validity/Expiry '{ef1.extracted_value}'",
                        recommended_action="Upload official renewal certificate from issuing directorate."
                    )
                    record_discrepancy(finding)

    db.commit()
    return new_findings
