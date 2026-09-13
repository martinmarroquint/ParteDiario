"""
Google Sheets Proxy — shields the API key from the frontend.

Instead of the frontend calling sheets.googleapis.com directly (exposing the API key
in the JS bundle), it calls GET /api/v1/sheets/{sheet_name} and the backend proxies
the request using the server-side API key.
"""
import logging
from typing import Optional

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


@router.get("/{sheet_name}", response_model=SheetRangeResponse)
async def read_sheet(
    sheet_name: str,
    range: Optional[str] = Query(None, description="Cell range, e.g. A1:Z100"),
    current_user: User = Depends(get_current_user),
):
    """Read data from a Google Sheets range.
    
    This proxies the request through the backend, keeping the API key server-side.
    The frontend calls this instead of sheets.googleapis.com directly.
    
    Requires authentication (any valid user).
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
    current_user: User = Depends(get_current_user),
):
    """Get metadata (sheet list) for a spreadsheet.
    
    This replaces direct calls to sheets.googleapis.com/v4/spreadsheets/{id}
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
