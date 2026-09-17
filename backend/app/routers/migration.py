"""
Endpoint de migracion: Google Sheets → Supabase
Solo para uso del administrador durante la transicion.
"""
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import require_admin
from app.config import settings

router = APIRouter(prefix="/migration", tags=["Migration"])


@router.post("/run")
async def run_migration(usuario=Depends(require_admin)):
    """
    Ejecuta la migracion completa de Google Sheets a Supabase.
    Solo accessible por admins (rol 4+).
    """
    if not settings.USE_SUPABASE:
        raise HTTPException(400, "USE_SUPABASE no esta habilitado en el servidor")

    try:
        from app.services.supabase_migrate import run_full_migration
        results = await run_full_migration()
        return {
            "message": "Migracion completada",
            "results": results,
        }
    except ImportError:
        raise HTTPException(500, "supabase no instalado en el servidor")
    except Exception as e:
        raise HTTPException(500, f"Error en migracion: {str(e)}")


@router.post("/test-connection")
async def test_supabase(usuario=Depends(require_admin)):
    """Prueba la conexion a Supabase."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise HTTPException(400, "SUPABASE_URL y SUPABASE_SERVICE_KEY no configurados")

    try:
        from supabase import create_client
        sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        # Test: count usuarios
        resp = sb.table("usuarios").select("id_usuario", count="exact").execute()
        return {
            "status": "connected",
            "usuarios_count": len(resp.data),
            "url": settings.SUPABASE_URL[:30] + "...",
        }
    except ImportError:
        raise HTTPException(500, "pip install supabase")
    except Exception as e:
        raise HTTPException(500, f"Error de conexion: {str(e)}")
