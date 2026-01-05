"""stripe_webhook_events

Revision ID: d5cfd5be4e57
Revises: a76aff43b5a8
Create Date: 2026-01-05 11:51:43.839389

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5cfd5be4e57'
down_revision: Union[str, Sequence[str], None] = 'a76aff43b5a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'stripe_webhook_events',
        sa.Column('event_id', sa.String(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('processed_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('event_id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('stripe_webhook_events')
