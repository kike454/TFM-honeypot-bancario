# ============================================================
# Captura todo el tráfico entrante al honeypot:
# IP origen, puerto, método HTTP, headers, payload,
# timestamp UTC y geolocalización encadenada:
#   1. MaxMind GeoLite2 (local, sin latencia)
#   2. ip-api.com       (ASN, ISP, VPN/proxy detection)
#   3. AbuseIPDB        (reputación e historial de ataques)
# ============================================================

import asyncio
import datetime
import ipaddress
import json
import os
from typing import Any
from urllib.parse import parse_qs

import geoip2.database
import geoip2.errors
import httpx
import structlog
from fastapi import Request
from dotenv import load_dotenv
load_dotenv()

logger = structlog.get_logger(__name__)

# ============================================================
# CONFIGURACIÓN
# ============================================================

GEOIP_DB_PATH     = os.getenv("GEOIP_DB_PATH", "data/GeoLite2-City.mmdb")
ABUSEIPDB_API_KEY = os.getenv("ABUSEIPDB_API_KEY", "")

# ip-api.com, 1000 req/min
IP_API_URL = (
    "http://ip-api.com/json/{ip}"
    "?fields=status,country,countryCode,regionName,city,"
    "lat,lon,isp,org,as,proxy,hosting,query"
)

# AbuseIPDB 
ABUSEIPDB_URL = "https://api.abuseipdb.com/api/v2/check"

# Timeout para llamadas externas (no bloquear el honeypot)
GEO_TIMEOUT = float(os.getenv("GEO_TIMEOUT", "3.0"))

_geoip_reader: geoip2.database.Reader | None = None

HEADERS_EXCLUIDOS = {
    "x-amzn-trace-id",
    "x-forwarded-port",
    "x-forwarded-proto",
}

MAX_BODY_SIZE     = int(os.getenv("MAX_BODY_SIZE", str(1024 * 1024)))
# ============================================================
# MAXMIND GEOIP2 (local, sin latencia de red)
# ============================================================

def get_geoip_reader() -> geoip2.database.Reader | None:
    global _geoip_reader
    if _geoip_reader is None:
        try:
            _geoip_reader = geoip2.database.Reader(GEOIP_DB_PATH)
        except FileNotFoundError:
            logger.warning(
                "geoip_db_not_found",
                path=GEOIP_DB_PATH,
                hint="Descarga GeoLite2-City.mmdb desde maxmind.com",
            )
    return _geoip_reader


def _geoip_local(ip: str) -> dict[str, Any]:
    """Consulta MaxMind GeoLite2 local. Primera fuente, sin latencia."""
    reader = get_geoip_reader()
    if reader is None:
        return {}
    try:
        r = reader.city(ip)
        return {
            "country_iso":  r.country.iso_code,
            "country_name": r.country.name,
            "city":         r.city.name,
            "latitude":     r.location.latitude,
            "longitude":    r.location.longitude,
            "timezone":     r.location.time_zone,
            "source":       "maxmind_geoip2",
        }
    except geoip2.errors.AddressNotFoundError:
        return {}
    except Exception as exc:
        logger.error("geoip_local_failed", ip=ip, error=str(exc))
        return {}


# ============================================================
# IP-API.COM (ASN, ISP, VPN/proxy/hosting detection)
# Detecta si la IP pertenece a Mullvad, Tor, un datacenter...
# ============================================================

async def _geoip_ipapi(ip: str) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=GEO_TIMEOUT) as client:
            resp = await client.get(IP_API_URL.format(ip=ip))
            data = resp.json()

        if data.get("status") != "success":
            return {}

        return {
            "country_iso":  data.get("countryCode"),
            "country_name": data.get("country"),
            "region":       data.get("regionName"),
            "city":         data.get("city"),
            "latitude":     data.get("lat"),
            "longitude":    data.get("lon"),
            "isp":          data.get("isp"),
            "org":          data.get("org"),
            "asn":          data.get("as"),
            "is_proxy":     data.get("proxy", False),
            "is_hosting":   data.get("hosting", False),
            "source":       "ip_api",
        }
    except Exception as exc:
        logger.warning("ipapi_failed", ip=ip, error=str(exc))
        return {}


# ============================================================
# ABUSEIPDB (reputación e historial de ataques)
# Puntuación 0-100, reportes, categorías, Tor, VPN conocida
# ============================================================

async def _geoip_abuseipdb(ip: str) -> dict[str, Any]:
    if not ABUSEIPDB_API_KEY:
        return {"abuseipdb_note": "no_api_key_configured"}

    try:
        async with httpx.AsyncClient(timeout=GEO_TIMEOUT) as client:
            resp = await client.get(
                ABUSEIPDB_URL,
                headers={
                    "Key":    ABUSEIPDB_API_KEY,
                    "Accept": "application/json",
                },
                params={
                    "ipAddress":    ip,
                    "maxAgeInDays": "90",
                },
            )
            data = resp.json().get("data", {})

        return {
            "abuse_score":    data.get("abuseConfidenceScore", 0),
            "total_reports":  data.get("totalReports", 0),
            "last_reported":  data.get("lastReportedAt"),
            "is_tor":         data.get("isTor", False),
            "is_whitelisted": data.get("isWhitelisted", False),
            "usage_type":     data.get("usageType"),   # "VPN", "Data Center", etc.
            "isp":            data.get("isp"),
            "domain":         data.get("domain"),
            "source":         "abuseipdb",
        }
    except Exception as exc:
        logger.warning("abuseipdb_failed", ip=ip, error=str(exc))
        return {}


# ============================================================
# GEOLOCALIZACIÓN ENCADENADA
# Las tres fuentes corren en paralelo para minimizar latencia.
# MaxMind tiene prioridad en campos geográficos.
# AbuseIPDB aporta reputación e indicadores de amenaza.
#
# Resultado ejemplo para una IP de Mullvad VPN:
# {
#   "country_iso": "SE", "country_name": "Sweden",
#   "city": "Stockholm", "latitude": 59.33, "longitude": 18.06,
#   "isp": "Mullvad VPN", "asn": "AS39351 31173 Services AB",
#   "is_proxy": true, "is_hosting": true, "is_tor": false,
#   "abuse_score": 42, "total_reports": 178,
#   "usage_type": "VPN", "threat_level": "high"
# }
# ============================================================

async def geolocate(ip: str) -> dict[str, Any]:
    try:
        parsed = ipaddress.ip_address(ip)
        if parsed.is_private or parsed.is_loopback:
            return {"geo_note": "private_or_loopback"}
    except ValueError:
        return {"geo_error": "invalid_ip"}

    # Consultas en paralelo
    local_data, ipapi_data, abuse_data = await asyncio.gather(
        asyncio.to_thread(_geoip_local, ip),
        _geoip_ipapi(ip),
        _geoip_abuseipdb(ip),
    )

    # Merge: ip-api como base, MaxMind sobreescribe campos geográficos
    geo: dict[str, Any] = {}
    geo.update(ipapi_data)
    geo.update({k: v for k, v in local_data.items() if v is not None})
    geo.update(abuse_data)

    # --- Nivel de amenaza calculado localmente ---
    abuse_score   = abuse_data.get("abuse_score", 0)
    is_proxy      = ipapi_data.get("is_proxy", False)
    is_hosting    = ipapi_data.get("is_hosting", False)
    is_tor        = abuse_data.get("is_tor", False)
    total_reports = abuse_data.get("total_reports", 0)

    if is_tor or abuse_score >= 80:
        threat_level = "critical"
    elif abuse_score >= 50 or (is_proxy and total_reports > 10):
        threat_level = "high"
    elif abuse_score >= 20 or is_proxy or is_hosting:
        threat_level = "medium"
    else:
        threat_level = "low"

    geo["threat_level"] = threat_level
    return geo


# ============================================================
# EXTRACCIÓN DE IP REAL
# Tiene en cuenta proxies y Nginx (X-Forwarded-For, X-Real-IP)
# ============================================================

def extract_client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return x_real_ip.strip()
    return request.client.host if request.client else "unknown"


# ============================================================
# CAPTURA PRINCIPAL
# ============================================================

async def capture_request(request: Request) -> dict[str, Any]:
    """
    Captura todos los datos de una request entrante y los
    enriquece con geolocalización y reputación de la IP.
    Emite un log estructurado JSON que Filebeat recoge.
    """
    timestamp_utc = datetime.datetime.now(datetime.timezone.utc).isoformat()
    ip_origen     = extract_client_ip(request)
    puerto_origen = request.client.port if request.client else None
    metodo_http   = request.method
    path          = str(request.url.path)
    query_params  = dict(request.query_params)

    # Headers (filtramos internos de AWS/proxy)
    #HEADERS_EXCLUIDOS = {"x-amzn-trace-id", "x-forwarded-port", "x-forwarded-proto"}
    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in HEADERS_EXCLUIDOS
    }

    user_agent   = request.headers.get("user-agent", "unknown")
    content_type = request.headers.get("content-type", "")

    # Payload
    payload: Any = None
    try:
        body_bytes = await request.body()
        if len(body_bytes) > MAX_BODY_SIZE:
            logger.warning("body_demasiado_grande", size=len(body_bytes))
            body_bytes = body_bytes[:MAX_BODY_SIZE]

        if body_bytes:
            payload_raw = body_bytes.decode("utf-8", errors="replace")
            if "application/json" in content_type:
                try:
                    payload = json.loads(payload_raw)
                except json.JSONDecodeError:
                    payload = payload_raw
            elif "application/x-www-form-urlencoded" in content_type:
                payload = parse_qs(payload_raw)
            else:
                payload = payload_raw
    except Exception as exc:
        logger.warning("payload_capture_failed", error=str(exc))

    # Geolocalización encadenada (las 3 fuentes en paralelo)
    geo = await geolocate(ip_origen)

    evento = {
        "timestamp_utc": timestamp_utc,
        "ip_origen":     ip_origen,
        "puerto_origen": puerto_origen,
        "metodo_http":   metodo_http,
        "path":          path,
        "query_params":  query_params,
        "headers":       headers,
        "user_agent":    user_agent,
        "content_type":  content_type,
        "payload":       payload,
        "geo":           geo,
        "honeypot": {
            "tipo":    "agregador_bancario_psd2",
            "version": "1.0.0",
        },
    }

    logger.info("request_capturada", **evento)

    return evento