"""add_importance_score_to_nodes

Revision ID: efc6f9aa6a67
Revises: da1f3c1301da
Create Date: 2026-10-14 21:28:24.824368

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'efc6f9aa6a67'
down_revision: Union[str, Sequence[str], None] = 'da1f3c1301da'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'nodes',
        sa.Column('importance_score', sa.Float(), nullable=False, server_default='1.0')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('nodes', 'importance_score')
