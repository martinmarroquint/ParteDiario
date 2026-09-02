"""
Script de Setup - Crear Usuarios desde Google Sheets
=====================================================
Lee el personal de Google Sheets (hoja OCR) y crea usuarios en USUARIOS_OCR
a traves del Apps Script (que tiene permisos de escritura).

Uso:
    cd D:\\OCR-ROLES-SERVICIO\\backend
    .\\venv\\Scripts\\python.exe setup_usuarios.py
"""

import os
import sys
import httpx
from dotenv import load_dotenv

load_dotenv()

SHEET_ID = os.getenv("GOOGLE_SHEETS_ID")
API_KEY = os.getenv("GOOGLE_SHEETS_API_KEY")
APPS_SCRIPT_URL = os.getenv("GOOGLE_APPS_SCRIPT_URL")

HOJA_PERSONAL = "OCR"
PASSWORD_PREFIX = "OCR"


async def leer_personal():
    """Leer personal desde Google Sheets (hoja OCR)."""
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/{HOJA_PERSONAL}?key={API_KEY}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()
        return data.get("values", [])


async def crear_usuario_via_apps_script(dni, nombre, grado, area):
    """Crear un usuario usando el Apps Script (admin_crearUsuario)."""
    if not APPS_SCRIPT_URL:
        print("  [ERROR] GOOGLE_APPS_SCRIPT_URL no configurado")
        return False
    
    password_inicial = f"{PASSWORD_PREFIX}{dni}"
    
    payload = {
        "accion": "admin_crearUsuario",
        "token": "",  # Se necesitaria un token de admin
        "datos": {
            "nombre": nombre,
            "email": f"{dni}@hospital.pnp",
            "usuario": dni,
            "password": password_inicial,
            "rol": "0",
            "areas": [area] if area else [],
            "activo": True
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                APPS_SCRIPT_URL,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            result = response.json()
            
            if result.get("success"):
                print(f"  [OK] Creado: {dni} / {password_inicial}")
                return True
            else:
                error = result.get("error", "Error desconocido")
                if "ya existe" in error.lower():
                    print(f"  [SKIP] {dni} ya existe")
                    return False
                print(f"  [ERROR] {dni}: {error}")
                return False
    except Exception as e:
        print(f"  [ERROR] {dni}: {e}")
        return False


async def main():
    """Funcion principal."""
    print("=" * 60)
    print("OCR ROLES SERVICIO - Setup de Usuarios")
    print("=" * 60)
    print()
    
    if not SHEET_ID or not API_KEY:
        print("[ERROR] GOOGLE_SHEETS_ID y GOOGLE_SHEETS_API_KEY deben estar en .env")
        sys.exit(1)
    
    if not APPS_SCRIPT_URL:
        print("[WARN] GOOGLE_APPS_SCRIPT_URL no configurado en .env")
        print("       Los usuarios se crearan localmente (sin persistir en Sheets)")
        print()
    
    print("Leyendo personal de Google Sheets...")
    print(f"  Sheet ID: {SHEET_ID}")
    print(f"  Hoja: {HOJA_PERSONAL}")
    print()
    
    try:
        personal = await leer_personal()
    except Exception as e:
        print(f"[ERROR] al leer Google Sheets: {e}")
        sys.exit(1)
    
    if len(personal) <= 1:
        print(f"[WARN] La hoja '{HOJA_PERSONAL}' esta vacia")
        sys.exit(1)
    
    print(f"Personal encontrado: {len(personal) - 1} registros")
    print()
    
    usuarios_creados = 0
    usuarios_existentes = 0
    errores = 0
    
    for i, fila in enumerate(personal[1:], start=2):
        if len(fila) < 4:
            continue
        
        dni = fila[0].strip() if fila[0] else ""
        grado = fila[1].strip() if len(fila) > 1 and fila[1] else ""
        nombre = fila[2].strip() if len(fila) > 2 and fila[2] else ""
        area = fila[3].strip() if len(fila) > 3 and fila[3] else ""
        
        if not dni or not nombre:
            continue
        
        if not dni.isdigit() or len(dni) != 8:
            continue
        
        try:
            if APPS_SCRIPT_URL:
                result = await crear_usuario_via_apps_script(dni, nombre, grado, area)
            else:
                # Modo local (sin Apps Script)
                print(f"  [LOCAL] {dni} - {nombre} - {grado} - {area}")
                result = True
            
            if result:
                usuarios_creados += 1
            else:
                usuarios_existentes += 1
        except Exception as e:
            print(f"  [ERROR] {dni}: {e}")
            errores += 1
    
    print()
    print("=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"  Usuarios procesados: {usuarios_creados}")
    print(f"  Existentes/saltados: {usuarios_existentes}")
    if errores:
        print(f"  Errores: {errores}")
    print()
    print("CREDENCIALES:")
    print("-" * 60)
    print(f"  Usuario: DNI")
    print(f"  Contrasena: {PASSWORD_PREFIX} + DNI")
    print(f"  Ejemplo: DNI 29557821 -> Contrasena: OCR29557821")
    print()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
