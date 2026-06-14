# ============================================================
# app/database/connection.py
# Conexión a PostgreSQL con SQLAlchemy
# ============================================================

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import structlog

logger = structlog.get_logger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://honeypot_user:honeypot_pass@localhost:5432/honeypot_psd2"
)

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


def get_db():
    """Dependency de FastAPI para inyectar sesión de BBDD."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """Crea todas las tablas al arrancar la aplicación."""
    from app.database.models import Base
    Base.metadata.create_all(bind=engine)
    logger.info("base_de_datos_inicializada")


def check_db():
    """Verifica que la conexión a PostgreSQL funciona."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("conexion_bbdd_ok")
        return True
    except Exception as exc:
        logger.error("conexion_bbdd_failed", error=str(exc))
        return False