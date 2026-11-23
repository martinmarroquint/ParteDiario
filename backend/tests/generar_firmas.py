"""Genera firmas HMAC con el MISMO algoritmo del backend (sheets_service) para
que apps-script/test/test_firma.js verifique que el Apps Script las acepta.

Uso (desde backend/):
    ./venv/Scripts/python.exe tests/generar_firmas.py <ruta/firmas.json>
    node ../apps-script/test/test_firma.js <ruta/firmas.json>
"""
import hashlib
import hmac
import json
import sys

SECRETO = "clave-de-prueba-123"

CASOS = [
    {"accion": "guardarCelda", "hoja": "ENERO 2027", "fila": 5, "columna": "F", "valor": "MAÑANA",
     "responsable": "PÉREZ ÑAÑEZ", "area": "ÁREA DE PRUEBA", "origen": "", "registrarHistorial": False},
    {"accion": "guardarLoteCeldas", "hoja": "NOVIEMBRE",
     "celdas": [{"fila": 3, "columna": "G", "valor": "CUMPLEAÑOS 🥳"}, {"fila": 4, "columna": "D", "valor": "SIN_SERVICIO"}]},
    {"accion": "padronGuardar", "modo": "alta",
     "persona": {"dni": "45678912", "grado": "SO2", "nombre": "NUÑEZ, JOSÉ", "area": "EMERGENCIA", "medico": False},
     "hojas": ["NOVIEMBRE", "DICIEMBRE"], "responsable": "ADMIN"},
    {"accion": "registrarDescansoMedico",
     "datos": {"personal_nombre": "LÓPEZ", "dias_descanso": 3, "observaciones": 'comillas " y barra \\ y salto\nlinea'}},
    {"accion": "updateRange", "hoja": "SOLICITUDES", "rango": "G7:S7",
     "valores": [["APROBADO", "4", '[{"nombre": "Ana"}]', None]]},
]


def firmar(payload: dict) -> str:
    """Igual que GoogleSheetsService._apps_script_action."""
    body = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    firma = hmac.new(SECRETO.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()
    return json.dumps({**payload, "_signature": firma}, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


if __name__ == "__main__":
    salida = [{"enviado": firmar(p)} for p in CASOS]
    with open(sys.argv[1], "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False)
    print(f"{len(salida)} firmas generadas en {sys.argv[1]}")
