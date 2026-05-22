from sqlalchemy import Column, Text, DateTime, ForeignKey, Index, UniqueConstraint
from database.base import Base


class Entitlement(Base):
    __tablename__ = "entitlements"

    id = Column(Text, primary_key=True)
    type = Column(Text, nullable=False)
    subscription_id = Column(Text, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=True)
    app_id = Column(Text, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    plan_id = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    ends_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("subscription_id", "app_id"),
        Index("entitlements_subscription_id", "subscription_id"),
        Index("entitlements_app_id", "app_id"),
    )
