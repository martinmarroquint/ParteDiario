"""Verificacion de las reglas de las solicitudes de cambio de turno.

Cubre, sin tocar la red ni la hoja real (usa un stub de GoogleSheetsService):
  - normalizacion de nombres de area (tildes, mayusculas, espacios)
  - armado de la cadena de aprobacion y exclusion del solicitante
  - permiso de aprobacion: solo el paso ACTUAL de la cadena
  - regla de plazo: hay que validar antes del dia del turno (hora de Peru)
  - bloqueo de mes FINALIZADO

Como correrlo:
    cd backend
    .\\venv\\Scripts\\python.exe tests\\test_solicitud_cadena.py

Sale con codigo 0 si todo pasa y 1 si algo falla.
"""
import asyncio
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.solicitud_service import (  # noqa: E402
    SolicitudService, _norm, _hoja_mes, _parse_roles, _lima_hoy,
)
from app.models.solicitud import Solicitud, Participante, ParticipanteCambio  # noqa: E402


class FakeSheets:
    """Stub minimo de GoogleSheetsService."""

    def __init__(self, usuarios):
        self._usuarios = usuarios

    async def get_range(self, hoja):
        if hoja == "USUARIOS_OCR":
            return self._usuarios
        if hoja == "ESTADOS":
            return [["MES", "AREA", "ESTADO"], ["SEPTIEMBRE", "ÁREA DE PRUEBA", "FINALIZADO"]]
        return []

    async def asegurar_hoja(self, *a, **k):
        return None

    async def find_row_index(self, *a, **k):
        return None

    async def update_cell(self, *a, **k):
        return None


class U:
    """Usuario minimo (mismos atributos que usa SolicitudService)."""

    def __init__(self, uid, nombre, roles, areas):
        self.id = uid
        self.nombre = nombre
        self.roles = roles
        self.areas = areas
        self.grado = ""


def sol(dias, cadena, historial=None, solicitante_id=1, area="ÁREA DE PRUEBA", mes=None):
    hoy = _lima_hoy()
    return Solicitud(
        id="abc12345",
        solicitante_id=solicitante_id,
        solicitante_nombre="SOLICITANTE UNO",
        solicitante_grado="",
        fecha_solicitud="2026-01-01T00:00:00",
        estado="PENDIENTE",
        nivel_actual=cadena[0]["nivel"] if cadena else 4,
        area_solicitante=area,
        tipo_cambio="CAMBIO INDIVIDUAL",
        participantes=[Participante(
            nombre="SOLICITANTE UNO", dni="", area=area, fila=5,
            cambios=[ParticipanteCambio(dia=d, turno_actual="M", turno_nuevo="T") for d in dias],
        )],
        motivo="motivo de prueba largo",
        pormenores="",
        hoja="",
        mes=mes or hoy.month,
        anio=hoy.year,
        cadena=cadena,
        historial=historial or [],
        creado_en="", actualizado_en="",
    )


RESULTADOS = []


def check(nombre, obtenido, esperado):
    ok = obtenido == esperado
    print(f"[{'OK ' if ok else 'FALLA'}] {nombre}: {obtenido!r} (esperado {esperado!r})")
    RESULTADOS.append(ok)
    return ok


async def main():
    print("=== normalizacion de areas ===")
    check("_norm con tildes", _norm("ÁREA DE EMERGENCÍA"), "AREA DE EMERGENCIA")
    check("_norm espacios", _norm("  area   de  prueba "), "AREA DE PRUEBA")
    check("_hoja_mes(9)", _hoja_mes(9), "SEPTIEMBRE")
    check("_parse_roles('jefe_area')", _parse_roles("jefe_area"), [1])
    check("_parse_roles('1,2')", _parse_roles("1,2"), [1, 2])

    print("\n=== cadena: solicita un JEFE DE AREA (no entra el mismo) ===")
    usuarios = [
        ["id_usuario", "nombre_completo", "email", "usuario", "hash", "salt", "rol", "areas_json"],
        ["1", "JEFE DE AREA UNO", "a@x", "1", "h", "s", "1", '["ÁREA DE PRUEBA"]'],
        ["2", "REQUERIDO JEFE AREA", "b@x", "2", "h", "s", "1", '["AREA DE PRUEBA"]'],
        ["3", "JEFE DEPARTAMENTO", "c@x", "3", "h", "s", "2", '["ÁREA DE PRUEBA"]'],
        ["9", "ADMINISTRADOR", "d@x", "9", "h", "s", "admin", "[]"],
    ]
    svc = SolicitudService(FakeSheets(usuarios))

    cadena = await svc._build_cadena_aprobacion(
        "ÁREA DE PRUEBA", excluir_user_id=2, excluir_nombre="REQUERIDO JEFE AREA"
    )
    nombres = [(c["nombre"], c["nivel"]) for c in cadena]
    print("   cadena:", nombres)
    check("excluye al solicitante", "REQUERIDO JEFE AREA" not in [c["nombre"] for c in cadena], True)
    check("mantiene al otro jefe de area", nombres[0], ("JEFE DE AREA UNO", 1))
    check("sigue con el departamento", nombres[1], ("JEFE DEPARTAMENTO", 2))
    check("admin al final", nombres[-1], ("Administrador", 4))

    print("\n=== el match de area ignora tildes ===")
    nombres2 = [c["nombre"] for c in await svc._build_cadena_aprobacion("AREA DE PRUEBA")]
    print("   cadena:", nombres2)
    check("encuentra los jefes igual", len(nombres2) >= 3, True)

    print("\n=== permiso: solo el paso ACTUAL de la cadena ===")
    jefe1 = U(1, "JEFE DE AREA UNO", [1], ["ÁREA DE PRUEBA"])
    jefe2 = U(3, "JEFE DEPARTAMENTO", [2], ["ÁREA DE PRUEBA"])
    admin = U(9, "ADMINISTRADOR", [4], [])
    otro = U(77, "JEFE DE OTRA AREA", [1], ["OTRA AREA"])
    solicitante = U(2, "REQUERIDO JEFE AREA", [1], ["AREA DE PRUEBA"])

    s = sol([_lima_hoy().day + 2], cadena, solicitante_id=2)
    s.nivel_actual = 1
    check("jefe 1 (su turno) puede", svc._puede_actuar(s, jefe1), True)
    check("jefe 2 (aun no) NO puede", svc._puede_actuar(s, jefe2), False)
    check("admin (aun no) NO puede", svc._puede_actuar(s, admin), False)
    check("jefe ajeno NO puede", svc._puede_actuar(s, otro), False)
    check("el solicitante NO puede", svc._puede_actuar(s, solicitante), False)

    s.historial.append({"accion": "APROBADO", "nivel": 1, "aprobador_id": 1,
                        "aprobador_nombre": "JEFE DE AREA UNO", "fecha": "", "observaciones": ""})
    s.nivel_actual = 2
    check("ya no puede el jefe 1", svc._puede_actuar(s, jefe1), False)
    check("ahora si el jefe 2", svc._puede_actuar(s, jefe2), True)

    s.historial.append({"accion": "APROBADO", "nivel": 2, "aprobador_id": 3,
                        "aprobador_nombre": "JEFE DEPARTAMENTO", "fecha": "", "observaciones": ""})
    s.nivel_actual = 4
    check("finalmente el admin", svc._puede_actuar(s, admin), True)

    print("\n=== plazo: validar antes del dia del turno ===")
    hoy = _lima_hoy()
    manana = hoy + timedelta(days=1)
    ayer = hoy - timedelta(days=1)

    s_ok = sol([manana.day], cadena, mes=manana.month)
    s_ok.anio = manana.year
    check("turno manana: NO fuera de plazo", svc._fuera_de_plazo(s_ok), False)

    s_hoy = sol([hoy.day], cadena, mes=hoy.month)
    s_hoy.anio = hoy.year
    check("turno HOY: fuera de plazo", svc._fuera_de_plazo(s_hoy), True)

    s_ayer = sol([ayer.day], cadena, mes=ayer.month)
    s_ayer.anio = ayer.year
    check("turno ayer: fuera de plazo", svc._fuera_de_plazo(s_ayer), True)

    print("\n=== mes FINALIZADO ===")
    check("SEPTIEMBRE + AREA DE PRUEBA finalizado",
          await svc._mes_finalizado("Area de Prueba", 9), True)
    check("otro mes no finalizado",
          await svc._mes_finalizado("AREA DE PRUEBA", 11), False)

    print("\n=== cadena de un solo jefe que es el solicitante -> solo admin ===")
    usuarios_sin_jefes = [
        ["id_usuario", "nombre_completo", "email", "usuario", "hash", "salt", "rol", "areas_json"],
        ["2", "REQUERIDO JEFE AREA", "b@x", "2", "h", "s", "1", '["AREA DE PRUEBA"]'],
        ["9", "ADMINISTRADOR", "d@x", "9", "h", "s", "admin", "[]"],
    ]
    svc2 = SolicitudService(FakeSheets(usuarios_sin_jefes))
    c3 = await svc2._build_cadena_aprobacion(
        "AREA DE PRUEBA", excluir_user_id=2, excluir_nombre="REQUERIDO JEFE AREA"
    )
    check("unico jefe solicitante -> solo admin", [x["nivel"] for x in c3], [4])

    print("\n=== el ADMIN solicita su propio cambio (no se auto-aprueba) ===")
    c4 = await svc._build_cadena_aprobacion(
        "AREA DE PRUEBA", excluir_user_id=9, excluir_nombre="ADMINISTRADOR", incluir_admin=False
    )
    check("cadena del admin termina en jefes, sin escalon admin",
          [x["nivel"] for x in c4], [1, 1, 2])

    usuarios_solo_admin = [
        ["id_usuario", "nombre_completo", "email", "usuario", "hash", "salt", "rol", "areas_json"],
        ["9", "ADMINISTRADOR", "d@x", "9", "h", "s", "admin", "[]"],
    ]
    svc3 = SolicitudService(FakeSheets(usuarios_solo_admin))
    c5 = await svc3._build_cadena_aprobacion(
        "AREA DE PRUEBA", excluir_user_id=9, excluir_nombre="ADMINISTRADOR", incluir_admin=False
    )
    check("admin sin jefes -> cadena vacia (se rechaza al crear)", c5, [])

    print("\n=== ROL VISUALIZADOR (solo lectura, nunca aprueba) ===")
    check("_parse_roles('visualizador')", _parse_roles("visualizador"), [6])
    check("_parse_roles('6')", _parse_roles("6"), [6])
    check("_parse_roles('jefe_area,visualizador')", _parse_roles("jefe_area,visualizador"), [1, 6])

    usuarios_con_visor = [
        ["id_usuario", "nombre_completo", "email", "usuario", "hash", "salt", "rol", "areas_json"],
        ["1", "REQUERIDO JEFE AREA", "a@x", "1", "h", "s", "1", '["AREA DE PRUEBA"]'],
        ["7", "TERRAZAS DIAZ", "v@x", "7", "h", "s", "visualizador", "[]"],
        ["8", "VISOR CON AREA", "v2@x", "8", "h", "s", "6", '["AREA DE PRUEBA"]'],
        ["9", "JEFE AREA QUE TAMBIEN VISUALIZA", "v3@x", "9", "h", "s", "1,6", '["AREA DE PRUEBA"]'],
        ["10", "ADMINISTRADOR", "d@x", "10", "h", "s", "admin", "[]"],
    ]
    svc_visor = SolicitudService(FakeSheets(usuarios_con_visor))
    c6 = await svc_visor._build_cadena_aprobacion("AREA DE PRUEBA")
    ids = [x["user_id"] for x in c6]
    check("visualizador global NO entra a la cadena", 7 in ids, False)
    check("visualizador CON area asignada NO entra a la cadena", 8 in ids, False)
    check("un jefe que ademas visualiza SI entra", 9 in ids, True)
    check("la cadena mantiene su forma", [x["nivel"] for x in c6], [1, 1, 4])

    visor = U(8, "VISOR CON AREA", [6], ["AREA DE PRUEBA"])
    s_visor = sol([_lima_hoy().day + 2], c6)
    s_visor.nivel_actual = 1
    check("el visualizador NO puede aprobar ningun paso", svc_visor._puede_actuar(s_visor, visor), False)

    fallos = RESULTADOS.count(False)
    print(f"\nRESULTADO: {len(RESULTADOS) - fallos}/{len(RESULTADOS)} pruebas OK")
    return 0 if fallos == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
