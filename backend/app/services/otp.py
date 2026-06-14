import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database.models import OTP
from app.services.email import generar_codigo_otp, enviar_otp_email
import structlog

logger = structlog.get_logger(__name__)


def generar_y_enviar_otp_sync(email: str, nombre: str) -> None:
    """Completamente síncrona — se ejecuta en hilo separado."""
    from app.database.connection import SessionLocal
    db = SessionLocal()
    try:
        db.query(OTP).filter(OTP.email == email, OTP.usado == False).update({"usado": True})
        db.commit()

        codigo     = generar_codigo_otp()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        db.add(OTP(email=email, codigo=codigo, usado=False, expires_at=expires_at))
        db.commit()

        enviado = enviar_otp_email(email, codigo, nombre)
        logger.info("otp_enviado", email=email, enviado=enviado)
    except Exception as exc:
        logger.error("otp_error", email=email, error=str(exc))
    finally:
        db.close()


def verificar_otp(db: Session, email: str, codigo: str) -> bool:
    ahora = datetime.now(timezone.utc)
    otp = db.query(OTP).filter(
        OTP.email  == email,
        OTP.codigo == codigo,
        OTP.usado  == False,
        OTP.expires_at > ahora,
    ).first()

    if not otp:
        logger.warning("otp_invalido", email=email)
        return False

    otp.usado = True
    db.commit()
    logger.info("otp_verificado", email=email)
    return True