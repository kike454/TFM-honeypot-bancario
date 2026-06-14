# ============================================================
# app/middleware/logger.py
# Configura structlog para emitir JSON estructurado 
# ============================================================

import logging
import sys

import structlog


def configurar_logger():
    """
    Configura structlog con salida JSON por stdout.
    PM2 redirige stdout a ficheros de log (~/.pm2/logs/),
    que son monitorizados por Filebeat para su envío a ELK
    """
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Nivel de log desde variable de entorno
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
    )


# Inicializar al importar
configurar_logger()