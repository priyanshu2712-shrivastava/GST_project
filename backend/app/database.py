"""
Database Setup
==============
SQLAlchemy engine + session factory.

WHY SQLite?
- Zero setup, single file, easy to demo in viva
- Sufficient for MVP handling thousands of bills
- Swap to Postgres by changing DATABASE_URL in .env
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings


# SQLite needs check_same_thread=False for FastAPI's multi-threaded requests
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,  # Set True for SQL debug logging
    pool_pre_ping=True,  # Test connections before use — reconnects stale ones
    pool_recycle=300,  # Recycle connections every 5 min (Neon closes idle ones)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a database session.
    Automatically closes when the request ends.

    Usage:
        def endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
