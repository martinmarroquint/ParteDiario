"""Pruebas del registro de descanso medico sobre el rol.

Sin red ni hoja real (stubs). Como correrlo:
    cd backend
    .\\venv\\Scripts\\python.exe tests\\test_descansos_rol.py

Sale con codigo 0 si todo pasa y 1 si algo falla.
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("JWT_SECRET", "x" * 32)

from app.services.descanso_service import DescansoService  # noqa: E402
from app.models.descanso import DescansoRolCreate  # noqa: E402

FALLAS = []
TOTAL = 0


def check(nombre, obtenido, esperado):
    global TOTAL
    TOTAL += 1
    ok = obtenido == esperado
    print(f"[{'OK ' if ok else 'FALLA'}] {nombre}: {obtenido!r}" + ("" if ok else f" (esperado {esperado!r})"))
    if not ok:
        FALLAS.append(nombre)


CAB = ["DNI", "GRADO", "NOMBRE", "AREA", "X"]
DIC = [CAB, ["999", "CAP", "OTRO, PEDRO", "AREA X", ""], ["111", "SO1", "PEREZ, ANA", "AREA X", ""]]
ENE = [CAB, ["111", "SO1", "PEREZ, ANA", "AREA X", ""]]  # ANA en otra fila en enero


class FakeSheets:
    def __init__(self, hojas, falla_en=None, falla_constancia=False):
        self.hojas = hojas
        self.acciones = []
        self.falla_en = falla_en
        self.falla_constancia = falla_constancia

    async def get_range(self, hoja, rango=""):
        return self.hojas.get(hoja, [])

    def invalidate_sheet(self, hoja):
        pass

    async def _apps_script_action(self, accion, data):
        if accion == "guardarIndividual" and data["hoja"] == self.falla_en:
            raise RuntimeError("Apps Script: timeout")
        if accion == "registrarDescansoMedico" and self.falla_constancia:
            raise RuntimeError("Apps Script: error")
        self.acciones.append((accion, data))
        return {"success": True}


def dm(inicio, retorno, nombre="PEREZ, ANA", dni="111"):
    return DescansoRolCreate(
        personal_dni=dni, personal_nombre=nombre, personal_grado="SO1",
        personal_area="AREA X", medico_nombre="DR. X", fecha_inicio=inicio,
        fecha_retorno=retorno, diagnostico="J06.9 - resfrio",
    )


def escrituras(fs):
    return [(d["hoja"], d["fila"], d["colInicio"], len(d["valores"]), d["valores"][0])
            for a, d in fs.acciones if a == "guardarIndividual"]


async def pruebas():
    # 1) Del 1 al 3 (retorno el 3): marca 1 y 2, en la fila REAL de ANA (3)
    fs = FakeSheets({"DICIEMBRE": DIC})
    r = await DescansoService(fs).registrar_en_rol(dm("2026-12-01", "2026-12-03"), "JEFE")
    check("marca solo hasta el dia anterior al retorno", escrituras(fs), [("DICIEMBRE", 3, "F", 2, "DESCANSO MEDICO")])
    check("cuenta 2 dias", r.dias_marcados, 2)
    constancia = [d["datos"] for a, d in fs.acciones if a == "registrarDescansoMedico"]
    check("deja constancia", len(constancia), 1)
    check("constancia con quien registro", constancia[0]["registrado_por"], "JEFE")

    # 2) Cruza de mes: dic 30 -> ene 3 (marca 30, 31, 1, 2) con filas distintas
    fs = FakeSheets({"DICIEMBRE": DIC, "ENERO 2027": ENE})
    r = await DescansoService(fs).registrar_en_rol(dm("2026-12-30", "2027-01-03"), "JEFE")
    check("cruza de mes: dos escrituras con su fila", escrituras(fs),
          [("DICIEMBRE", 3, "AI", 2, "DESCANSO MEDICO"), ("ENERO 2027", 2, "F", 2, "DESCANSO MEDICO")])
    check("cruza de mes: 4 dias", r.dias_marcados, 4)

    # 3) El mes siguiente aun no existe: marca lo que se puede y AVISA
    fs = FakeSheets({"DICIEMBRE": DIC})
    r = await DescansoService(fs).registrar_en_rol(dm("2026-12-30", "2027-01-03"), "JEFE")
    check("sin hoja de enero: marca diciembre", escrituras(fs), [("DICIEMBRE", 3, "AI", 2, "DESCANSO MEDICO")])
    check("sin hoja de enero: avisa los dias pendientes", r.dias_sin_hoja, ["1 ENERO 2027", "2 ENERO 2027"])
    check("sin hoja de enero: advertencia", len(r.advertencias), 1)

    # 4) Persona que no esta en la hoja: error y NO escribe nada
    fs = FakeSheets({"DICIEMBRE": DIC})
    try:
        await DescansoService(fs).registrar_en_rol(dm("2026-12-01", "2026-12-03", "NADIE, X", "000"), "JEFE")
        check("persona inexistente: error", False, True)
    except ValueError as e:
        check("persona inexistente: error", "No se encontro" in str(e), True)
    check("persona inexistente: no escribe", fs.acciones, [])

    # 5) Si falta en ENERO, tampoco se escribe diciembre (todo o nada al ubicar)
    fs = FakeSheets({"DICIEMBRE": DIC, "ENERO 2027": [CAB, ["222", "SO2", "LOPEZ, LUIS", "AREA X", ""]]})
    try:
        await DescansoService(fs).registrar_en_rol(dm("2026-12-30", "2027-01-03"), "JEFE")
        check("falta en un mes: error", False, True)
    except ValueError:
        check("falta en un mes: error", True, True)
    check("falta en un mes: no escribe ninguno", fs.acciones, [])

    # 6) Retorno igual o anterior al inicio
    for ini, ret in (("2026-12-05", "2026-12-05"), ("2026-12-05", "2026-12-01")):
        try:
            await DescansoService(FakeSheets({"DICIEMBRE": DIC})).registrar_en_rol(dm(ini, ret), "J")
            check(f"retorno {ret} invalido", False, True)
        except ValueError as e:
            check(f"retorno {ret} invalido", "posterior" in str(e), True)

    # 7) Ningun mes tiene hoja: error claro
    try:
        await DescansoService(FakeSheets({})).registrar_en_rol(dm("2027-03-01", "2027-03-03"), "J")
        check("sin ninguna hoja: error", False, True)
    except ValueError as e:
        check("sin ninguna hoja: error", "Ningun dia" in str(e), True)

    # 8) Falla la escritura del segundo mes: error que dice que SI se marco
    fs = FakeSheets({"DICIEMBRE": DIC, "ENERO 2027": ENE}, falla_en="ENERO 2027")
    try:
        await DescansoService(fs).registrar_en_rol(dm("2026-12-30", "2027-01-03"), "JEFE")
        check("falla al escribir: error", False, True)
    except RuntimeError as e:
        check("falla al escribir: informa lo ya marcado", "Ya se marco: DICIEMBRE" in str(e), True)

    # 9) Falla solo la constancia: el rol quedo marcado y se advierte
    fs = FakeSheets({"DICIEMBRE": DIC}, falla_constancia=True)
    r = await DescansoService(fs).registrar_en_rol(dm("2026-12-01", "2026-12-03"), "JEFE")
    check("sin constancia: igual marca", r.dias_marcados, 2)
    check("sin constancia: advierte", any("constancia" in a for a in r.advertencias), True)

    # 10) Sin DNI en la hoja: ubica por nombre
    sin_dni = [CAB, ["", "SO1", "PEREZ, ANA", "AREA X", ""]]
    fs = FakeSheets({"DICIEMBRE": sin_dni})
    r = await DescansoService(fs).registrar_en_rol(dm("2026-12-10", "2026-12-11", dni=""), "J")
    check("sin DNI: ubica por nombre", escrituras(fs), [("DICIEMBRE", 2, "O", 1, "DESCANSO MEDICO")])

    # 11) Fecha con formato invalido: la rechaza el modelo
    try:
        dm("01/12/2026", "2026-12-03")
        check("formato de fecha invalido rechazado", False, True)
    except Exception:
        check("formato de fecha invalido rechazado", True, True)


asyncio.run(pruebas())
print(f"\nRESULTADO: {TOTAL - len(FALLAS)}/{TOTAL} pruebas OK")
sys.exit(1 if FALLAS else 0)
