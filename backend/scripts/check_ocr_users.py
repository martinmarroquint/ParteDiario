"""Check OCR sheet for valid DNIs and existing USUARIOS_OCR entries"""
import asyncio
import httpx

SHEET_ID = "1elNfbmPM5KxW0jnttJc8kGGokPT8XUoda3iZ6qdZvZA"
API_KEY = "AIzaSyCrdStW9-jK7vz76EuB8KA7Ea_m9aVOoeI"

async def main():
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Get OCR sheet
        r = await client.get(
            f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/OCR?key={API_KEY}"
        )
        data = r.json()
        rows = data.get("values", [])
        
        # Get existing USUARIOS_OCR
        r2 = await client.get(
            f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/USUARIOS_OCR?key={API_KEY}"
        )
        data2 = r2.json()
        existing_rows = data2.get("values", [])
        existing_dnis = set()
        for row in existing_rows[1:] if len(existing_rows) > 1 else []:
            if len(row) > 3:
                existing_dnis.add(row[3])  # Column D = usuario (DNI)
        
        print(f"Total filas OCR: {len(rows)}")
        print(f"Usuarios existentes en USUARIOS_OCR: {len(existing_dnis)}")
        
        valid_dnis = []
        for i, row in enumerate(rows[1:], 1):
            if not row:
                continue
            dni = str(row[0]).strip() if row else ""
            nombre = str(row[2]).strip() if len(row) > 2 else ""
            area = str(row[3]).strip() if len(row) > 3 else ""
            
            if dni.isdigit() and len(dni) == 8 and nombre:
                if dni not in existing_dnis:
                    valid_dnis.append((i, dni, nombre, area))
        
        print(f"DNIs validos sin usuario: {len(valid_dnis)}")
        print("--- Primeros 10 ---")
        for i, dni, nombre, area in valid_dnis[:10]:
            print(f"  {dni}: {nombre} - {area}")
        print("--- Ultimos 5 ---")
        for i, dni, nombre, area in valid_dnis[-5:]:
            print(f"  {dni}: {nombre} - {area}")

asyncio.run(main())
