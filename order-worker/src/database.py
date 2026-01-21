"""
Database connection and session management.
Uses synchronous SQLAlchemy for simplicity in daemon pattern.
"""
import logging
from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError

from .config import settings
from .models import Base

logger = logging.getLogger(__name__)

# Create engine with connection pooling
engine = create_engine(
    settings.database_url,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,  # Verify connections before use
    echo=False  # Set to True for SQL debugging
)

# Session factory
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_database():
    """
    Initialize database connection and verify schema exists.
    Does NOT create tables - assumes they exist from migrations.
    """
    try:
        with engine.connect() as conn:
            # Set search path to db_orders schema
            conn.execute(text(f"SET search_path TO {settings.db_schema}"))
            conn.commit()
            
            # Verify connection
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
            
            logger.info(f"Database connection established to {settings.db_host}:{settings.db_port}/{settings.db_name}")
            logger.info(f"Using schema: {settings.db_schema}")
            return True
    except SQLAlchemyError as e:
        logger.error(f"Failed to connect to database: {e}")
        raise


@contextmanager
def get_session() -> Session:
    """
    Context manager for database sessions.
    Automatically handles commit/rollback and schema search path.
    
    Usage:
        with get_session() as session:
            order = session.query(Order).filter_by(order_uuid=uuid).first()
    """
    session = SessionLocal()
    try:
        # Set search path for this session
        session.execute(text(f"SET search_path TO {settings.db_schema}"))
        yield session
        session.commit()
    except SQLAlchemyError as e:
        session.rollback()
        logger.error(f"Database error, rolling back: {e}")
        raise
    finally:
        session.close()


def health_check() -> bool:
    """Check database connectivity for health endpoint."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
