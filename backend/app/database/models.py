# ============================================================
#
# Modelos SQLAlchemy 
# ============================================================

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    DateTime, JSON, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class Evento(Base):
    __tablename__ = "eventos"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp_utc   = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ip_origen       = Column(String(45), nullable=False, index=True)
    puerto_origen   = Column(Integer)
    metodo_http     = Column(String(10))
    path            = Column(String(500))
    query_params    = Column(JSON)
    headers         = Column(JSON)
    user_agent      = Column(Text)
    content_type    = Column(String(200))
    payload         = Column(JSON)
    ja3_fingerprint = Column(String(200))
    ja3_hash        = Column(String(32))
    geo_country_iso  = Column(String(2))
    geo_country_name = Column(String(100))
    geo_city         = Column(String(100))
    geo_latitude     = Column(Float)
    geo_longitude    = Column(Float)
    geo_isp          = Column(String(200))
    geo_asn          = Column(String(200))
    geo_is_proxy     = Column(Boolean, default=False)
    geo_is_hosting   = Column(Boolean, default=False)
    geo_is_tor       = Column(Boolean, default=False)
    geo_threat_level = Column(String(20))
    abuse_score      = Column(Integer, default=0)
    total_reports    = Column(Integer, default=0)
    vt_malicious     = Column(Integer, default=0)
    vt_suspicious    = Column(Integer, default=0)


class Credencial(Base):
    __tablename__ = "credenciales"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp_utc = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ip_origen     = Column(String(45), nullable=False, index=True)
    entidad       = Column(String(20))
    username      = Column(String(100))
    password      = Column(String(200))
    endpoint      = Column(String(50))
    alerta        = Column(String(100))


class Token(Base):
    __tablename__ = "tokens"

    jti           = Column(String(36), primary_key=True)
    timestamp_utc = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    sub           = Column(String(100))
    entidad       = Column(String(20))
    scope         = Column(String(200))
    expires_at    = Column(DateTime(timezone=True))
    usado         = Column(Boolean, default=False)


class Alerta(Base):
    __tablename__ = "alertas"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp_utc = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ip_origen     = Column(String(45), nullable=False, index=True)
    tipo          = Column(String(100), index=True)
    descripcion   = Column(Text)
    payload       = Column(JSON)
    severidad     = Column(String(20))


class AuthCode(Base):
    __tablename__ = "auth_codes"

    code          = Column(String(36), primary_key=True)
    timestamp_utc = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    entidad       = Column(String(20))
    username      = Column(String(100))
    scope         = Column(String(200))
    usado         = Column(Boolean, default=False)
    expires_at    = Column(DateTime(timezone=True))

class Usuario(Base):
    __tablename__ = "usuarios"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp_utc = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    nombre        = Column(String(100), nullable=False)
    email         = Column(String(200), nullable=False, unique=True, index=True)
    password_hash = Column(String(200), nullable=False)
    activo        = Column(Boolean, default=True)
    verificado    = Column(Boolean, default=False)


# ============================================================
# OTP — códigos de verificación por email
# ============================================================

class OTP(Base):
    __tablename__ = "otps"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp_utc = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    email         = Column(String(200), nullable=False, index=True)
    codigo        = Column(String(6), nullable=False)
    usado         = Column(Boolean, default=False)
    expires_at    = Column(DateTime(timezone=True), nullable=False)