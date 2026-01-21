"""
SQLAlchemy models for Order Worker.
Maps to db_orders schema in PostgreSQL.
"""
import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, Integer, Numeric, DateTime, Text, String,
    Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class OrderStatus(str, PyEnum):
    """Order status enumeration matching database constraint."""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Order(Base):
    """
    Order model mapping to db_orders.orders table.
    
    Table schema:
    - id: SERIAL PRIMARY KEY
    - order_uuid: UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()
    - user_id: UUID NOT NULL
    - event_id: INTEGER NOT NULL
    - seat_id: INTEGER NOT NULL
    - total_amount: DECIMAL(10,2) NOT NULL
    - status: order_status NOT NULL DEFAULT 'PENDING'
    - qr_code_hash: TEXT
    - processing_complexity: INTEGER
    - payment_reference: VARCHAR(255)
    - error_message: TEXT
    - created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    - updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    - completed_at: TIMESTAMP
    """
    __tablename__ = "orders"
    __table_args__ = {"schema": "db_orders"}
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_uuid = Column(UUID(as_uuid=True), unique=True, nullable=False, index=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    event_id = Column(Integer, nullable=False, index=True)
    seat_id = Column(Integer, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), nullable=False, default='PENDING')
    qr_code_hash = Column(Text, nullable=True)
    processing_complexity = Column(Integer, nullable=True)
    payment_reference = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<Order(uuid={self.order_uuid}, status={self.status})>"
    
    def to_dict(self) -> dict:
        """Convert order to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "order_uuid": str(self.order_uuid) if self.order_uuid else None,
            "user_id": str(self.user_id) if self.user_id else None,
            "event_id": self.event_id,
            "seat_id": self.seat_id,
            "total_amount": float(self.total_amount) if self.total_amount else 0.0,
            "status": self.status,
            "qr_code_hash": self.qr_code_hash,
            "processing_complexity": self.processing_complexity,
            "payment_reference": self.payment_reference,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
