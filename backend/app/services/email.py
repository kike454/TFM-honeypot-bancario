import os
import random
import smtplib
import string
import structlog
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = structlog.get_logger(__name__)

SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").replace(" ", "")
SMTP_FROM     = os.getenv("SMTP_FROM", "FinConnect <no-reply@finconnect.es>")


def generar_codigo_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def enviar_otp_email(email: str, codigo: str, nombre: str = "") -> bool:
    saludo = f"Hola {nombre}," if nombre else "Hola,"

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f5f6fa;">
      <div style="background:white;border-radius:16px;padding:32px;">
        <h2 style="font-size:22px;font-weight:700;color:#1a1a2e;margin-bottom:8px;">
          Código de verificación FinConnect
        </h2>
        <p style="font-size:14px;color:#6b7280;margin-bottom:24px;">
          {saludo} Usa el siguiente código. Caduca en <strong>10 minutos</strong>.
        </p>
        <div style="background:#f9fafb;border:2px dashed #e5e7eb;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;font-weight:800;letter-spacing:0.3em;color:#1a1a2e;font-family:monospace;">
            {codigo}
          </span>
        </div>
        <p style="font-size:11px;color:#d1d5db;text-align:center;">
          FinConnect Financial Services S.L. · Supervisado por Banco de España
        </p>
      </div>
    </div>
    """

    mensaje = MIMEMultipart("alternative")
    mensaje["Subject"] = f"{codigo} — Tu código de verificación FinConnect"
    mensaje["From"]    = SMTP_FROM
    mensaje["To"]      = email
    mensaje.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as smtp:
            smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.sendmail(SMTP_USER, email, mensaje.as_string())
        logger.info("otp_email_enviado", email=email)
        return True
    except Exception as exc:
        logger.error("otp_email_failed", email=email, error=str(exc))
        return False