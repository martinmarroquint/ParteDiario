-- ============================================
-- SCHEMA: ParteDiario / OCR Roles
-- Supabase PostgreSQL
-- ============================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. AREAS
-- ============================================
CREATE TABLE areas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  codigo TEXT UNIQUE NOT NULL,
  tipo TEXT DEFAULT 'area',
  padre_id TEXT REFERENCES areas(id),
  bloqueado BOOLEAN DEFAULT FALSE,
  mes_bloqueado INTEGER,
  anio_bloqueado INTEGER,
  eliminado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_areas_codigo ON areas(codigo);
CREATE INDEX idx_areas_tipo ON areas(tipo);

-- ============================================
-- 2. USUARIOS
-- ============================================
CREATE TABLE usuarios (
  id_usuario TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT,
  usuario TEXT UNIQUE NOT NULL,  -- DNI
  password_hash TEXT NOT NULL,
  salt TEXT,
  rol INTEGER DEFAULT 0,
  areas_json JSONB DEFAULT '[]'::jsonb,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  ultimo_acceso TIMESTAMPTZ,
  intentos_fallidos INTEGER DEFAULT 0,
  bloqueado_hasta TIMESTAMPTZ,
  activo BOOLEAN DEFAULT TRUE,
  requiere_cambio BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usuarios_usuario ON usuarios(usuario);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);

-- ============================================
-- 3. PERSONAL (directorio de empleados)
-- ============================================
CREATE TABLE personal (
  dni TEXT PRIMARY KEY,
  grado TEXT,
  nombre TEXT NOT NULL,
  area TEXT,
  es_medico BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_personal_area ON personal(area);

-- ============================================
-- 4. TURNOS (catalogo)
-- ============================================
CREATE TABLE turnos (
  id SERIAL PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL,
  horas NUMERIC(4,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. HOJAS MENSLUES (roles de turno)
-- ============================================
CREATE TABLE hojas_mensuales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mes INTEGER NOT NULL,
  anio INTEGER NOT NULL,
  area TEXT NOT NULL,
  persona_nombre TEXT NOT NULL,
  persona_grado TEXT,
  persona_dni TEXT,
  dias JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {"1": "M", "2": "T", ...}
  finalizado BOOLEAN DEFAULT FALSE,
  finalizado_por TEXT,
  finalizado_en TIMESTAMPTZ,
  creado_por TEXT,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mes, anio, persona_dni)
);

CREATE INDEX idx_hojas_mes_anio ON hojas_mensuales(mes, anio);
CREATE INDEX idx_hojas_area ON hojas_mensuales(area);
CREATE INDEX idx_hojas_dni ON hojas_mensuales(persona_dni);

-- ============================================
-- 6. CELDA_MODIFICADA (seguimiento en tiempo real)
-- ============================================
CREATE TABLE celda_modificada (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hoja TEXT NOT NULL,
  fila INTEGER NOT NULL,
  dia INTEGER NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  responsable TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  tipo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_celda_hoja ON celda_modificada(hoja);

-- ============================================
-- 7. CAMBIOS (audit log)
-- ============================================
CREATE TABLE cambios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  hora TEXT,
  responsable TEXT,
  trabajador TEXT,
  dia INTEGER,
  turno_anterior TEXT,
  turno_nuevo TEXT,
  tipo TEXT,
  area TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cambios_area ON cambios(area);
CREATE INDEX idx_cambios_fecha ON cambios(fecha);

-- ============================================
-- 8. ESTADOS (finalizacion por area/mes)
-- ============================================
CREATE TABLE estados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mes INTEGER NOT NULL,
  area TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'DISPONIBLE',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mes, area)
);

CREATE INDEX idx_estados_mes_area ON estados(mes, area);

-- ============================================
-- 9. SOLICITUDES_CAMBIOS
-- ============================================
CREATE TABLE solicitudes_cambios (
  id TEXT PRIMARY KEY,
  fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
  solicitante TEXT,
  area_solicitante TEXT,
  hoja TEXT,
  mes INTEGER,
  anio INTEGER,
  dias TEXT,
  tipo_cambio TEXT,
  motivo TEXT,
  pormenores TEXT,
  estado TEXT DEFAULT 'PENDIENTE',
  revisado_por TEXT,
  fecha_revision TIMESTAMPTZ,
  observacion_revision TEXT,
  participantes JSONB DEFAULT '[]'::jsonb,
  detalle TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_solicitudes_estado ON solicitudes_cambios(estado);
CREATE INDEX idx_solicitudes_area ON solicitudes_cambios(area_solicitante);

-- ============================================
-- 10. SOLICITUDES (sistema nuevo backend)
-- ============================================
CREATE TABLE solicitudes (
  id TEXT PRIMARY KEY,
  solicitante_id TEXT NOT NULL,
  solicitante_nombre TEXT,
  solicitante_grado TEXT,
  solicitante_dni TEXT,
  area_solicitante TEXT,
  fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
  estado TEXT DEFAULT 'PENDIENTE',
  nivel_actual INTEGER DEFAULT 1,
  tipo_cambio TEXT,
  participantes JSONB DEFAULT '[]'::jsonb,
  motivo TEXT,
  pormenores TEXT,
  hoja TEXT,
  mes INTEGER,
  anio INTEGER,
  cadena JSONB DEFAULT '[]'::jsonb,
  historial JSONB DEFAULT '[]'::jsonb,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_solicitudes_solicitante ON solicitudes(solicitante_id);
CREATE INDEX idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX idx_solicitudes_area ON solicitudes(area_solicitante);

-- ============================================
-- 11. DESCANSOS_MEDICOS
-- ============================================
CREATE TABLE descansos_medicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id TEXT,
  usuario_nombre TEXT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  codigo_cie10 TEXT,
  diagnostico TEXT,
  medico_tratante TEXT,
  registro TEXT,
  registrado_por TEXT,
  registrado_por_nombre TEXT,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_descansos_usuario ON descansos_medicos(usuario_id);
CREATE INDEX idx_descansos_fechas ON descansos_medicos(fecha_inicio, fecha_fin);

-- ============================================
-- 12. VACACIONES
-- ============================================
CREATE TABLE vacaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id TEXT,
  usuario_nombre TEXT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  tipo TEXT DEFAULT 'VACACIONES',
  registrado_por TEXT,
  registrado_por_nombre TEXT,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vacaciones_usuario ON vacaciones(usuario_id);
CREATE INDEX idx_vacaciones_fechas ON vacaciones(fecha_inicio, fecha_fin);

-- ============================================
-- 13. CONFIG (configuracion global)
-- ============================================
CREATE TABLE config (
  clave TEXT PRIMARY KEY,
  valor TEXT,
  actualizado_por TEXT,
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. MESA DE PARTES - DOCUMENTOS
-- ============================================
CREATE TABLE documentos (
  id TEXT PRIMARY KEY,
  numero TEXT NOT NULL,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  tipo_doc TEXT,
  n_doc_origen TEXT,
  fecha_doc DATE,
  procedencia TEXT,
  asunto TEXT,
  contenido TEXT,
  fuente TEXT,
  creado_por TEXT,
  estado TEXT DEFAULT 'REGISTRADO',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documentos_numero ON documentos(numero);
CREATE INDEX idx_documentos_estado ON documentos(estado);
CREATE INDEX idx_documentos_tipo ON documentos(tipo_doc);

-- ============================================
-- 15. MESA DE PARTES - MOVIMIENTOS
-- ============================================
CREATE TABLE movimientos (
  id TEXT PRIMARY KEY,
  documento_id TEXT NOT NULL REFERENCES documentos(id),
  tipo_mov TEXT NOT NULL,
  numero TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  contenido TEXT,
  area_destino TEXT,
  creado_por TEXT,
  n_doc_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movimientos_doc ON movimientos(documento_id);
CREATE INDEX idx_movimientos_tipo ON movimientos(tipo_mov);

-- ============================================
-- 16. MESA DE PARTES - DERIVACIONES
-- ============================================
CREATE TABLE derivaciones (
  id TEXT PRIMARY KEY,
  documento_id TEXT NOT NULL REFERENCES documentos(id),
  movimiento_id TEXT REFERENCES movimientos(id),
  area_destino TEXT NOT NULL,
  fecha_derivacion TIMESTAMPTZ DEFAULT NOW(),
  recibido_por TEXT,
  fecha_recepcion TIMESTAMPTZ,
  devuelto_por TEXT,
  fecha_devolucion TIMESTAMPTZ,
  estado TEXT DEFAULT 'PENDIENTE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_derivaciones_doc ON derivaciones(documento_id);
CREATE INDEX idx_derivaciones_area ON derivaciones(area_destino);
CREATE INDEX idx_derivaciones_estado ON derivaciones(estado);

-- ============================================
-- 17. MESA DE PARTES - HISTORIAL
-- ============================================
CREATE TABLE historial (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  documento_id TEXT NOT NULL REFERENCES documentos(id),
  movimiento_id TEXT,
  accion TEXT NOT NULL,
  detalles TEXT,
  realizado_por TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_historial_doc ON historial(documento_id);
CREATE INDEX idx_historial_fecha ON historial(fecha);

-- ============================================
-- 18. MESA DE PARTES - BD (catalogos)
-- ============================================
CREATE TABLE mesa_partes_bd (
  id SERIAL PRIMARY KEY,
  tipo_doc TEXT,
  tipo_mov TEXT,
  areas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_areas_updated_at
  BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_solicitudes_updated_at
  BEFORE UPDATE ON solicitudes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_solicitudes_cambios_updated_at
  BEFORE UPDATE ON solicitudes_cambios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE hojas_mensuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE celda_modificada ENABLE ROW LEVEL SECURITY;
ALTER TABLE cambios ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_cambios ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE descansos_medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE derivaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesa_partes_bd ENABLE ROW LEVEL SECURITY;

-- Service role bypass (backend uses service_role key)
CREATE POLICY "Service role full access" ON areas
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON usuarios
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON personal
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON turnos
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON hojas_mensuales
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON celda_modificada
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON cambios
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON estados
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON solicitudes_cambios
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON solicitudes
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON descansos_medicos
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON vacaciones
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON config
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON documentos
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON movimientos
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON derivaciones
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON historial
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON mesa_partes_bd
  FOR ALL USING (auth.role() = 'service_role');
