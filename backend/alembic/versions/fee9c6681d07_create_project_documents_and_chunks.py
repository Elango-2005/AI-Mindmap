"""create_project_documents_and_chunks

Revision ID: fee9c6681d07
Revises: efc6f9aa6a67
Create Date: 2026-10-18 21:57:13.119242

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fee9c6681d07'
down_revision: Union[str, Sequence[str], None] = 'efc6f9aa6a67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from sqlalchemy.dialects import postgresql

def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'project_documents',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_type', sa.String(length=50), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('chunk_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_documents_project_id'), 'project_documents', ['project_id'], unique=False)

    op.create_table(
        'document_chunks',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('document_id', sa.UUID(), nullable=False),
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=True),
        sa.Column('embedding', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['project_documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_document_chunks_document_id'), 'document_chunks', ['document_id'], unique=False)
    op.create_index(op.f('ix_document_chunks_project_id'), 'document_chunks', ['project_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_document_chunks_project_id'), table_name='document_chunks')
    op.drop_index(op.f('ix_document_chunks_document_id'), table_name='document_chunks')
    op.drop_table('document_chunks')
    op.drop_index(op.f('ix_project_documents_project_id'), table_name='project_documents')
    op.drop_table('project_documents')
