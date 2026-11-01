import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger("aicte_smartapproval.database")

Base = declarative_base()

def get_engine():
    try:
        # First attempt with configured DATABASE_URL (MySQL 8)
        engine = create_engine(
            settings.DATABASE_URL,
            echo=settings.SQL_ECHO,
            pool_pre_ping=True,
            pool_recycle=3600
        )
        # Test connection
        with engine.connect() as conn:
            pass
        logger.info(f"Connected successfully to configured database: {settings.DATABASE_URL.split('@')[-1]}")
        return engine
    except Exception as e:
        logger.warning(f"Could not connect to MySQL ({e}). Falling back to local SQLite database.")
        sqlite_url = "sqlite:///./aicte_smartapproval.db"
        engine = create_engine(
            sqlite_url,
            connect_args={"check_same_thread": False},
            echo=settings.SQL_ECHO
        )
        return engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
