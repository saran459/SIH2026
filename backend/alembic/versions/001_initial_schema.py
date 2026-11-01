"""Initial schema baseline

Revision ID: 001_initial
Revises: 
Create Date: 2026-10-23 18:22:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Tables are already managed and created by SQLAlchemy Base.metadata.create_all
    pass

def downgrade() -> None:
    pass
