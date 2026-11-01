from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import os
import sys

# Append backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine
from app.config import settings

# Import all models to register with Base.metadata
from app.models.user import User
from app.models.institution import Institution
from app.models.application import Application, WorkflowEvent
from app.models.document import Document, ExtractedField
from app.models.compliance import ComplianceRule, ComplianceAssessment, ComplianceFinding
from app.models.reviewer import ReviewerComment
from app.models.deadline import Deadline, Notification, NotificationPreference
from app.models.audit import AuditEvent
from app.models.policy import PolicySource

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = str(engine.url)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
