import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.config import settings
from app.database import engine, Base
from app.api import (
    auth,
    dashboard,
    institutions,
    applications,
    documents,
    compliance,
    digital_twin,
    notifications,
    reports,
    audit,
    policy_assistant,
    users,
    verification_jobs,
    external_verification
)
from app.middleware import AuditLoggingMiddleware
from app.seed.seed_data import init_system_baseline
from app.services.job_queue import recover_pending_jobs

# Create tables on startup
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("AICTE SmartApproval Backend Starting...")
    try:
        init_system_baseline()
    except Exception as e:
        print(f"Startup baseline notice: {e}")
    try:
        recover_pending_jobs()
    except Exception as e:
        print(f"Startup verification jobs recovery notice: {e}")
    yield

app = FastAPI(
    title="AICTE SmartApproval API",
    description="Integrated AICTE Approval Workflow Automation, Compliance Monitoring, and Digital Twin System (SIH Prototype / Demonstration Environment)",
    version="1.0.0",
    lifespan=lifespan
)

logger = logging.getLogger("aicte_smartapproval.api")

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        errors.append(f"{loc}: {msg}")
    return JSONResponse(
        status_code=422,
        content={"detail": f"Request validation failed: {'; '.join(errors)}"}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled server error at {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. The incident has been safely logged."}
    )

# CORS configuration with explicit allowed origins for Institution and Reviewer portals
app.add_middleware(AuditLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_origin_regex=settings.ALLOWED_ORIGIN_REGEX if settings.ALLOWED_ORIGIN_REGEX else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory & forensic subdirectories exist and mount static file handler
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "ela_artifacts"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers (mounted both at /api and at root for foolproof compatibility)
for pfx in ["/api", ""]:
    app.include_router(auth.router, prefix=pfx)
    app.include_router(dashboard.router, prefix=pfx)
    app.include_router(institutions.router, prefix=pfx)
    app.include_router(applications.router, prefix=pfx)
    app.include_router(documents.router, prefix=pfx)
    app.include_router(compliance.router, prefix=pfx)
    app.include_router(digital_twin.router, prefix=pfx)
    app.include_router(notifications.router, prefix=pfx)
    app.include_router(reports.router, prefix=pfx)
    app.include_router(audit.router, prefix=pfx)
    app.include_router(policy_assistant.router, prefix=pfx)
    app.include_router(users.router, prefix=pfx)
    app.include_router(verification_jobs.router, prefix=pfx)
    app.include_router(external_verification.router, prefix=pfx)

@app.get("/")
def root():
    return {
        "system": "AICTE SmartApproval",
        "description": "SIH Demonstration Environment / Prototype",
        "version": "1.0.0",
        "status": "operational",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "aicte-smartapproval-backend"}
