# ============================================================
# app/database/repository.py
# Operaciones CRUD para cada tabla del honeypot
# ============================================================

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.models import Evento, Credencial, Token, Alerta, AuthCode
import structlog

logger = structlog.get_logger(__name__)


# ============================================================
# EVENTOS
# ============================================================

def guardar_evento(db: Session, evento: dict) -> None:
    try:
        geo = evento.get("geo", {})
        db_evento = Evento(
            ip_origen       = evento.get("ip_origen"),
            puerto_origen   = evento.get("puerto_origen"),
            metodo_http     = evento.get("metodo_http"),
            path            = evento.get("path"),
            query_params    = evento.get("query_params"),
            headers         = evento.get("headers"),
            user_agent      = evento.get("user_agent"),
            content_type    = evento.get("content_type"),
            payload         = evento.get("payload"),
            ja3_fingerprint = evento.get("ja3_fingerprint"),
            ja3_hash        = evento.get("ja3_hash"),
            geo_country_iso  = geo.get("country_iso"),
            geo_country_name = geo.get("country_name"),
            geo_city         = geo.get("city"),
            geo_latitude     = geo.get("latitude"),
            geo_longitude    = geo.get("longitude"),
            geo_isp          = geo.get("isp"),
            geo_asn          = geo.get("asn"),
            geo_is_proxy     = geo.get("is_proxy", False),
            geo_is_hosting   = geo.get("is_hosting", False),
            geo_is_tor       = geo.get("is_tor", False),
            geo_threat_level = geo.get("threat_level"),
            abuse_score      = geo.get("abuse_score", 0),
            total_reports    = geo.get("total_reports", 0),
            vt_malicious     = geo.get("vt_malicious", 0),
            vt_suspicious    = geo.get("vt_suspicious", 0),
        )
        db.add(db_evento)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("guardar_evento_failed", error=str(exc))


# ============================================================
# CREDENCIALES
# ============================================================

def guardar_credencial(db: Session, ip: str, entidad: str,
                       username: str, password: str,
                       endpoint: str, alerta: str) -> None:
    try:
        db_cred = Credencial(
            ip_origen = ip,
            entidad   = entidad,
            username  = username,
            password  = password,
            endpoint  = endpoint,
            alerta    = alerta,
        )
        db.add(db_cred)
        db.flush() 
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("guardar_credencial_failed", error=str(exc))


# ============================================================
# TOKENS
# ============================================================

def guardar_token(db: Session, jti: str, sub: str,
                  entidad: str, scope: str, expires_at) -> None:
    try:
        db_token = Token(
            jti        = jti,
            sub        = sub,
            entidad    = entidad,
            scope      = scope,
            expires_at = expires_at,
            usado      = False,
        )
        db.add(db_token)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("guardar_token_failed", error=str(exc))


def marcar_token_usado(db: Session, jti: str) -> None:
    try:
        token = db.query(Token).filter(Token.jti == jti).first()
        if token:
            token.usado = True
            db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("marcar_token_usado_failed", error=str(exc))


# ============================================================
# ALERTAS
# ============================================================

def guardar_alerta(db: Session, ip: str, tipo: str,
                   descripcion: str, payload: dict,
                   severidad: str) -> None:
    try:
        db_alerta = Alerta(
            ip_origen   = ip,
            tipo        = tipo,
            descripcion = descripcion,
            payload     = payload,
            severidad   = severidad,
        )
        db.add(db_alerta)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("guardar_alerta_failed", error=str(exc))


# ============================================================
# AUTH CODES
# ============================================================

def guardar_auth_code(db: Session, code: str, entidad: str,
                      username: str, scope: str, expires_at) -> None:
    try:
        db_code = AuthCode(
            code       = code,
            entidad    = entidad,
            username   = username,
            scope      = scope,
            expires_at = expires_at,
            usado      = False,
        )
        db.add(db_code)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("guardar_auth_code_failed", error=str(exc))


def get_auth_code(db: Session, code: str) -> AuthCode | None:
    return db.query(AuthCode).filter(AuthCode.code == code).first()


def marcar_auth_code_usado(db: Session, code: str) -> None:
    try:
        auth_code = db.query(AuthCode).filter(AuthCode.code == code).first()
        if auth_code:
            auth_code.usado = True
            db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("marcar_auth_code_usado_failed", error=str(exc))