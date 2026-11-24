"""Pruebas: solicitudes sin duplicados y turnos con texto no reconocido.

Sin red ni hoja real (stubs). Como correrlo:
    cd backend
    .\\venv\\Scripts\\python.exe tests\\test_duplicados_turnos.py

Sale con codigo 0 si todo pasa y 1 si algo falla.
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("JWT_SECRET", "x" * 32)

from app.services import solicitud_service as mod  # noqa: E402
from app.services.solicitud_service import SolicitudService  # noqa: E402
from app.models.solicitud import (  # noqa: E402
    Solicitud, SolicitudCreate, Participante, ParticipanteCambio,
)

FALLAS = []
TOTAL = 0


def check(nombre, obtenido, esperado):
    global TOTAL
    TOTAL += 1
    ok = obtenido == esperado
    print(f"[{'OK ' if ok else 'FALLA'}] {nombre}: {obtenido!r}" + ("" if ok else f" (esperado {esperado!r})"))
    if not ok:
        FALLAS.append(nombre)


# Fecha fija: los cambios se piden para diciembre 2026.
mod.hoy_lima = lambda: __import__("datetime").date(2026, 11, 24)
mod._lima_hoy = lambda: __import__("datetime").date(2026, 11, 24)


class Usuario:
    def __init__(self, uid, nombre, roles, areas):
        self.id = uid
        self.nombre = nombre
        self.roles = roles
        self.areas = areas
        self.grado = ""


USUARIOS = [
    ["id", "nombre", "c", "d", "e", "f", "rol", "areas"],
    ["1", "PEREZ, ANA", "", "", "", "", "0", '["AREA X"]'],
    ["2", "JEFE, UNO", "", "", "", "", "1", '["AREA X"]'],
    ["3", "OTRA, PERSONA", "", "", "", "", "0", '["AREA X"]'],
]


class FakeSheets:
    """SOLICITUDES en memoria; append lento para simular el timeout."""

    def __init__(self, demora=0.0):
        self.solicitudes = [list(mod.SOLICITUDES_HEADER)]
        self.appends = 0
        self.demora = demora

    async def get_range(self, hoja, rango=""):
        if hoja == mod.HOJA_USUARIOS:
            return USUARIOS
        if hoja == mod.HOJA_SOLICITUDES:
            return [list(r) for r in self.solicitudes]
        if hoja == "ESTADOS":
            return [["MES", "AREA", "ESTADO"]]
        return []

    async def find_row(self, hoja, col, valor):
        for r in await self.get_range(hoja):
            if len(r) > col and r[col] == valor:
                return r
        return None

    async def asegurar_hoja(self, *a, **k):
        return True

    async def append_row(self, hoja, valores):
        await asyncio.sleep(self.demora)
        self.appends += 1
        self.solicitudes.append([str(v) for v in valores])
        return {"success": True}


class FakeUserService:
    async def get_user_by_id(self, uid):
        for r in USUARIOS[1:]:
            if int(r[0]) == uid:
                return Usuario(uid, r[1], [int(r[6])], ["AREA X"])
        return None


def nueva(id_cliente=None, dia=5):
    return SolicitudCreate(
        tipo_cambio="CAMBIO INDIVIDUAL",
        participantes=[Participante(
            nombre="PEREZ, ANA", dni="111", area="AREA X", fila=2,
            cambios=[ParticipanteCambio(dia=dia, turno_actual="M", turno_nuevo="T",
                                        turno_nuevo_nombre="TARDE",
                                        turno_actual_nombre="MAÑANA")],
        )],
        motivo="motivo suficientemente largo", hoja="DICIEMBRE", mes=12, anio=2026,
        id_cliente=id_cliente,
    )


def servicio(fs):
    svc = SolicitudService(fs)
    svc.user_service = FakeUserService()
    return svc


async def pruebas_duplicados():
    print("\n=== DUPLICADOS ===")
    mod._LOCKS_CREACION.clear()

    # 1) Reenvio con la misma clave (timeout en el navegador): una sola fila
    fs = FakeSheets()
    svc = servicio(fs)
    clave = "3f9a1c2e-7b4d-4e1a-9c3b-123456789abc"
    a = await svc.crear_solicitud(1, nueva(clave))
    b = await svc.crear_solicitud(1, nueva(clave))
    check("reenvio devuelve la misma solicitud", a.id == b.id, True)
    check("reenvio no crea otra fila", fs.appends, 1)
    check("el id sale de la clave del navegador", a.id, "3f9a1c2e")

    # 2) Dos envios SIMULTANEOS con la misma clave (el reenvio llega mientras
    #    la primera todavia se guarda): el lock evita la segunda fila.
    fs = FakeSheets(demora=0.2)
    svc = servicio(fs)
    clave = "aaaabbbb-0000-0000-0000-000000000000"
    r1, r2 = await asyncio.gather(
        svc.crear_solicitud(1, nueva(clave)), svc.crear_solicitud(1, nueva(clave))
    )
    check("simultaneos: misma solicitud", r1.id == r2.id, True)
    check("simultaneos: una sola fila", fs.appends, 1)

    # 3) Claves distintas = solicitudes distintas
    fs = FakeSheets()
    svc = servicio(fs)
    x = await svc.crear_solicitud(1, nueva("11112222-aaaa"))
    y = await svc.crear_solicitud(1, nueva("33334444-bbbb"))
    check("claves distintas crean dos filas", (fs.appends, x.id != y.id), (2, True))

    # 4) Otra persona reusa una clave ajena: NO recibe la solicitud de otro
    fs = FakeSheets()
    svc = servicio(fs)
    propia = await svc.crear_solicitud(1, nueva("cafecafe-1234"))
    ajena = await svc.crear_solicitud(3, nueva("cafecafe-1234"))
    check("clave ajena: id distinto", ajena.id != propia.id, True)
    check("clave ajena: solicitante correcto", ajena.solicitante_id, 3)
    check("clave ajena: se crea su propia fila", fs.appends, 2)

    # 5) Front antiguo sin clave: sigue funcionando (id al azar)
    fs = FakeSheets()
    svc = servicio(fs)
    s = await svc.crear_solicitud(1, nueva(None))
    check("sin clave: crea normalmente", (fs.appends, len(s.id)), (1, 8))

    # 6) Clave con formato invalido: la rechaza la validacion del modelo
    try:
        nueva("x;drop")
        check("clave invalida rechazada", False, True)
    except Exception:
        check("clave invalida rechazada", True, True)


# ----------------------------------------------------------------------
HOJA = [
    ["DNI", "GRADO", "NOMBRE", "AREA", "X"] + [str(d) for d in range(1, 32)],
    ["111", "SO1", "PEREZ, ANA", "AREA X", "FALSE"] + ["MAÑANA"] * 31,
]


class FakeRol:
    def __init__(self, filas):
        self.filas = [list(r) for r in filas]
        self.escritas = []

    async def get_range(self, hoja, rango=""):
        if hoja == "ESTADOS":
            return [["MES", "AREA", "ESTADO"]]
        if hoja == "DICIEMBRE":
            return self.filas
        return []

    def invalidate_sheet(self, hoja):
        pass

    async def guardar_celda(self, hoja, fila, columna, valor, **k):
        self.escritas.append((hoja, fila, columna, valor))
        return {"success": True}


def rol_con(dia5):
    fila = list(HOJA[1])
    fila[4 + 5] = dia5
    return [HOJA[0], fila]


def sol(turno_actual, turno_actual_nombre):
    return Solicitud(
        id="abc", solicitante_id=1, solicitante_nombre="PEREZ, ANA", fecha_solicitud="",
        estado="PENDIENTE", nivel_actual=4, area_solicitante="AREA X", tipo_cambio="X",
        participantes=[Participante(
            nombre="PEREZ, ANA", dni="111", area="AREA X", fila=2,
            cambios=[ParticipanteCambio(dia=5, turno_actual=turno_actual, turno_nuevo="T",
                                        turno_nuevo_nombre="TARDE",
                                        turno_actual_nombre=turno_actual_nombre)],
        )],
        motivo="motivo largo", hoja="", mes=12, anio=2026,
        cadena=[{"nombre": "Administrador", "nivel": 4, "user_id": 0}], historial=[],
    )


async def pruebas_turnos():
    print("\n=== TURNOS CON TEXTO NO RECONOCIDO ===")

    # 1) Celda con texto libre que el sistema no conoce: ahora SI se aplica
    fs = FakeRol(rol_con("CURSO SEGURIDAD"))
    err = await SolicitudService(fs)._aplicar_cambios(sol("S/T", "CURSO SEGURIDAD"))
    check("texto desconocido: se aplica", (err, fs.escritas), ([], [("DICIEMBRE", 2, "J", "TARDE")]))

    # 2) Mismo caso pero alguien cambio la celda despues: se detecta y NO se pisa
    fs = FakeRol(rol_con("MAÑANA"))
    err = await SolicitudService(fs)._aplicar_cambios(sol("S/T", "CURSO SEGURIDAD"))
    check("texto cambiado despues: conflicto", len(err) == 1 and "CURSO SEGURIDAD" in err[0], True)
    check("texto cambiado despues: no escribe", fs.escritas, [])

    # 3) Diferencias de mayusculas / tildes / espacios no cuentan como cambio
    fs = FakeRol(rol_con("Curso  Seguridad"))
    err = await SolicitudService(fs)._aplicar_cambios(sol("S/T", "CURSO SEGURIDAD"))
    check("mayusculas/espacios: se aplica", (err, len(fs.escritas)), ([], 1))

    # 4) Celda vacia de verdad (sin turno) con el dato nuevo
    fs = FakeRol(rol_con(""))
    err = await SolicitudService(fs)._aplicar_cambios(sol("S/T", ""))
    check("sin turno real: se aplica", (err, len(fs.escritas)), ([], 1))

    # 5) Turno conocido con el dato nuevo
    fs = FakeRol(rol_con("MAÑANA"))
    err = await SolicitudService(fs)._aplicar_cambios(sol("M", "MAÑANA"))
    check("turno conocido: se aplica", (err, len(fs.escritas)), ([], 1))

    # 6) Solicitud ANTIGUA (sin turno_actual_nombre) con texto desconocido:
    #    antes fallaba siempre; ahora se aplica.
    fs = FakeRol(rol_con("CURSO SEGURIDAD"))
    err = await SolicitudService(fs)._aplicar_cambios(sol("S/T", None))
    check("antigua + texto desconocido: se aplica", (err, len(fs.escritas)), ([], 1))

    # 7) Solicitud ANTIGUA con turno conocido que cambio: sigue protegida
    fs = FakeRol(rol_con("FRANCO"))
    err = await SolicitudService(fs)._aplicar_cambios(sol("M", None))
    check("antigua + turno cambiado: conflicto", (len(err), fs.escritas), (1, []))

    # 8) Solicitud ANTIGUA "sin turno" pero la celda ahora tiene un turno conocido
    fs = FakeRol(rol_con("MAÑANA"))
    err = await SolicitudService(fs)._aplicar_cambios(sol("S/T", None))
    check("antigua sin turno -> ahora MAÑANA: conflicto", (len(err), fs.escritas), (1, []))


asyncio.run(pruebas_duplicados())
asyncio.run(pruebas_turnos())

print(f"\nRESULTADO: {TOTAL - len(FALLAS)}/{TOTAL} pruebas OK")
sys.exit(1 if FALLAS else 0)
