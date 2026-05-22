from sqlalchemy import Column, Text, Integer, DateTime, ForeignKey, Index, text
from database.base import Base


class PaymentSession(Base):
    __tablename__ = "payment_sessions"

    id = Column(Text, primary_key=True)
    provider = Column(Text, nullable=False)
    payment_id = Column(Text, unique=True, nullable=False)
    app_id = Column(Text, ForeignKey("apps.id", ondelete="CASCADE"), nullable=False)
    plan_id = Column(Text, nullable=False)
    amount = Column(Integer, nullable=False)
    qr_image_url = Column(Text, nullable=False)
    qr_content = Column(Text, nullable=False)
    status = Column(Text, nullable=False)
    provider_transaction_id = Column(Text, nullable=True)
    raw_webhook_payload = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    paid_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("payment_sessions_app_id", "app_id"),
        Index("payment_sessions_status", "status"),
        Index("payment_sessions_provider_transaction_id", "provider", "provider_transaction_id", unique=True, postgresql_where=text("provider_transaction_id IS NOT NULL")),
    )
