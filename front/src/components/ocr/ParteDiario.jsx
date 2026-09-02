// src/components/ocr/ParteDiario.jsx
// Visor de Parte Diario - DESCARGA PDF A4 VERTICAL + RESUMEN NUMÉRICO
// ✅ Logo HRPA en visor y PDF (base64)
// ✅ CÓDIGO de área 
// ✅ Márgenes correctos en PDF
// ✅ Tabla proporcionada sin scroll horizontal
// ✅ Sin firmas en PDF

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, Calendar, ChevronLeft, ChevronRight, Loader2, AlertTriangle, FileDown } from 'lucide-react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { COLOR_PRIMARIO, TURNO_MAP, MESES, DEFAULT_GOOGLE_CONFIG, obtenerCodigoArea, ANIOS } from './constantes';

// ============================================
// TIPOS DE GRADO PARA RESUMEN
// ============================================
const OFICIALES_ARMAS = ["CRNL SPNP", "CMDTE SPNP", "MAY SPNP", "CAP SPNP"];
const OFICIALES_SERVICIOS = ["SS PNP", "SS SPNP", "SB PNP", "SB SPNP"];
const SUBOFICIALES_ARMAS = ["ST1 PNP", "ST1 SPNP", "ST2 PNP", "ST2 SPNP", "ST3 PNP", "ST3 SPNP"];
const SUBOFICIALES_SERVICIOS = ["S1 PNP", "S1 SPNP", "S2 PNP", "S2 SPNP", "S3 PNP", "S3 SPNP"];
const ES_CIVIL = ["CIVIL", "PERSONAL CIVIL", "PC", "CAS", "EC.", "EC PC", "EMPLEADO CIVIL", "TRABAJADOR CIVIL"];

const getCategoriaGrado = (grado) => {
  if (!grado) return 'CIVIL';
  const g = grado.toUpperCase().trim();
  if (OFICIALES_ARMAS.some(o => g.includes(o))) return 'OFICIALES_ARMAS';
  if (OFICIALES_SERVICIOS.some(o => g.includes(o))) return 'OFICIALES_SERVICIOS';
  if (SUBOFICIALES_ARMAS.some(o => g.includes(o))) return 'SUBOFICIALES_ARMAS';
  if (SUBOFICIALES_SERVICIOS.some(o => g.includes(o))) return 'SUBOFICIALES_SERVICIOS';
  if (ES_CIVIL.some(c => g.includes(c))) return 'CIVIL';
  return 'CIVIL';
};

// ============================================
// ESTILOS DEL PDF - A4 VERTICAL CON MÁRGENES CORRECTOS
// ============================================
const pdfStyles = StyleSheet.create({
  page: {
    padding: 25,
    paddingTop: 20,
    fontSize: 6,
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 8,
  },
  headerLogo: {
    width: 40,
    height: 40,
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 2,
  },
  infoRow: {
    fontSize: 5.5,
    color: '#555',
    marginTop: 1,
  },
  resumenSection: {
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: '#999',
    padding: 4,
  },
  resumenTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 3,
  },
  resumenTable: { width: '100%' },
  resumenRow: { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: '#ccc' },
  resumenHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: 0.5, borderBottomColor: '#999' },
  resumenCellLabel: { width: '16%', padding: 2, fontSize: 5.5, fontWeight: 'bold', borderRightWidth: 0.3, borderRightColor: '#ccc' },
  resumenCell: { width: '14%', padding: 2, textAlign: 'center', fontSize: 5.5, borderRightWidth: 0.3, borderRightColor: '#ccc' },
  resumenCellTotal: { width: '14%', padding: 2, textAlign: 'center', fontSize: 5.5, fontWeight: 'bold', backgroundColor: '#f9fafb' },
  table: { width: '100%', borderStyle: 'solid', borderWidth: 0.3, borderColor: '#999', marginTop: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: 0.5, borderBottomColor: '#999' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.2, borderBottomColor: '#ddd' },
  cellNum: { width: '3.5%', padding: 2, textAlign: 'center', fontSize: 5.5, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellCodigo: { width: '7%', padding: 2, textAlign: 'center', fontSize: 5.5, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellGrado: { width: '11%', padding: 2, fontSize: 5.5, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellNombre: { width: '21%', padding: 2, fontSize: 5.5, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellArea: { width: '18%', padding: 2, fontSize: 5, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellTurno: { width: '13%', padding: 2, textAlign: 'center', fontSize: 5.5, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellEntrada: { width: '7%', padding: 2, textAlign: 'center', fontSize: 5.5, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellSalida: { width: '7%', padding: 2, textAlign: 'center', fontSize: 5.5, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellCelular: { width: '9.5%', padding: 2, textAlign: 'center', fontSize: 5.5 },
  headerCell: { fontWeight: 'bold', fontSize: 5.5, color: '#374151' },
  descanso: { color: '#DC2626' },
});

// ============================================
// DOCUMENTO PDF
// ============================================
const ParteDiarioPDF = ({ personal, turnos, diaSeleccionado, fechaFormateada }) => {
  const resumen = useMemo(() => {
    const categorias = { OFICIALES_ARMAS: 0, OFICIALES_SERVICIOS: 0, SUBOFICIALES_ARMAS: 0, SUBOFICIALES_SERVICIOS: 0, CIVIL: 0 };
    const descansos = { OFICIALES_ARMAS: 0, OFICIALES_SERVICIOS: 0, SUBOFICIALES_ARMAS: 0, SUBOFICIALES_SERVICIOS: 0, CIVIL: 0 };
    personal.forEach(emp => {
      const categoria = getCategoriaGrado(emp.grado);
      categorias[categoria]++;
      const nombreTurno = TURNO_MAP[turnos[emp.id]?.[diaSeleccionado]]?.nombre || '';
      if (TURNOS_DESCANSO.includes(nombreTurno)) descansos[categoria]++;
    });
    const totalEfectivos = personal.length;
    const totalDescuentos = Object.values(descansos).reduce((a, b) => a + b, 0);
    return { categorias, descansos, totalEfectivos, totalDescuentos, totalDisponibles: totalEfectivos - totalDescuentos };
  }, [personal, turnos, diaSeleccionado]);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Encabezado con logo */}
        <View style={pdfStyles.header}>
          <Image src="/images/escudo-sanidad.png" style={pdfStyles.headerLogo} />
          <Text style={pdfStyles.title}>ROL DE SERVICIO</Text>
          <Text style={pdfStyles.subtitle}>HOSPITAL REGIONAL POLICIAL AREQUIPA - {fechaFormateada}</Text>
          <View style={pdfStyles.infoRow}><Text>NUMEROS TELEFONICOS: 959 005 797 | CORREO: dirsapol.regsanarequipa@gmail.com</Text></View>
          <View style={pdfStyles.infoRow}><Text>CORREO ALTERNO: unidehumarequipa@gmail.com | DIRECCION: Av. Bolognesi 602 Cayma Arequipa</Text></View>
        </View>

        {/* Resumen numérico */}
        <View style={pdfStyles.resumenSection}>
          <Text style={pdfStyles.resumenTitle}>PERSONAL DEL HOSPITAL REGIONAL POLICIAL AREQUIPA - DÍA {diaSeleccionado}</Text>
          <View style={pdfStyles.resumenTable}>
            <View style={pdfStyles.resumenHeader}>
              <View style={pdfStyles.resumenCellLabel}><Text>PERSONAL</Text></View>
              <View style={pdfStyles.resumenCell}><Text>OFIC. ARMAS</Text></View>
              <View style={pdfStyles.resumenCell}><Text>OFIC. SERV.</Text></View>
              <View style={pdfStyles.resumenCell}><Text>SUBOF. ARMAS</Text></View>
              <View style={pdfStyles.resumenCell}><Text>SUBOF. SERV.</Text></View>
              <View style={pdfStyles.resumenCell}><Text>CIVIL</Text></View>
              <View style={pdfStyles.resumenCellTotal}><Text>TOTAL</Text></View>
            </View>
            <View style={pdfStyles.resumenRow}>
              <View style={pdfStyles.resumenCellLabel}><Text>EFECTIVOS</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.categorias.OFICIALES_ARMAS}</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.categorias.OFICIALES_SERVICIOS}</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.categorias.SUBOFICIALES_ARMAS}</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.categorias.SUBOFICIALES_SERVICIOS}</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.categorias.CIVIL}</Text></View>
              <View style={pdfStyles.resumenCellTotal}><Text>{resumen.totalEfectivos}</Text></View>
            </View>
            <View style={pdfStyles.resumenRow}>
              <View style={pdfStyles.resumenCellLabel}><Text>DESCUENTOS</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.descansos.OFICIALES_ARMAS}</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.descansos.OFICIALES_SERVICIOS}</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.descansos.SUBOFICIALES_ARMAS}</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.descansos.SUBOFICIALES_SERVICIOS}</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.descansos.CIVIL}</Text></View>
              <View style={pdfStyles.resumenCellTotal}><Text>{resumen.totalDescuentos}</Text></View>
            </View>
            <View style={pdfStyles.resumenRow}>
              <View style={pdfStyles.resumenCellLabel}><Text>DISPONIBLES</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.categorias.OFICIALES_ARMAS - resumen.descansos.OFICIALES_ARMAS}</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.categorias.OFICIALES_SERVICIOS - resumen.descansos.OFICIALES_SERVICIOS}</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.categorias.SUBOFICIALES_ARMAS - resumen.descansos.SUBOFICIALES_ARMAS}</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.categorias.SUBOFICIALES_SERVICIOS - resumen.descansos.SUBOFICIALES_SERVICIOS}</Text></View>
              <View style={pdfStyles.resumenCell}><Text>{resumen.categorias.CIVIL - resumen.descansos.CIVIL}</Text></View>
              <View style={pdfStyles.resumenCellTotal}><Text>{resumen.totalDisponibles}</Text></View>
            </View>
          </View>
        </View>

        {/* Tabla principal */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <View style={pdfStyles.cellNum}><Text style={pdfStyles.headerCell}>N°</Text></View>
            <View style={pdfStyles.cellCodigo}><Text style={pdfStyles.headerCell}>CÓDIGO</Text></View>
            <View style={pdfStyles.cellGrado}><Text style={pdfStyles.headerCell}>GRADO</Text></View>
            <View style={pdfStyles.cellNombre}><Text style={pdfStyles.headerCell}>APELLIDOS Y NOMBRES</Text></View>
            <View style={pdfStyles.cellArea}><Text style={pdfStyles.headerCell}>AREA</Text></View>
            <View style={pdfStyles.cellTurno}><Text style={pdfStyles.headerCell}>TURNO</Text></View>
            <View style={pdfStyles.cellEntrada}><Text style={pdfStyles.headerCell}>ENT.</Text></View>
            <View style={pdfStyles.cellSalida}><Text style={pdfStyles.headerCell}>SAL.</Text></View>
            <View style={pdfStyles.cellCelular}><Text style={pdfStyles.headerCell}>CELULAR</Text></View>
          </View>

          {personal.map((emp, idx) => {
            const codigoTurno = turnos[emp.id]?.[diaSeleccionado] || '';
            const nombreTurno = TURNO_MAP[codigoTurno]?.nombre || '';
            const esDescanso = TURNOS_DESCANSO.includes(nombreTurno);
            const horario = HORARIOS_TURNO[nombreTurno] || { entrada: '', salida: '' };
            const codigoArea = obtenerCodigoArea(emp.area);

            return (
              <View style={pdfStyles.tableRow} key={emp.id}>
                <View style={pdfStyles.cellNum}><Text>{idx + 1}</Text></View>
                <View style={pdfStyles.cellCodigo}><Text>{codigoArea || '-'}</Text></View>
                <View style={pdfStyles.cellGrado}><Text style={esDescanso ? pdfStyles.descanso : {}}>{emp.grado || '-'}</Text></View>
                <View style={pdfStyles.cellNombre}><Text style={esDescanso ? pdfStyles.descanso : {}}>{emp.nombre || '-'}</Text></View>
                <View style={pdfStyles.cellArea}><Text>{emp.area || '-'}</Text></View>
                <View style={pdfStyles.cellTurno}><Text style={esDescanso ? pdfStyles.descanso : {}}>{nombreTurno || '-'}</Text></View>
                <View style={pdfStyles.cellEntrada}><Text>{horario.entrada || '-'}</Text></View>
                <View style={pdfStyles.cellSalida}><Text>{horario.salida || '-'}</Text></View>
                <View style={pdfStyles.cellCelular}><Text>{emp.celular || '-'}</Text></View>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
};

// ============================================
// CONSTANTES
// ============================================
const JERARQUIA_GRADO = {
  "CRNL SPNP": 1, "CMDTE SPNP": 2, "MAY SPNP": 3, "CAP SPNP": 4,
  "SS PNP": 5, "SS SPNP": 6, "SB PNP": 7, "SB SPNP": 8,
  "ST1 PNP": 9, "ST1 SPNP": 10, "ST2 PNP": 11, "ST2 SPNP": 12,
  "ST3 PNP": 13, "ST3 SPNP": 14, "S1 PNP": 15, "S1 SPNP": 16,
  "S2 PNP": 17, "S2 SPNP": 18, "S3 PNP": 19, "S3 SPNP": 20
};

const ORDEN_AREA = {
  "DIRECTOR DEL HOSPITAL REGIONAL AREQUIPA": 1, "OFICIAL DE PERMANENCIA": 2, "SECRETARIA": 3,
  "AREA DE PLANEAMIENTO": 4, "AREA DE EDUCACION": 5, "OFICINA DE ADMINISTRACION": 6,
  "AREA DE RECURSOS HUMANOS": 7, "AREA DE LOGISTICA": 8, "AREA DE CONTABILIDAD": 9,
  "UNIDAD DE RELACIONES PUBLICAS Y ATENCION AL USUARIO": 10,
  "UNIDAD DE GESTION DE LA CALIDAD": 11, "UNIDAD DE ADMISION Y REGISTROS MEDICOS": 12,
  "AREA DE ESTADISTICA": 13, "AREA DE EPIDEMIOLOGIA": 14, "AREA DE PROGRAMAS Y ESTRATEGIAS SANITARIAS": 15,
  "UNIDAD DE TECNOLOGIA DE LA INFORMACION Y COMUNICACIONES": 16,
  "DIVISION DE MEDICINA Y ESPECIALIDADES MEDICAS": 17, "RECONOCIMIENTO MEDICO": 18,
  "OFICINA DE REFERENCIAS Y CONTRAREFERENCIAS": 19, "JUNTA MEDICA": 20,
  "DIVISION DE CIRUGIA Y ESPECIALIDADES QUIRURGICAS": 21,
  "DEPARTAMENTO DE OBSTETRICIA": 22, "DEPARTAMENTO DE GINECOLOGIA": 23,
  "DEPARTAMENTO DE MEDICINA PEDIATRICA": 24, "DIVISION DE EMERGENCIA Y AREAS CRITICAS": 25,
  "DEPARTAMENTO DE ASISTENCIA SOCIAL": 26, "DEPARTAMENTO DE DIAGNOSTICO POR IMAGENES": 27,
  "DEPARTAMENTO DE MEDICINA FISICA Y REHABILITACION": 28, "DEPARTAMENTO DE NUTRICION": 29,
  "DEPARTAMENTO DE ODONTOESTOMATOLOGIA": 30, "DEPARTAMENTO DE PATOLOGIA CLINICA": 31,
  "DEPARTAMENTO DE PSICOLOGIA": 32, "DEPARTAMENTO DE FARMACIA": 33, "DIVISION DE ENFERMERIA": 34,
  "ÁREA DE MEDICINA Y ESPECIALIDADES MÉDICAS": 35, "ÁREA DE CIRUGÍA Y ESPECIALIDADES QUIRÚRGICAS": 36,
  "ANESTESIOLOGÍA Y CENTRO QUIRÚRGICO": 37, "ÁREA MATERNO INFANTIL": 38,
  "ÁREA DE EMERGENCIA Y ÁREAS CRÍTICAS": 39, "ÁREA DE ATENCIÓN AMBULATORIA": 40,
  "UNIDAD DE TRAMITE DOCUMENTARIO": 41, "DEPARTAMENTO DE ANESTECIOLOGÍA Y CENTRO QUIRURGICO": 42
};

const TURNOS_DESCANSO = [
  "FRANCO", "VACACIONES", "DESCANSO MEDICO", "PERMISO A CUENTA DE VACACIONES",
  "REFERIDO A LIMA", "ADAPTACION A LA VIDA CIVIL", "LICENCIA DE GRAVIDEZ",
  "SOMETIDO A LEY", "EXTERNO", "RETEN"
];

const HORARIOS_TURNO = {
  "MAÑANA": { entrada: "07:30", salida: "13:30" }, "TARDE": { entrada: "13:30", salida: "19:30" },
  "12 HRS M": { entrada: "07:30", salida: "19:30" }, "12 HRS N": { entrada: "19:30", salida: "07:30" },
  "OFICIAL DE PERMANENCIA (DIURNO)": { entrada: "07:30", salida: "19:30" },
  "OFICIAL DE PERMANENCIA (NOCTURNO)": { entrada: "19:30", salida: "07:30" },
  "OFICIAL DE PERMANENCIA (MAÑANA)": { entrada: "07:30", salida: "13:30" },
  "OFICIAL DE PERMANENCIA (TARDE)": { entrada: "13:30", salida: "19:30" },
  "SERVICIO CONTINUO": { entrada: "SERV. CONTINUO", salida: "SERV. CONTINUO" },
  "SERVICIO": { entrada: "07:30", salida: "07:30" }, "RETEN": { entrada: "07:30", salida: "13:30" },
  "24 X 48": { entrada: "07:30", salida: "07:30" }, "MAÑANA - 12 HRS N": { entrada: "07:30", salida: "07:30" },
  "ADMINISTRATIVO": { entrada: "08:00", salida: "16:00" }
};

const NOMBRE_A_CODIGO = {};
Object.entries(TURNO_MAP).forEach(([codigo, data]) => { NOMBRE_A_CODIGO[data.nombre] = codigo; });

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
const ParteDiario = ({ isOpen, onClose, todasLasAreas }) => {
  const [cargando, setCargando] = useState(false);
  const [personal, setPersonal] = useState([]);
  const [turnos, setTurnos] = useState({});
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDate());
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [areaFiltro, setAreaFiltro] = useState('TODAS');
  const [error, setError] = useState(null);
  const totalDiasMes = new Date(anioSeleccionado, mesSeleccionado, 0).getDate();

  const cargarDatos = useCallback(async () => {
    const config = DEFAULT_GOOGLE_CONFIG;
    if (!config.sheetId || !config.apiKey) { setError('Falta configuración'); return; }
    setCargando(true); setError(null);
    try {
      const hoja = MESES[mesSeleccionado - 1].toUpperCase();
      const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${hoja}!A:AJ?key=${config.apiKey}`);
      if (!r.ok) throw new Error('Error al cargar datos');
      const d = await r.json(); const rows = d.values || [];
      if (rows.length < 2) { setPersonal([]); setTurnos({}); setCargando(false); return; }
      const todos = []; const tObj = {};
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i]; if (!cols || cols.length < 3) continue;
        const emp = { id: i, fila: i + 1, dni: (cols[0]||'').trim(), grado: (cols[1]||'').trim(), nombre: (cols[2]||'').trim(), area: (cols[3]||'').trim(), celular: (cols[4]||'').trim() };
        todos.push(emp);
        const te = {};
        for (let d = 0; d < totalDiasMes; d++) te[d+1] = NOMBRE_A_CODIGO[(cols[5+d]||'').trim()] || '';
        tObj[i] = te;
      }
      setPersonal(todos); setTurnos(tObj);
    } catch (e) { setError(e.message); } finally { setCargando(false); }
  }, [mesSeleccionado, totalDiasMes]);

  useEffect(() => { if (isOpen) cargarDatos(); }, [isOpen, cargarDatos]);

  const personalOrdenado = useMemo(() => {
    let f = personal;
    if (areaFiltro !== 'TODAS') f = f.filter(e => e.area === areaFiltro);
    f = f.filter(e => turnos[e.id]?.[diaSeleccionado] && TURNO_MAP[turnos[e.id]?.[diaSeleccionado]]);
    return [...f].sort((a,b) => {
      const oA=ORDEN_AREA[a.area]||999, oB=ORDEN_AREA[b.area]||999;
      if(oA!==oB) return oA-oB;
      const gA=JERARQUIA_GRADO[a.grado]||99, gB=JERARQUIA_GRADO[b.grado]||99;
      if(gA!==gB) return gA-gB;
      const nA=TURNO_MAP[turnos[a.id]?.[diaSeleccionado]]?.nombre||'', nB=TURNO_MAP[turnos[b.id]?.[diaSeleccionado]]?.nombre||'';
      return (TURNOS_DESCANSO.includes(nA)?1:0)-(TURNOS_DESCANSO.includes(nB)?1:0);
    });
  }, [personal, turnos, diaSeleccionado, areaFiltro]);

  const resumenVisor = useMemo(() => {
    const cat={OFICIALES_ARMAS:0,OFICIALES_SERVICIOS:0,SUBOFICIALES_ARMAS:0,SUBOFICIALES_SERVICIOS:0,CIVIL:0};
    const desc={OFICIALES_ARMAS:0,OFICIALES_SERVICIOS:0,SUBOFICIALES_ARMAS:0,SUBOFICIALES_SERVICIOS:0,CIVIL:0};
    personalOrdenado.forEach(e=>{
      const c=getCategoriaGrado(e.grado); cat[c]++;
      if(TURNOS_DESCANSO.includes(TURNO_MAP[turnos[e.id]?.[diaSeleccionado]]?.nombre||'')) desc[c]++;
    });
    return {cat,desc,total:personalOrdenado.length,totalDesc:Object.values(desc).reduce((a,b)=>a+b,0)};
  }, [personalOrdenado, turnos, diaSeleccionado]);

  const getHorario = (ct) => HORARIOS_TURNO[TURNO_MAP[ct]?.nombre||''] || {entrada:'',salida:''};

  const fechaFormateada = useMemo(() => {
    const f=new Date(anioSeleccionado,mesSeleccionado-1,diaSeleccionado);
    return `${String(f.getDate()).padStart(2,'0')}${MESES[f.getMonth()].substring(0,3).toUpperCase()}${String(f.getFullYear()).slice(-2)}`;
  }, [diaSeleccionado,mesSeleccionado,anioSeleccionado]);

  if (!isOpen) return null;
  const propsPDF = { personal:personalOrdenado, turnos, diaSeleccionado, fechaFormateada };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-2">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="px-5 py-3 text-white flex items-center justify-between" style={{backgroundColor:COLOR_PRIMARIO}}>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5"/>
            <div><h3 className="font-bold text-base">Parte Diario</h3><p className="text-xs text-white/70">{areaFiltro==='TODAS'?'Todas las áreas':areaFiltro}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <PDFDownloadLink document={<ParteDiarioPDF {...propsPDF}/>} fileName={`PARTE_DIARIO_${fechaFormateada}.pdf`} style={{textDecoration:'none'}}>
              {({loading})=>(<button disabled={loading} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors" title="Descargar PDF">{loading?<Loader2 className="w-5 h-5 animate-spin"/>:<FileDown className="w-5 h-5"/>}</button>)}
            </PDFDownloadLink>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg"><X className="w-5 h-5"/></button>
          </div>
        </div>

        {/* CONTROLES */}
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={()=>setDiaSeleccionado(p=>Math.max(1,p-1))} disabled={diaSeleccionado<=1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4"/></button>
            <select value={diaSeleccionado} onChange={e=>setDiaSeleccionado(parseInt(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium">{Array.from({length:totalDiasMes},(_,i)=>i+1).map(d=><option key={d} value={d}>Día {d}</option>)}</select>
            <button onClick={()=>setDiaSeleccionado(p=>Math.min(totalDiasMes,p+1))} disabled={diaSeleccionado>=totalDiasMes} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><ChevronRight className="w-4 h-4"/></button>
          </div>
          <select value={mesSeleccionado} onChange={e=>setMesSeleccionado(parseInt(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">{MESES.map((n,i)=><option key={i} value={i+1}>{n}</option>)}</select>
          <select value={anioSeleccionado} onChange={e=>setAnioSeleccionado(parseInt(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">{ANIOS.map(a=><option key={a} value={a}>{a}</option>)}</select>
          <select value={areaFiltro} onChange={e=>setAreaFiltro(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1 max-w-xs"><option value="TODAS">Todas las áreas</option>{todasLasAreas?.map(a=><option key={a} value={a}>{a}</option>)}</select>
          <span className="text-sm text-gray-500 ml-auto">{personalOrdenado.length} registros</span>
        </div>

        {/* VISOR PREVIO */}
        <div className="flex-1 overflow-auto p-4">
          {cargando ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="w-10 h-10 animate-spin" style={{color:COLOR_PRIMARIO}}/></div>
          ) : error ? (
            <div className="flex items-center justify-center h-64"><div className="text-center"><AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3"/><p className="text-red-500">{error}</p></div></div>
          ) : (
            <div>
              {/* ENCABEZADO */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <img src="/images/escudo-sanidad.png" alt="HRPA" className="w-12 h-12 object-contain" onError={e=>{e.target.style.display='none'}}/>
                </div>
                <h2 className="text-lg font-bold uppercase">ROL DE SERVICIO</h2>
                <h3 className="text-base font-bold">HOSPITAL REGIONAL POLICIAL AREQUIPA - {fechaFormateada}</h3>
                <div className="text-xs text-gray-600 mt-2">
                  <p>NUMEROS TELEFONICOS: 959 005 797</p>
                  <p>CORREO INSTITUCIONAL: dirsapol.regsanarequipa@gmail.com</p>
                  <p>CORREO ALTERNO: unidehumarequipa@gmail.com</p>
                  <p>DIRECCION: Av. Bolognesi 602 Cayma Arequipa</p>
                </div>
              </div>

              {/* RESUMEN NUMÉRICO */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4 border">
                <h4 className="text-xs font-bold text-center mb-2">PERSONAL DEL HOSPITAL REGIONAL POLICIAL AREQUIPA - DÍA {diaSeleccionado}</h4>
                <table className="w-full text-[10px]">
                  <thead><tr className="bg-white border-b"><th className="p-1 text-left">PERSONAL</th><th className="p-1">OFIC. ARMAS</th><th className="p-1">OFIC. SERV.</th><th className="p-1">SUBOF. ARMAS</th><th className="p-1">SUBOF. SERV.</th><th className="p-1">CIVIL</th><th className="p-1 font-bold bg-gray-100">TOTAL</th></tr></thead>
                  <tbody>
                    <tr><td className="p-1 font-medium">EFECTIVOS</td><td className="p-1 text-center">{resumenVisor.cat.OFICIALES_ARMAS}</td><td className="p-1 text-center">{resumenVisor.cat.OFICIALES_SERVICIOS}</td><td className="p-1 text-center">{resumenVisor.cat.SUBOFICIALES_ARMAS}</td><td className="p-1 text-center">{resumenVisor.cat.SUBOFICIALES_SERVICIOS}</td><td className="p-1 text-center">{resumenVisor.cat.CIVIL}</td><td className="p-1 text-center font-bold bg-gray-100">{resumenVisor.total}</td></tr>
                    <tr><td className="p-1 font-medium">DESCUENTOS</td><td className="p-1 text-center">{resumenVisor.desc.OFICIALES_ARMAS}</td><td className="p-1 text-center">{resumenVisor.desc.OFICIALES_SERVICIOS}</td><td className="p-1 text-center">{resumenVisor.desc.SUBOFICIALES_ARMAS}</td><td className="p-1 text-center">{resumenVisor.desc.SUBOFICIALES_SERVICIOS}</td><td className="p-1 text-center">{resumenVisor.desc.CIVIL}</td><td className="p-1 text-center font-bold bg-gray-100">{resumenVisor.totalDesc}</td></tr>
                    <tr className="bg-white font-bold border-t-2 border-gray-300"><td className="p-1">DISPONIBLES</td><td className="p-1 text-center">{resumenVisor.cat.OFICIALES_ARMAS-resumenVisor.desc.OFICIALES_ARMAS}</td><td className="p-1 text-center">{resumenVisor.cat.OFICIALES_SERVICIOS-resumenVisor.desc.OFICIALES_SERVICIOS}</td><td className="p-1 text-center">{resumenVisor.cat.SUBOFICIALES_ARMAS-resumenVisor.desc.SUBOFICIALES_ARMAS}</td><td className="p-1 text-center">{resumenVisor.cat.SUBOFICIALES_SERVICIOS-resumenVisor.desc.SUBOFICIALES_SERVICIOS}</td><td className="p-1 text-center">{resumenVisor.cat.CIVIL-resumenVisor.desc.CIVIL}</td><td className="p-1 text-center font-bold bg-gray-100">{resumenVisor.total-resumenVisor.totalDesc}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* TABLA PRINCIPAL */}
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-1 py-1.5 text-center" style={{width:'3.5%'}}>N°</th>
                    <th className="border border-gray-300 px-1 py-1.5 text-center" style={{width:'7%'}}>CÓDIGO</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left" style={{width:'11%'}}>GRADO</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left" style={{width:'21%'}}>APELLIDOS Y NOMBRES</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left" style={{width:'18%'}}>AREA</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center" style={{width:'13%'}}>TURNO</th>
                    <th className="border border-gray-300 px-1 py-1.5 text-center" style={{width:'7%'}}>ENT.</th>
                    <th className="border border-gray-300 px-1 py-1.5 text-center" style={{width:'7%'}}>SAL.</th>
                    <th className="border border-gray-300 px-1 py-1.5 text-center" style={{width:'9.5%'}}>CELULAR</th>
                  </tr>
                </thead>
                <tbody>
                  {personalOrdenado.length===0 ? (
                    <tr><td colSpan="9" className="border border-gray-300 px-4 py-8 text-center text-gray-400">No hay registros para el día {diaSeleccionado} de {MESES[mesSeleccionado-1]} de {anioSeleccionado}</td></tr>
                  ) : (
                    personalOrdenado.map((emp,idx)=>{
                      const ct=turnos[emp.id]?.[diaSeleccionado]||'', nt=TURNO_MAP[ct]?.nombre||'', h=getHorario(ct), ed=TURNOS_DESCANSO.includes(nt), cod=obtenerCodigoArea(emp.area);
                      return (
                        <tr key={emp.id} className={idx%2===0?'bg-white':'bg-gray-50/30'}>
                          <td className="border border-gray-300 px-1 py-1 text-center">{idx+1}</td>
                          <td className="border border-gray-300 px-1 py-1 text-center text-gray-500 text-[10px]">{cod||'-'}</td>
                          <td className={`border border-gray-300 px-2 py-1 font-medium ${ed?'text-red-600':''}`}>{emp.grado||'-'}</td>
                          <td className={`border border-gray-300 px-2 py-1 ${ed?'text-red-600':''}`}>{emp.nombre||'-'}</td>
                          <td className="border border-gray-300 px-2 py-1 text-[10px]">{emp.area||'-'}</td>
                          <td className={`border border-gray-300 px-2 py-1 text-center font-semibold ${ed?'text-red-600':''}`}>{nt||'-'}</td>
                          <td className="border border-gray-300 px-1 py-1 text-center">{h.entrada||'-'}</td>
                          <td className="border border-gray-300 px-1 py-1 text-center">{h.salida||'-'}</td>
                          <td className="border border-gray-300 px-1 py-1 text-center text-[10px]">{emp.celular||'-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParteDiario;