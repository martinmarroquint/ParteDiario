import json
import logging
import httpx
from typing import Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)


class GoogleSheetsService:
    """Service to interact with Google Sheets API.
    
    Uses:
    - Google Sheets API v4 with API Key for READ operations
    - Apps Script web app for WRITE operations (append, update, delete)
    """
    
    def __init__(self):
        self.api_key = settings.GOOGLE_SHEETS_API_KEY
        self.sheet_id = settings.GOOGLE_SHEETS_ID
        self.base_url = "https://sheets.googleapis.com/v4/spreadsheets"
        self.apps_script_url = settings.GOOGLE_APPS_SCRIPT_URL
    
    async def get_range(self, sheet_name: str, cell_range: str = "") -> list[list]:
        """Read data from a sheet range (uses Google Sheets API)."""
        range_str = f"{sheet_name}!{cell_range}" if cell_range else sheet_name
        url = f"{self.base_url}/{self.sheet_id}/values/{range_str}"
        params = {"key": self.api_key, "majorDimension": "ROWS"}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                return data.get("values", [])
        except httpx.HTTPError as e:
            logger.error(f"Error reading sheet {sheet_name}: {e}")
            return []
    
    async def update_range(self, sheet_name: str, cell_range: str, values: list[list]) -> dict:
        """Update data in a sheet range (uses Apps Script)."""
        return await self._apps_script_action("updateRange", {
            "hoja": sheet_name,
            "rango": cell_range,
            "valores": values
        })
    
    async def append_row(self, sheet_name: str, values: list) -> dict:
        """Append a new row to a sheet (uses Apps Script)."""
        return await self._apps_script_action("appendRow", {
            "hoja": sheet_name,
            "valores": values
        })
    
    async def delete_row(self, sheet_name: str, row_number: int) -> dict:
        """Delete a row from a sheet (uses Apps Script)."""
        return await self._apps_script_action("deleteRow", {
            "hoja": sheet_name,
            "fila": row_number
        })
    
    async def _apps_script_action(self, action: str, data: dict) -> dict:
        """Call the Apps Script web app for write operations."""
        if not self.apps_script_url:
            logger.warning(f"Apps Script URL not configured. Cannot perform write: {action}")
            return {"error": "Apps Script URL not configured"}
        
        payload = {"accion": action, **data}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.apps_script_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                response.raise_for_status()
                result = response.json()
                return result
        except httpx.HTTPError as e:
            logger.error(f"Error calling Apps Script for {action}: {e}")
            return {"error": str(e)}
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON response from Apps Script for {action}")
            return {"error": "Invalid response from Apps Script"}
    
    async def _get_sheet_ids(self) -> dict:
        """Get sheet names and their GIDs."""
        url = f"{self.base_url}/{self.sheet_id}"
        params = {"key": self.api_key}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                sheets = response.json().get("sheets", [])
                return {s["properties"]["title"]: s["properties"]["sheetId"] for s in sheets}
        except Exception as e:
            logger.error(f"Error getting sheet metadata: {e}")
            return {}
    
    async def find_row(self, sheet_name: str, column: int, value: str) -> Optional[list]:
        """Find a row where a specific column matches a value."""
        rows = await self.get_range(sheet_name)
        for row in rows:
            if len(row) > column and row[column] == value:
                return row
        return None
    
    async def find_rows(self, sheet_name: str, column: int, value: str) -> list[list]:
        """Find all rows where a specific column matches a value."""
        rows = await self.get_range(sheet_name)
        return [row for row in rows if len(row) > column and row[column] == value]
    
    async def find_row_index(self, sheet_name: str, column: int, value: str) -> Optional[int]:
        """Find the row number (1-indexed) where a column matches."""
        rows = await self.get_range(sheet_name)
        for idx, row in enumerate(rows):
            if len(row) > column and row[column] == value:
                return idx + 1  # 1-indexed
        return None
    
    async def update_cell(self, sheet_name: str, cell: str, value: str) -> dict:
        """Update a single cell (uses Apps Script)."""
        return await self._apps_script_action("updateCell", {
            "hoja": sheet_name,
            "celda": cell,
            "valor": value
        })
