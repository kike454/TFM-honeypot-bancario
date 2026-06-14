
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from faker import Faker
from schwifty import IBAN

fake = Faker("es_ES")

ENTIDADES = {
    "ING": {
        "nombre":       "ING Bank N.V. Sucursal en España",
        "bic":          "INGDESMMXXX",
        "color":        "#FF6200",
        "country_code": "ES",
        "bank_code":    "1465",
    },
    "BBVA": {
        "nombre":       "Banco Bilbao Vizcaya Argentaria",
        "bic":          "BBVAESMMXXX",
        "color":        "#004481",
        "country_code": "ES",
        "bank_code":    "0182",
    },
    "SANTANDER": {
        "nombre":       "Banco Santander S.A.",
        "bic":          "BSCHESMMXXX",
        "color":        "#EC0000",
        "country_code": "ES",
        "bank_code":    "0049",
    },
    "CAIXABANK": {
        "nombre":       "CaixaBank S.A.",
        "bic":          "CAIXESBBXXX",
        "color":        "#007EAE",
        "country_code": "ES",
        "bank_code":    "2100",
    },
}

CATEGORIAS_GASTO = [
    "Supermercado", "Restaurante", "Gasolinera", "Farmacia",
    "Amazon", "Netflix", "Spotify", "Electricidad", "Agua",
    "Alquiler", "Gimnasio", "Transporte", "Ropa", "Salud",
    "Seguro", "Telefonía", "Internet", "Viajes", "Ocio",
]

CATEGORIAS_INGRESO = [
    "Nómina", "Transferencia recibida", "Devolución Hacienda",
    "Intereses", "Freelance", "Alquiler cobrado",
]

CONCEPTOS_GASTO = [
    "MERCADONA", "CARREFOUR", "EL CORTE INGLES", "LIDL", "ALDI",
    "AMAZON EU", "NETFLIX.COM", "SPOTIFY AB", "ENDESA ENERGIA",
    "IBERDROLA", "VODAFONE ES", "MOVISTAR", "RENFE", "EMT MADRID",
    "REPSOL", "BP OIL", "MAPFRE SEGUROS", "SANITAS", "CORREOS",
]

# Importes realistas por comercio
IMPORTES_POR_CONCEPTO = {
    "MERCADONA":        (15,  120),
    "CARREFOUR":        (20,  150),
    "LIDL":             (10,   80),
    "ALDI":             (10,   70),
    "EL CORTE INGLES":  (20,  200),
    "AMAZON EU":        (8,   150),
    "NETFLIX.COM":      (13,   18),
    "SPOTIFY AB":       (10,   11),
    "ENDESA ENERGIA":   (60,  180),
    "IBERDROLA":        (60,  180),
    "VODAFONE ES":      (30,   60),
    "MOVISTAR":         (30,   60),
    "RENFE":            (15,  120),
    "EMT MADRID":       (1,     3),
    "REPSOL":           (40,   90),
    "BP OIL":           (40,   90),
    "MAPFRE SEGUROS":   (50,  150),
    "SANITAS":          (80,  200),
    "CORREOS":          (2,    15),
}

IMPORTES_INGRESO = {
    "Nómina":                 (1400, 3500),
    "Transferencia recibida": (50,    500),
    "Devolución Hacienda":    (100,   800),
    "Intereses":              (1,      20),
    "Freelance":              (200,  1500),
    "Alquiler cobrado":       (500,  1200),
}


# ============================================================
# GENERADOR DE IBANs
# ============================================================

def generar_iban(entidad_key: str) -> str:
    entidad = ENTIDADES[entidad_key]
    try:
        iban = IBAN.generate(
            country_code=entidad["country_code"],
            bank_code=entidad["bank_code"],
            account_code=str(random.randint(1000000000, 9999999999)),
        )
        return str(iban)
    except Exception:
        cuenta = f"{random.randint(10**19, 10**20 - 1)}"
        return f"ES{random.randint(10,99)}{entidad['bank_code']}0000{cuenta[:16]}"


# ============================================================
# GENERADOR DE CLIENTES
# ============================================================

def generar_cliente() -> dict[str, Any]:
    nombre    = fake.first_name()
    apellidos = f"{fake.last_name()} {fake.last_name()}"
    return {
        "resource_id":     str(uuid.uuid4()),
        "nombre":          nombre,
        "apellidos":       apellidos,
        "nombre_completo": f"{nombre} {apellidos}",
        "email":           fake.email(),
        "telefono":        fake.phone_number(),
        "nif":             fake.nif(),
        "direccion":       fake.address().replace("\n", ", "),
        "fecha_nacimiento": fake.date_of_birth(minimum_age=18, maximum_age=75).isoformat(),
    }


# ============================================================
# GENERADOR DE CUENTAS
# ============================================================

def generar_cuenta(entidad_key: str, cliente: dict) -> dict[str, Any]:
    entidad  = ENTIDADES[entidad_key]
    iban     = generar_iban(entidad_key)
    saldo    = round(random.uniform(1500.0, 25000.0), 2)
    currency = "EUR"
    tipo     = random.choice(["CACC", "SVGS"])

    return {
        "resourceId":      str(uuid.uuid4()),
        "iban":            iban,
        "bic":             entidad["bic"],
        "currency":        currency,
        "ownerName":       cliente["nombre_completo"],
        "name":            f"Cuenta {tipo} {entidad_key}",
        "product":         "Cuenta Corriente" if tipo == "CACC" else "Cuenta Ahorro",
        "cashAccountType": tipo,
        "status":          "enabled",
        "balances": [{
            "balanceAmount": {"currency": currency, "amount": str(saldo)},
            "balanceType":   "closingBooked",
            "referenceDate": datetime.now(timezone.utc).date().isoformat(),
        }],
        "_entidad":        entidad_key,
        "_entidad_nombre": entidad["nombre"],
    }


# ============================================================
# GENERADOR DE MOVIMIENTOS
# ============================================================

def generar_movimiento(
    iban_cuenta: str,
    fecha: datetime,
    es_ingreso: bool | None = None,
) -> dict[str, Any]:

    if es_ingreso is None:
        es_ingreso = random.random() < 0.15  # 15% ingresos

    if es_ingreso:
        concepto  = random.choice(CATEGORIAS_INGRESO)
        rango     = IMPORTES_INGRESO.get(concepto, (100, 500))
        importe   = round(random.uniform(*rango), 2)
        categoria = "INGRESO"
    else:
        concepto  = random.choice(CONCEPTOS_GASTO)
        rango     = IMPORTES_POR_CONCEPTO.get(concepto, (5, 50))
        importe   = -round(random.uniform(*rango), 2)
        categoria = random.choice(CATEGORIAS_GASTO)

    return {
        "transactionId":   str(uuid.uuid4()),
        "entryReference":  f"REF{random.randint(100000, 999999)}",
        "bookingDate":     fecha.date().isoformat(),
        "valueDate":       fecha.date().isoformat(),
        "transactionAmount": {"currency": "EUR", "amount": str(importe)},
        "creditorName":    concepto if importe < 0 else None,
        "debtorName":      concepto if importe > 0 else None,
        "remittanceInformationUnstructured": concepto,
        "bankTransactionCode": "PMNT",
        "proprietaryBankTransactionCode": categoria,
        "_importe": importe,
    }


def generar_movimientos(
    iban_cuenta: str,
    dias: int = 90,
    movimientos_por_dia: tuple = (0, 4),
) -> dict[str, list]:
    booked  = []
    pending = []
    hoy     = datetime.now(timezone.utc)

    for dia in range(dias, 0, -1):
        fecha = hoy - timedelta(days=dia)

        # Nómina el día 1 de cada mes
        if fecha.day == 1:
            booked.append(generar_movimiento(iban_cuenta, fecha, es_ingreso=True))

        # Gastos del día
        n = random.randint(*movimientos_por_dia)
        for _ in range(n):
            booked.append(generar_movimiento(iban_cuenta, fecha, es_ingreso=False))

    # Ayer — booked
    fecha_ayer = hoy - timedelta(days=1)
    for _ in range(random.randint(1, 3)):
        booked.append(generar_movimiento(iban_cuenta, fecha_ayer, es_ingreso=False))

    # Hoy — pending
    for _ in range(random.randint(0, 2)):
        pending.append(generar_movimiento(iban_cuenta, hoy, es_ingreso=False))

    return {"booked": booked, "pending": pending}


# ============================================================
# GENERADOR DE SESIÓN COMPLETA
# ============================================================

def generar_sesion_bancaria(entidades: list[str] | None = None) -> dict[str, Any]:
    if entidades is None:
        n         = random.randint(2, len(ENTIDADES))
        entidades = random.sample(list(ENTIDADES.keys()), n)

    cliente  = generar_cliente()
    cuentas  = []
    balances = []

    for entidad_key in entidades:
        cuenta = generar_cuenta(entidad_key, cliente)
        cuentas.append(cuenta)
        saldo = float(cuenta["balances"][0]["balanceAmount"]["amount"])
        balances.append({
            "entidad":  entidad_key,
            "iban":     cuenta["iban"],
            "saldo":    saldo,
            "currency": "EUR",
        })

    return {
        "cliente":     cliente,
        "cuentas":     cuentas,
        "balances":    balances,
        "saldo_total": round(sum(b["saldo"] for b in balances), 2),
        "currency":    "EUR",
        "entidades":   entidades,
        "generado_en": datetime.now(timezone.utc).isoformat(),
    }


# ============================================================
# CACHÉ EN MEMORIA
# ============================================================

_sesiones: dict[str, dict] = {}


def get_or_create_sesion(token: str) -> dict[str, Any]:
    from jose import jwt as jose_jwt
    from app.services.token import SECRET_KEY, ALGORITHM
    try:
        payload   = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username  = payload.get("sub", "unknown")
        entidad   = payload.get("entidad", "unknown")
        cache_key = f"{username}:{entidad}"
    except Exception:
        cache_key = token

    if cache_key not in _sesiones:
        _sesiones[cache_key] = generar_sesion_bancaria()
    return _sesiones[cache_key]


def get_movimientos_cuenta(iban: str, token: str) -> dict[str, list]:
    from jose import jwt as jose_jwt
    from app.services.token import SECRET_KEY, ALGORITHM
    try:
        payload   = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username  = payload.get("sub", "unknown")
        entidad   = payload.get("entidad", "unknown")
        cache_key = f"{username}:{entidad}:{iban}"
    except Exception:
        cache_key = f"{token}:{iban}"

    if cache_key not in _sesiones:
        _sesiones[cache_key] = generar_movimientos(iban)
    return _sesiones[cache_key]