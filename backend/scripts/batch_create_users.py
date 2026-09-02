"""Batch create users in USUARIOS_OCR from OCR personnel sheet via Apps Script"""
import asyncio
import httpx
import hashlib
import secrets
import json
import time

SHEET_ID = "1elNfbmPM5KxW0jnttJc8kGGokPT8XUoda3iZ6qdZvZA"
API_KEY = "AIzaSyCrdStW9-jK7vz76EuB8KA7Ea_m9aVOoeI"
APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwT7VtF-hscw1JWpA36oONXckIgB7AIQdGFi3DniSlG4YhtTedNnK-U4qQYhnygl8vFrg/exec"

def sha256_hash(password, salt):
    """SHA-256 hash like Apps Script: hex(sha256(password + salt))"""
    data = (password + salt).encode("utf-8")
    digest = hashlib.sha256(data).hexdigest()
    return digest

async def main():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Get OCR sheet
        print("Leyendo hoja OCR...")
        r = await client.get(
            f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/OCR?key={API_KEY}"
        )
        rows = r.json().get("values", [])

        # 2. Get existing USUARIOS_OCR to find max ID and existing DNIs
        print("Leyendo USUARIOS_OCR existentes...")
        r2 = await client.get(
            f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/USUARIOS_OCR?key={API_KEY}"
        )
        existing = r2.json().get("values", [])
        existing_dnis = set()
        max_id = 0
        for row in existing[1:] if len(existing) > 1 else []:
            if len(row) > 3:
                existing_dnis.add(row[3])
            if len(row) > 0 and row[0].isdigit():
                max_id = max(max_id, int(row[0]))

        print(f"ID maximo existente: {max_id}")
        print(f"DNIs existentes: {len(existing_dnis)}")

        # 3. Build user rows
        next_id = max_id + 1
        new_users = []
        for row in rows[1:]:
            if not row:
                continue
            dni = str(row[0]).strip()
            grado = str(row[1]).strip() if len(row) > 1 else ""
            nombre = str(row[2]).strip() if len(row) > 2 else ""
            area = str(row[3]).strip() if len(row) > 3 else ""

            if not (dni.isdigit() and len(dni) == 8 and nombre):
                continue
            if dni in existing_dnis:
                continue

            # Generate password: OCR + DNI
            password_plain = f"OCR{dni}"
            salt = secrets.token_hex(16)
            password_hash = sha256_hash(password_plain, salt)

            new_users.append({
                "id": next_id,
                "dni": dni,
                "nombre": nombre,
                "grado": grado,
                "area": area,
                "password_hash": password_hash,
                "salt": salt,
            })
            next_id += 1

        print(f"Usuarios nuevos a crear: {len(new_users)}")
        if not new_users:
            print("No hay usuarios nuevos.")
            return

        # 4. Send batches to Apps Script (10 at a time)
        BATCH_SIZE = 10
        created = 0
        errors = 0

        for i in range(0, len(new_users), BATCH_SIZE):
            batch = new_users[i:i+BATCH_SIZE]
            for user in batch:
                row_data = [
                    user["id"],
                    user["nombre"],           # nombre_completo
                    "",                        # email
                    user["dni"],               # usuario = DNI
                    user["password_hash"],     # password_hash
                    user["salt"],              # salt
                    "0",                       # rol = usuario
                    json.dumps([user["area"]]) if user["area"] else "[]",  # areas_json
                    time.strftime("%Y-%m-%d"), # fecha_creacion
                    "",                        # ultimo_acceso
                    "0",                       # intentos_fallidos
                    "",                        # bloqueado_hasta
                    "TRUE",                    # activo
                    "TRUE",                    # requiere_cambio_password
                ]

                try:
                    r = await client.post(
                        APPS_SCRIPT_URL,
                        json={
                            "action": "admin_crearUsuario",
                            "usuario": {
                                "id": user["id"],
                                "nombre": user["nombre"],
                                "dni": user["dni"],
                                "password_hash": user["password_hash"],
                                "salt": user["salt"],
                                "rol": "0",
                                "areas": [user["area"]] if user["area"] else [],
                            }
                        },
                        headers={"Content-Type": "application/json"},
                    )
                    if r.status_code == 200:
                        result = r.json()
                        if result.get("success"):
                            created += 1
                        else:
                            errors += 1
                            print(f"  Error DNI {user['dni']}: {result}")
                    else:
                        errors += 1
                        print(f"  HTTP Error DNI {user['dni']}: {r.status_code}")
                except Exception as e:
                    errors += 1
                    print(f"  Exception DNI {user['dni']}: {e}")

            print(f"Procesado: {min(i+BATCH_SIZE, len(new_users))}/{len(new_users)} (ok={created}, err={errors})")
            await asyncio.sleep(1)  # Rate limit

        print(f"\n=== RESULTADO ===")
        print(f"Creados: {created}")
        print(f"Errores: {errors}")
        print(f"Password inicial: OCR + DNI (ej: OCR29557821)")

asyncio.run(main())
