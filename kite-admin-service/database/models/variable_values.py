from sqlalchemy import Column, Text, DateTime, BigInteger, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from database.base import Base


class VariableValue(Base):
    __tablename__ = "variable_values"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    variable_id = Column(Text, ForeignKey("variables.id", ondelete="CASCADE"), nullable=False)
    scope = Column(Text, nullable=True)
    value = Column(JSONB, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

    __table_args__ = (
        UniqueConstraint("variable_id", "scope"),
        Index("variable_values_variable_id", "variable_id"),
        Index("variable_values_scope", "scope"),
    )
