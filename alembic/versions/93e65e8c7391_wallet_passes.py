"""wallet_passes

Revision ID: 93e65e8c7391
Revises: d5cfd5be4e57
Create Date: 2026-01-09 00:53:17.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '93e65e8c7391'
down_revision: Union[str, Sequence[str], None] = 'd5cfd5be4e57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'wallet_passes',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('profile_id', sa.String(), nullable=False),
        sa.Column('fingerprint', sa.String(), nullable=False),
        sa.Column('pass_serial', sa.String(), nullable=False),
        sa.Column('device_library_id', sa.String(), nullable=True),
        sa.Column('auth_token_hash', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['profile_id'], ['profiles.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('fingerprint', name='uq_wallet_pass_fingerprint'),
        sa.UniqueConstraint('pass_serial', name='uq_wallet_pass_serial'),
    )
    op.create_index(op.f('ix_wallet_passes_auth_token_hash'), 'wallet_passes', ['auth_token_hash'], unique=False)
    op.create_index(op.f('ix_wallet_passes_fingerprint'), 'wallet_passes', ['fingerprint'], unique=False)
    op.create_index(op.f('ix_wallet_passes_pass_serial'), 'wallet_passes', ['pass_serial'], unique=False)
    op.create_index(op.f('ix_wallet_passes_profile_id'), 'wallet_passes', ['profile_id'], unique=False)
    op.create_index(op.f('ix_wallet_passes_user_id'), 'wallet_passes', ['user_id'], unique=False)
    op.create_index('ix_wallet_pass_user_profile', 'wallet_passes', ['user_id', 'profile_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_wallet_pass_user_profile', table_name='wallet_passes')
    op.drop_index(op.f('ix_wallet_passes_user_id'), table_name='wallet_passes')
    op.drop_index(op.f('ix_wallet_passes_profile_id'), table_name='wallet_passes')
    op.drop_index(op.f('ix_wallet_passes_pass_serial'), table_name='wallet_passes')
    op.drop_index(op.f('ix_wallet_passes_fingerprint'), table_name='wallet_passes')
    op.drop_index(op.f('ix_wallet_passes_auth_token_hash'), table_name='wallet_passes')
    op.drop_table('wallet_passes')
