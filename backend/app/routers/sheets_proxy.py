"""
Google Sheets Proxy — shields the API key AND HMAC secret from the frontend.

Instead of the frontend calling sheets.googleapis.com or Apps Script directly
(exposing the API key or HMAC secret in the JS bundle), it calls:
- GET  /api/v1/sheets/{sheet_name}      → backend proxies read via Sheets API
- POST /api/v1/sheets/write              → backend proxies write via Apps Script with HMAC

This keeps ALL secrets server-side.
"""
import logging
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.sheets_service import GoogleSheetsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sheets", tags=["Sheets Proxy"])

sheets_service = GoogleSheetsService()


class SheetRangeResponse(BaseModel):
    range: str
    values: list[list]


class AppsScriptWriteRequest(BaseModel):
    """Generic write request to forward to Apps Script with HMAC signing."""
    accion: str
    # All other fields go as **extras
    datos: Optional[dict[str, Any]] = None


@router.get("/{sheet_name}", response_model=SheetRangeResponse)
async def read_sheet(
    sheet_name: str,
    range: Optional[str] = Query(None, description="Cell range, e.g. A1:Z100"),
):
    """Read data from a Google Sheets range.
    
    This proxies the request through the backend, keeping the API key server-side.
    The frontend calls this instead of sheets.googleapis.com directly.
    
    No authentication required for reads (API key is protected server-side).
    """
    try:
        if range:
            full_range = f"{sheet_name}!{range}"
        else:
            full_range = sheet_name

        rows = await sheets_service.get_range(sheet_name, range)

        return SheetRangeResponse(
            range=full_range,
            values=rows,
        )
    except Exception as e:
        logger.error(f"Sheets proxy error [{sheet_name}]: {e}")
        raise HTTPException(status_code=502, detail="Error al leer datos del servidor")


@router.get("/metadata/{sheet_name}")
async def get_sheet_metadata(
    sheet_name: str,
):
    """Get metadata (sheet list) for a spreadsheet.
    
    This replaces direct calls to sheets.googleapis.com/v4/spreadsheets/{id}
    No authentication required (API key is protected server-side).
    """
    try:
        url = f"{sheets_service.base_url}/{sheets_service.sheet_id}"
        params = {"key": sheets_service.api_key}

        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        # Extract just sheet names
        sheets_list = []
        for s in data.get("sheets", []):
            title = s.get("properties", {}).get("title", "")
            if title:
                sheets_list.append(title)

        return {"sheets": sheets_list}
    except Exception as e:
        logger.error(f"Sheets metadata error: {e}")
        raise HTTPException(status_code=502, detail="Error al obtener metadata")


@router.post("/write")
async def apps_script_write_proxy(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """Generic write proxy to Apps Script.
    
    The frontend sends { accion: "...", ...params } and the backend:
    1. Adds HMAC signature (secret stays server-side)
    2. Forwards to Apps Script
    3. Returns the result
    
    This replaces ALL direct fetch() calls from the frontend to Apps Script.
    The HMAC secret NEVER reaches the browser.
    
    Requires authentication (any valid user).
    """
    accion = body.get("accion")
    if not accion:
        raise HTTPException(status_code=400, detail="Falta campo 'accion'")
    
    try:
        # Extract accion, pass the rest as data to _apps_script_action
        data = {k: v for k, v in body.items() if k != "accion"}
        result = await sheets_service._apps_script_action(accion, data)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error(f"Apps Script proxy error [{accion}]: {e}")
        raise HTTPException(status_code=502, detail="Error al procesar la solicitud")
