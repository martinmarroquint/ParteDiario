"""
Verification Tool: Verifica que el backup este completo y legible.
"""
import json
from pathlib import Path
import sys


def verify_backup(backup_dir: str = None):
    """Verifica un directorio de backup."""
    if backup_dir:
        base = Path(backup_dir)
    else:
        # Encontrar el backup mas reciente
        backups = Path(__file__).parent.parent / "backups"
        if not backups.exists():
            print("No se encontraron backups")
            return False
        dirs = sorted(backups.iterdir(), reverse=True)
        if not dirs:
            print("No hay directorios de backup")
            return False
        base = dirs[0]
        print(f"Usando backup mas reciente: {base.name}")

    print("=" * 60)
    print("VERIFICACION DE BACKUP")
    print("=" * 60)
    print(f"Directorio: {base}")
    print()

    # 1. Verificar archivo completo
    full_path = base / "full_backup.json"
    if not full_path.exists():
        print("ERROR: full_backup.json no existe")
        return False

    with open(full_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Timestamp: {data.get('timestamp')}")
    print(f"Spreadsheet ID: {data.get('spreadsheet_id')}")
    print(f"Total hojas: {data.get('total_sheets')}")
    print()

    # 2. Verificar cada hoja
    sheets = data.get("sheets", {})
    print("HOJAS EN BACKUP:")
    print("-" * 50)

    total_records = 0
    critical_sheets = ["USUARIOS_OCR", "Areas", "BD", "SOLICITUDES", "ESTADOS", "CELDA_MODIFICADA"]
    missing_critical = []

    for name, sheet_data in sorted(sheets.items()):
        rows = sheet_data.get("rows", 0)
        headers = sheet_data.get("headers", [])
        total_records += rows

        status = "OK" if rows > 0 else "VACIA"
        print(f"  {name:30s} {rows:>6} registros  [{status}]")

        # Verificar hojas criticas
        if name in critical_sheets and rows == 0:
            missing_critical.append(name)

    print()
    print(f"TOTAL: {total_records} registros en {len(sheets)} hojas")

    # 3. Verificar hojas faltantes
    all_expected = set(critical_sheets + [
        "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
        "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
        "CAMBIOS", "DESCANSOS_MEDICOS", "VACACIONES", "OCR",
    ])
    found = set(sheets.keys())
    missing = all_expected - found

    if missing:
        print()
        print(f"HOJAS NO ENCONTRADAS ({len(missing)}):")
        for m in sorted(missing):
            print(f"  - {m}")

    if missing_critical:
        print()
        print("ALERTA: Hojas criticas vacias o faltantes:")
        for m in missing_critical:
            print(f"  - {m}")

    # 4. Verificar archivos individuales
    print()
    individual_files = list(base.glob("*.json"))
    individual_files.remove(full_path) if full_path in individual_files else None
    print(f"Archivos individuales: {len(individual_files)}")

    # 5. Verificar legibilidad
    print()
    print("VERIFICACION DE LEGIBILIDAD:")
    errors = 0
    for sheet_name, sheet_data in sheets.items():
        try:
            headers = sheet_data.get("headers", [])
            data_rows = sheet_data.get("data", [])
            raw = sheet_data.get("raw", [])

            if not headers:
                print(f"  {sheet_name}: Sin headers")
                errors += 1
            elif len(data_rows) != len(raw) - 1:
                print(f"  {sheet_name}: Discrepancia data/raw ({len(data_rows)} vs {len(raw)-1})")
                errors += 1
        except Exception as e:
            print(f"  {sheet_name}: Error - {e}")
            errors += 1

    if errors == 0:
        print("  TODAS las hojas son legibles correctamente")

    print()
    print("=" * 60)
    if errors == 0 and not missing_critical:
        print("RESULTADO: BACKUP COMPLETO Y VALIDO")
    else:
        print(f"RESULTADO: {errors} errores, {len(missing_critical)} criticas faltantes")
    print("=" * 60)

    return errors == 0 and not missing_critical


if __name__ == "__main__":
    backup_dir = sys.argv[1] if len(sys.argv) > 1 else None
    verify_backup(backup_dir)
