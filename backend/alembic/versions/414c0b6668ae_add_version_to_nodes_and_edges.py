"""add_version_to_nodes_and_edges

Revision ID: 414c0b6668ae
Revises: fee9c6681d07
Create Date: 2026-10-19 21:05:18.323787

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '414c0b6668ae'
down_revision: Union[str, Sequence[str], None] = 'fee9c6681d07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'nodes',
        sa.Column('version', sa.Integer(), nullable=False, server_default='1')
    )
    op.add_column(
        'edges',
        sa.Column('version', sa.Integer(), nullable=False, server_default='1')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('edges', 'version')
    op.drop_column('nodes', 'version')
