"""invites_and_user_tier

Revision ID: c3c1b58a9f23
Revises: a76aff43b5a8
Create Date: 2026-01-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3c1b58a9f23'
down_revision: Union[str, Sequence[str], None] = 'a76aff43b5a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('tier', sa.String(), nullable=False, server_default='standard'))
    op.create_index(op.f('ix_users_tier'), 'users', ['tier'], unique=False)

    op.create_table(
        'invites',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('token_hash', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_invites_created_by'), 'invites', ['created_by'], unique=False)
    op.create_index(op.f('ix_invites_email'), 'invites', ['email'], unique=False)
    op.create_index('ix_invites_email_created', 'invites', ['email', 'created_at', 'id'], unique=False)
    op.create_index(op.f('ix_invites_expires_at'), 'invites', ['expires_at'], unique=False)
    op.create_index(op.f('ix_invites_token_hash'), 'invites', ['token_hash'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_invites_token_hash'), table_name='invites')
    op.drop_index(op.f('ix_invites_expires_at'), table_name='invites')
    op.drop_index('ix_invites_email_created', table_name='invites')
    op.drop_index(op.f('ix_invites_email'), table_name='invites')
    op.drop_index(op.f('ix_invites_created_by'), table_name='invites')
    op.drop_table('invites')

    op.drop_index(op.f('ix_users_tier'), table_name='users')
    op.drop_column('users', 'tier')
