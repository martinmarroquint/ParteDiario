"""Pruebas del cambio de anio, permisos del proxy y aplicacion de solicitudes.

Sin red ni hoja real (stubs). Como correrlo:
    cd backend
    .\\venv\\Scripts\\python.exe tests\\test_anio_padron.py

Sale con codigo 0 si todo pasa y 1 si algo falla.
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("JWT_SECRET", "x" * 32)

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.utils.hojas import nombre_hoja, parse_hoja, es_hoja_mes  # noqa: E402
from app.services.sheets_service import GoogleSheetsService  # noqa: E402
from app.services.solicitud_service import SolicitudService  # noqa: E402
from app.models.solicitud import Solicitud, Participante, ParticipanteCambio  # noqa: E402
from app.routers import sheets_proxy  # noqa: E402
from app.middleware.auth import get_current_user  # noqa: E402

FALLAS = []
TOTAL = 0


def check(nombre, obtenido, esperado):
    global TOTAL
    TOTAL += 1
    ok = obtenido == esperado
    print(f"[{'OK ' if ok else 'FALLA'}] {nombre}: {obtenido!r}" + ("" if ok else f" (esperado {esperado!r})"))
    if not ok:
        FALLAS.append(nombre)


# ----------------------------------------------------------------------
print("\n=== NOMBRES DE PESTANA POR ANIO ===")
check("nov 2026 -> sin anio", nombre_hoja(11, 2026), "NOVIEMBRE")
check("ene 2027 -> con anio", nombre_hoja(1, 2027), "ENERO 2027")
check("dic 2027", nombre_hoja(12, 2027), "DICIEMBRE 2027")
check("mes invalido", nombre_hoja(13, 2027), "")
check("parse NOVIEMBRE", parse_hoja("NOVIEMBRE"), (11, 2026))
check("parse ENERO 2027", parse_hoja("ENERO 2027"), (1, 2027))
check("parse 'ENERO 2026' no existe", parse_hoja("ENERO 2026"), None)
check("parse USUARIOS_OCR", parse_hoja("USUARIOS_OCR"), None)
check("es_hoja_mes('ROL DE MEDICOS 2026')", es_hoja_mes("ROL DE MEDICOS 2026"), False)
check("rango con espacio va entre comillas", GoogleSheetsService.rango_a1("ENERO 2027", "A:E"), "'ENERO 2027'!A:E")
check("rango sin rango", GoogleSheetsService.rango_a1("NOVIEMBRE"), "'NOVIEMBRE'")


# ----------------------------------------------------------------------
print("\n=== PROXY: LECTURA Y ESCRITURA POR ROL ===")


class U:
    def __init__(self, uid, roles):
        self.id = uid
        self.nombre = f"U{uid}"
        self.roles = roles
        self.areas = []


escrituras = []


async def fake_action(accion, data):
    escrituras.append(accion)
    return {"success": True}


async def fake_get_range(*a, **k):
    return [["x"]]


sheets_proxy.sheets_service._apps_script_action = fake_action
sheets_proxy.sheets_service.get_range = fake_get_range

app = FastAPI()
app.include_router(sheets_proxy.router)
actual = {"u": U(1, [0])}
app.dependency_overrides[get_current_user] = lambda: actual["u"]
client = TestClient(app)


def post(user, body):
    actual["u"] = user
    return client.post("/sheets/write", json=body).status_code


def get(user, hoja):
    actual["u"] = user
    return client.get(f"/sheets/{hoja}").status_code


usuario, jefe, division, admin, visor = U(1, [0]), U(2, [1]), U(3, [3]), U(4, [4]), U(6, [6])
check("usuario NO puede hacerse admin", post(usuario, {"accion": "admin_actualizarUsuario", "id": 1, "rol": "4"}), 403)
check("admin tampoco usa admin_* por el proxy", post(admin, {"accion": "admin_actualizarUsuario"}), 403)
check("nadie usa updateRange por el proxy", post(admin, {"accion": "updateRange", "hoja": "USUARIOS_OCR"}), 403)
check("nadie usa deleteRow por el proxy", post(jefe, {"accion": "deleteRow", "hoja": "NOVIEMBRE", "fila": 2}), 403)
check("usuario marca DESCANSO MEDICO", post(usuario, {"accion": "guardarCelda", "hoja": "NOVIEMBRE", "valor": "DESCANSO MEDICO"}), 200)
check("usuario NO cambia un turno", post(usuario, {"accion": "guardarCelda", "hoja": "NOVIEMBRE", "valor": "MAÑANA"}), 403)
check("visualizador marca DM", post(visor, {"accion": "guardarCelda", "hoja": "NOVIEMBRE", "valor": "DM"}), 200)
check("visualizador NO guarda lote", post(visor, {"accion": "guardarLote", "hoja": "NOVIEMBRE"}), 403)
check("jefe guarda turno", post(jefe, {"accion": "guardarCelda", "hoja": "ENERO 2027", "valor": "TARDE"}), 200)
check("jefe guarda lote de celdas", post(jefe, {"accion": "guardarLoteCeldas", "hoja": "NOVIEMBRE", "celdas": []}), 200)
check("jefe NO escribe celdas fuera de un mes", post(jefe, {"accion": "guardarCelda", "hoja": "USUARIOS_OCR", "valor": "X"}), 400)
check("jefe de area NO desbloquea", post(jefe, {"accion": "desmarcarFinalizado", "mes": "NOVIEMBRE"}), 403)
check("jefe de division desbloquea", post(division, {"accion": "desmarcarFinalizado", "mes": "NOVIEMBRE"}), 200)
check("admin bloqueo masivo", post(admin, {"accion": "marcarLoteFinalizado", "mes": "NOVIEMBRE", "areas": []}), 200)
check("jefe NO genera meses por el proxy", post(jefe, {"accion": "generarMes"}), 403)
check("lectura de un mes", get(usuario, "NOVIEMBRE"), 200)
check("lectura de mes 2027", get(usuario, "ENERO 2027"), 200)
check("lectura de ESTADOS", get(usuario, "ESTADOS"), 200)
check("NO se lee USUARIOS_OCR (hashes)", get(admin, "USUARIOS_OCR"), 403)
check("NO se lee RECUPERACION", get(admin, "RECUPERACION"), 403)
actual["u"] = usuario
check("estado-cambios responde token", "token" in client.get("/sheets/estado-cambios?hoja=NOVIEMBRE").json(), True)


# ----------------------------------------------------------------------
print("\n=== SOLICITUD APROBADA: SE UBICA POR DNI Y SE VERIFICA EL TURNO ===")

HOJA = [
    ["DNI", "GRADO", "APELLIDOS Y NOMBRES", "AREA", "MEDICOS"] + [f"d{d}" for d in range(1, 32)],
    ["111", "SO1", "PEREZ, ANA", "AREA X", "FALSE"] + ["MAÑANA"] * 31,
    ["222", "SO2", "LOPEZ, LUIS", "AREA X", "FALSE"] + ["TARDE"] * 31,
]


class FakeSheets:
    def __init__(self, filas):
        self.filas = [list(r) for r in filas]
        self.escritas = []
        self.update_ranges = []

    async def get_range(self, hoja, rango=""):
        if hoja == "ESTADOS":
            return [["MES", "AREA", "ESTADO"], ["NOVIEMBRE", "AREA BLOQUEADA", "FINALIZADO"]]
        if hoja in ("DICIEMBRE", "ENERO 2027"):
            return self.filas
        return []

    def invalidate_sheet(self, hoja):
        pass

    async def guardar_celda(self, hoja, fila, columna, valor, **k):
        self.escritas.append((hoja, fila, columna, valor))
        return {"success": True}

    async def find_row_index(self, *a, **k):
        return 7

    async def update_range(self, hoja, rango, valores):
        self.update_ranges.append((hoja, rango, len(valores[0])))
        return {"success": True}


def solicitud(participantes, mes=12, anio=2026):
    return Solicitud(
        id="abc", solicitante_id=1, solicitante_nombre="PEREZ, ANA", fecha_solicitud="",
        estado="PENDIENTE", nivel_actual=4, area_solicitante="AREA X", tipo_cambio="X",
        participantes=participantes, motivo="motivo largo", hoja="", mes=mes, anio=anio,
        cadena=[{"nombre": "Administrador", "nivel": 4, "user_id": 0}], historial=[],
    )


def part(nombre, dni, fila, cambios):
    return Participante(nombre=nombre, dni=dni, area="AREA X", fila=fila,
                        cambios=[ParticipanteCambio(dia=d, turno_actual=a, turno_nuevo=n) for d, a, n in cambios])


async def pruebas_solicitud():
    # 1) Fila correcta
    fs = FakeSheets(HOJA)
    svc = SolicitudService(fs)
    err = await svc._aplicar_cambios(solicitud([part("PEREZ, ANA", "111", 2, [(5, "M", "T")])]))
    check("aplica en la fila correcta", (err, fs.escritas), ([], [("DICIEMBRE", 2, "J", "TARDE")]))

    # 2) Alguien inserto una fila arriba: la fila guardada (2) ya no es ANA
    movida = [HOJA[0], ["999", "CAP", "NUEVO, PEDRO", "AREA X", "FALSE"] + [""] * 31, HOJA[1], HOJA[2]]
    fs = FakeSheets(movida)
    svc = SolicitudService(fs)
    err = await svc._aplicar_cambios(solicitud([part("PEREZ, ANA", "111", 2, [(5, "M", "T")])]))
    check("fila desplazada: escribe en ANA (fila 3), no en PEDRO", (err, fs.escritas), ([], [("DICIEMBRE", 3, "J", "TARDE")]))

    # 3) El turno cambio desde que se pidio: no se pisa y no se escribe nada
    fs = FakeSheets(HOJA)
    svc = SolicitudService(fs)
    err = await svc._aplicar_cambios(solicitud([
        part("PEREZ, ANA", "111", 2, [(5, "M", "T")]),
        part("LOPEZ, LUIS", "222", 3, [(5, "M", "F")]),   # LUIS tiene TARDE, no MAÑANA
    ]))
    check("conflicto detectado", len(err) == 1 and "cambio desde que se pidio" in err[0], True)
    check("con conflicto no se escribe NADA", fs.escritas, [])

    # 4) Reintento: ya estaba aplicado -> no reescribe
    ya = [HOJA[0], ["111", "SO1", "PEREZ, ANA", "AREA X", "FALSE"] + ["TARDE"] * 31]
    fs = FakeSheets(ya)
    svc = SolicitudService(fs)
    err = await svc._aplicar_cambios(solicitud([part("PEREZ, ANA", "111", 2, [(5, "M", "T")])]))
    check("reintento idempotente", (err, fs.escritas), ([], []))

    # 5) Persona que ya no esta en la hoja
    fs = FakeSheets(HOJA)
    svc = SolicitudService(fs)
    err = await svc._aplicar_cambios(solicitud([part("GOMEZ, JUAN", "333", 2, [(5, "M", "T")])]))
    check("persona inexistente -> error, sin escribir", (len(err), fs.escritas), (1, []))

    # 6) Solicitud de enero 2027 va a la pestana "ENERO 2027"
    fs = FakeSheets(HOJA)
    svc = SolicitudService(fs)
    err = await svc._aplicar_cambios(solicitud([part("PEREZ, ANA", "111", 2, [(2, "M", "F")])], mes=1, anio=2027))
    check("enero 2027 escribe en 'ENERO 2027'", (err, fs.escritas), ([], [("ENERO 2027", 2, "G", "FRANCO")]))

    # 7) Mes finalizado del area de un participante
    fs = FakeSheets(HOJA)
    svc = SolicitudService(fs)
    check("ESTADOS usa el nombre de pestana", await svc._mes_finalizado("AREA BLOQUEADA", 11, 2026), True)
    check("el mismo mes de 2027 NO esta bloqueado", await svc._mes_finalizado("AREA BLOQUEADA", 11, 2027), False)

    # 8) Actualizacion de la solicitud en UNA escritura G:S
    fs = FakeSheets(HOJA)
    svc = SolicitudService(fs)
    await svc._update_solicitud(solicitud([]))
    check("una sola escritura G7:S7 con 13 columnas", fs.update_ranges, [("SOLICITUDES", "G7:S7", 13)])


asyncio.run(pruebas_solicitud())

print(f"\nRESULTADO: {TOTAL - len(FALLAS)}/{TOTAL} pruebas OK")
sys.exit(1 if FALLAS else 0)
