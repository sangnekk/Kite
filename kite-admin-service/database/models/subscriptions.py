from sqlalchemy import Column, Text, DateTime, ForeignKey, Index
from database.base import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Text, primary_key=True)
    display_name = Column(Text, nullable=False)
    source = Column(Text, nullable=False)
    status = Column(Text, nullable=False)
    status_formatted = Column(Text, nullable=False)
    user_id = Column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    renews_at = Column(DateTime, nullable=False)
    trial_ends_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    lemonsqueezy_subscription_id = Column(Text, unique=True, nullable=True)
    lemonsqueezy_customer_id = Column(Text, nullable=True)
    lemonsqueezy_order_id = Column(Text, nullable=True)
    lemonsqueezy_product_id = Column(Text, nullable=True)
    lemonsqueezy_variant_id = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

    __table_args__ = (
        Index("subscriptions_user_id", "user_id"),
    )
