
from fastapi import APIRouter, Header, HTTPException
from typing import Annotated

from app.services.fake_data import get_or_create_sesion
from app.services.token import validar_token

router = APIRouter(prefix="/v1", tags=["accounts"])


@router.get("/accounts")
async def get_accounts(
    authorization: Annotated[str | None, Header()] = None,
    x_request_id: Annotated[str | None, Header()] = None,
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.replace("Bearer ", "")
    payload = validar_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    sesion = get_or_create_sesion(token)

    # Formato Berlin Group PSD2
    return {
        "accounts": [
            {
                "resourceId":      c["resourceId"],
                "iban":            c["iban"],
                "bic":             c["bic"],
                "currency":        c["currency"],
                "ownerName":       c["ownerName"],
                "name":            c["name"],
                "product":         c["product"],
                "cashAccountType": c["cashAccountType"],
                "status":          c["status"],
                "_links": {
                    "balances": {
                        "href": f"/v1/accounts/{c['resourceId']}/balances"
                    },
                    "transactions": {
                        "href": f"/v1/accounts/{c['resourceId']}/transactions"
                    },
                },
            }
            for c in sesion["cuentas"]
        ]
    }


@router.get("/accounts/{account_id}/balances")
async def get_balances(
    account_id: str,
    authorization: Annotated[str | None, Header()] = None,
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.replace("Bearer ", "")
    payload = validar_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    sesion = get_or_create_sesion(token)
    cuenta = next(
        (c for c in sesion["cuentas"] if c["resourceId"] == account_id),
        None
    )

    if not cuenta:
        raise HTTPException(status_code=404, detail="Account not found")

    return {"balances": cuenta["balances"]}


@router.get("/accounts/{account_id}/transactions")
async def get_transactions(
    account_id: str,
    authorization: Annotated[str | None, Header()] = None,
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.replace("Bearer ", "")
    payload = validar_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    sesion  = get_or_create_sesion(token)
    cuenta  = next(
        (c for c in sesion["cuentas"] if c["resourceId"] == account_id),
        None
    )

    if not cuenta:
        raise HTTPException(status_code=404, detail="Account not found")

    from app.services.fake_data import get_movimientos_cuenta
    movimientos = get_movimientos_cuenta(cuenta["iban"], token)

    return {
        "transactions": {
            "booked":  movimientos["booked"],
            "pending": movimientos["pending"],
        },
        "_links": {
            "account": {"href": f"/v1/accounts/{account_id}"}
        }
    }