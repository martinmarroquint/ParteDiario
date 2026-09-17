"""
Backup Tool: Exporta TODOS los datos de Google Sheets a JSON local.
Ejecutar ANTES de cualquier cambio.
"""
import asyncio
import json
import os
from datetime import datetime
from pathlib import Path

import httpx

# Configuracion
API_KEY = "AIzaSyCrdStW9-jK7vz76EuB8KA7Ea_m9aVOoeI"
SHEETS_ID = "1ZfjhSHrsbIh4x3cxibVJ6UUnKcT8v_AOpsR9ey1dSKc"  # Nuevo sheet ID
BACKUP_DIR = Path(__file__).parent.parent / "backups" / datetime.now().strftime("%Y%m%d_%H%M%S")

# Hojas a respaldar
SHEET_TABS = [
    "BD",
    "USUARIOS_OCR",
    "AREAS_OCR",
    "Areas",
    "ESTADOS",
    "CONFIG",
    "CAMBIOS",
    "SOLICITUDES_CAMBIOS",
    "SOLICITUDES",
    "CELDA_MODIFICADA",
    "DESCANSOS_MEDICOS",
    "DescansosMedicos",
    "VACACIONES",
    "Vacaciones",
    "OCR",
    "RECUPERACION",
    "UserRoles",
    "EstructuraJerarquica",
    # Hojas mensuales
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
    # Roles_{mes}_{anio} dynamic sheets - se detectan automaticamente
]


async def get_sheet_names(client: httpx.AsyncClient) -> list[str]:
    """Obtiene todos los nombres de hojas del spreadsheet."""
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEETS_ID}"
    params = {"key": API_KEY, "fields": "sheets.properties.title"}
    resp = await client.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()
    return [s["properties"]["title"] for s in data.get("sheets", [])]


async def read_sheet(client: httpx.AsyncClient, sheet_name: str) -> list[list[str]]:
    """Lee una hoja completa."""
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEETS_ID}/values/{sheet_name}"
    params = {"key": API_KEY, "valueRenderOption": "UNFORMATTED_VALUE"}
    try:
        resp = await client.get(url, params=params, timeout=30)
        if resp.status_code == 404:
            print(f"  [SKIP] Hoja '{sheet_name}' no existe")
            return []
        resp.raise_for_status()
        data = resp.json()
        return data.get("values", [])
    except Exception as e:
        print(f"  [ERROR] Leyendo '{sheet_name}': {e}")
        return []


async def backup_sheet(client: httpx.AsyncClient, sheet_name: str) -> dict:
    """Respaldar una hoja completa."""
    rows = await read_sheet(client, sheet_name)
    if not rows:
        return {"name": sheet_name, "rows": 0, "data": []}

    # Convertir a formato mas legible
    headers = rows[0] if rows else []
    records = []
    for row in rows[1:]:
        record = {}
        for i, header in enumerate(headers):
            record[header] = row[i] if i < len(row) else ""
        records.append(record)

    return {
        "name": sheet_name,
        "rows": len(records),
        "headers": headers,
        "data": records,
        "raw": rows,  # Copia cruda por si acaso
    }


async def main():
    print("=" * 60)
    print("BACKUP DE GOOGLE SHEETS")
    print("=" * 60)
    print(f"Spreadsheet: {SHEETS_ID}")
    print(f"Destino: {BACKUP_DIR}")
    print()

    # Crear directorio
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    async with httpx.AsyncClient() as client:
        # 1. Obtener todas las hojas
        print("1. Obteniendo lista de hojas...")
        all_sheets = await get_sheet_names(client)
        print(f"   Encontradas: {len(all_sheets)} hojas")
        print(f"   Hojas: {', '.join(all_sheets[:10])}{'...' if len(all_sheets) > 10 else ''}")
        print()

        # 2. Respaldar cada hoja
        print("2. Respaldando hojas...")
        results = []
        for sheet_name in all_sheets:
            print(f"   [{sheet_name}]", end=" ")
            backup = await backup_sheet(client, sheet_name)
            results.append(backup)
            print(f"- {backup['rows']} registros")

        # 3. Guardar como JSON
        print()
        print("3. Guardando respaldo...")

        # Archivo completo
        full_backup = {
            "timestamp": datetime.now().isoformat(),
            "spreadsheet_id": SHEETS_ID,
            "total_sheets": len(all_sheets),
            "sheets": {r["name"]: r for r in results if r["rows"] > 0},
        }

        full_path = BACKUP_DIR / "full_backup.json"
        with open(full_path, "w", encoding="utf-8") as f:
            json.dump(full_backup, f, ensure_ascii=False, indent=2, default=str)

        # Archivos individuales por hoja (para facilitar verificacion)
        for result in results:
            if result["rows"] > 0:
                sheet_path = BACKUP_DIR / f"{result['name']}.json"
                with open(sheet_path, "w", encoding="utf-8") as f:
                    json.dump(result, f, ensure_ascii=False, indent=2, default=str)

        # 4. Resumen
        print()
        print("=" * 60)
        print("BACKUP COMPLETADO")
        print("=" * 60)
        total_rows = sum(r["rows"] for r in results)
        sheets_with_data = sum(1 for r in results if r["rows"] > 0)
        print(f"Hojas respaldadas: {sheets_with_data}/{len(all_sheets)}")
        print(f"Total registros: {total_rows}")
        print(f"Ubicacion: {BACKUP_DIR}")
        print(f"Archivo principal: {full_path}")
        print()

        # 5. Resumen por hoja
        print("RESUMEN POR HOJA:")
        print("-" * 40)
        for r in sorted(results, key=lambda x: x["rows"], reverse=True):
            if r["rows"] > 0:
                print(f"  {r['name']:30s} {r['rows']:>6} registros")


if __name__ == "__main__":
    asyncio.run(main())
