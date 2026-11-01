import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.application import Application
from app.models.document import Document, ExtractedField
from app.models.user import User
from app.schemas.document import DocumentResponse, ExtractedFieldResponse, ExtractedFieldUpdate
from app.api.deps import get_current_user
from app.services.document_service import save_uploaded_file, process_document
from app.services.audit_service import log_audit_event
from app.services.consistency_engine import check_cross_document_consistency

router = APIRouter(tags=["Documents"])

def build_doc_response(doc: Document) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        application_id=doc.application_id,
        category=doc.category,
        file_name=doc.file_name,
        original_name=doc.original_name,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        file_hash=doc.file_hash,
        version=doc.version,
        extraction_status=doc.extraction_status,
        raw_text=doc.raw_text,
        page_count=doc.page_count,
        uploaded_by_user_id=doc.uploaded_by_user_id,
        uploaded_by_name=doc.uploaded_by_user.full_name if doc.uploaded_by_user else None,
        extracted_fields=[
            ExtractedFieldResponse.from_orm(ef) for ef in doc.extracted_fields
        ],
        created_at=doc.created_at,
        updated_at=doc.updated_at
    )

@router.get("/applications/{application_id}/documents", response_model=List[DocumentResponse])
def get_application_documents(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if current_user.role == "reviewer" and app.assigned_reviewer_id is not None and app.assigned_reviewer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    docs = db.query(Document).filter(Document.application_id == application_id).all()
    return [build_doc_response(d) for d in docs]

@router.post("/applications/{application_id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    application_id: int,
    file: UploadFile = File(...),
    category: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if current_user.role == "reviewer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reviewers are not permitted to upload application documents.")

    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    clean_filename, file_path, file_size, file_hash = save_uploaded_file(file, application_id)

    # Check version count for this category
    existing_count = db.query(Document).filter(
        Document.application_id == application_id,
        Document.category == category
    ).count()

    doc = Document(
        application_id=application_id,
        category=category,
        file_name=clean_filename,
        original_name=file.filename or clean_filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type,
        file_hash=file_hash,
        version=existing_count + 1,
        extraction_status="Uploaded",
        uploaded_by_user_id=current_user.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Automatically trigger text extraction and field identification
    process_document(db, doc)

    # Run cross-document consistency checks
    check_cross_document_consistency(db, application_id)

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="DOCUMENT_UPLOADED",
        actor_id=current_user.id,
        application_id=application_id,
        details={
            "document_id": doc.id,
            "filename": doc.original_name,
            "category": category,
            "hash": file_hash[:16]
        }
    )

    db.refresh(doc)
    return build_doc_response(doc)

@router.get("/documents/{id}", response_model=DocumentResponse)
def get_document(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    app = doc.application
    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if current_user.role == "reviewer" and app.assigned_reviewer_id is not None and app.assigned_reviewer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return build_doc_response(doc)

@router.get("/documents/{id}/download")
@router.get("/documents/{id}/preview")
def preview_document(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    app = doc.application
    if current_user.role == "institution" and current_user.institution_id != app.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if current_user.role == "reviewer" and app.assigned_reviewer_id is not None and app.assigned_reviewer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if os.path.exists(doc.file_path):
        return FileResponse(doc.file_path, media_type=doc.mime_type, filename=doc.original_name)
    else:
        # Fallback to simulated preview of extracted text
        return PlainTextResponse(f"Document File Preview: {doc.original_name}\n\n{doc.raw_text or 'No preview text.'}")

@router.post("/documents/{id}/process", response_model=DocumentResponse)
def reprocess_document(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    processed = process_document(db, doc)
    check_cross_document_consistency(db, doc.application_id)
    return build_doc_response(processed)

@router.patch("/documents/{id}/fields/{field_id}", response_model=ExtractedFieldResponse)
def update_extracted_field(
    id: int,
    field_id: int,
    data: ExtractedFieldUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    field = db.query(ExtractedField).filter(
        ExtractedField.id == field_id,
        ExtractedField.document_id == id
    ).first()
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extracted field not found.")

    field.verified_value = data.verified_value
    field.is_verified = data.is_verified
    db.commit()
    db.refresh(field)

    # Re-evaluate cross-document consistency
    doc = db.query(Document).filter(Document.id == id).first()
    if doc:
        check_cross_document_consistency(db, doc.application_id)

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="EXTRACTED_FIELD_VERIFIED",
        actor_id=current_user.id,
        application_id=doc.application_id if doc else None,
        details={"field_id": field.id, "field_name": field.field_name, "verified_value": data.verified_value}
    )

    return field

@router.delete("/documents/{id}", status_code=status.HTTP_200_OK)
def delete_document(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    if current_user.role == "institution":
        app = db.query(Application).filter(Application.id == doc.application_id).first()
        if app and app.institution_id != current_user.institution_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    from app.models.compliance import ComplianceFinding
    db.query(ComplianceFinding).filter(
        (ComplianceFinding.document_id == doc.id) | (ComplianceFinding.comparison_document_id == doc.id)
    ).delete(synchronize_session=False)

    db.delete(doc)
    db.commit()
    return {"status": "success", "message": f"Document '{doc.original_name}' deleted."}

@router.delete("/documents", status_code=status.HTTP_200_OK)
def delete_all_documents(
    application_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Document)
    if application_id:
        query = query.filter(Document.application_id == application_id)
    elif current_user.role == "institution":
        query = query.join(Application).filter(Application.institution_id == current_user.institution_id)

    from app.models.compliance import ComplianceFinding
    docs = query.all()
    count = len(docs)
    for doc in docs:
        db.query(ComplianceFinding).filter(
            (ComplianceFinding.document_id == doc.id) | (ComplianceFinding.comparison_document_id == doc.id)
        ).delete(synchronize_session=False)
        db.delete(doc)
    db.commit()
    return {"status": "success", "message": f"{count} document(s) deleted."}
