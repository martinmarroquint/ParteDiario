// app/parte.jsx
// HRPA - Parte Diario: visor por dia + resumen numerico + PDF (expo-print)
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, ChevronLeft, ChevronRight, FileDown, Loader2, Calendar } from 'lucide-react-native';
import { sheetsService } from '../src/services/sheets';
import {
  COLOR_PRIMARIO, MESES, TURNO_MAP, MESES_SHEET,
  obtenerCodigoArea, TURNOS_DESCANSO, HORARIOS_TURNO
} from '../src/constants/config';

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

const ESCAPAR_HTML = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const generarHTMLParte = (personal, turnos, dia, fechaFormateada) => {
  const resumen = { cat: { OFICIALES_ARMAS: 0, OFICIALES_SERVICIOS: 0, SUBOFICIALES_ARMAS: 0, SUBOFICIALES_SERVICIOS: 0, CIVIL: 0 }, desc: { OFICIALES_ARMAS: 0, OFICIALES_SERVICIOS: 0, SUBOFICIALES_ARMAS: 0, SUBOFICIALES_SERVICIOS: 0, CIVIL: 0 } };
  personal.forEach(e => {
    const c = getCategoriaGrado(e.grado);
    resumen.cat[c]++;
    const nt = TURNO_MAP[turnos[e.id]?.[dia]]?.nombre || '';
    if (TURNOS_DESCANSO.includes(nt)) resumen.desc[c]++;
  });
  const totalE = personal.length;
  const totalD = Object.values(resumen.desc).reduce((a, b) => a + b, 0);

  const filas = personal.map((emp, i) => {
    const ct = turnos[emp.id]?.[dia] || '';
    const nt = TURNO_MAP[ct]?.nombre || '';
    const esDesc = TURNOS_DESCANSO.includes(nt);
    const h = HORARIOS_TURNO[nt] || { entrada: '', salida: '' };
    return `<tr><td style="border:1px solid #ccc;padding:3px;text-align:center">${i + 1}</td><td style="border:1px solid #ccc;padding:3px;text-align:center">${ESCAPAR_HTML(obtenerCodigoArea(emp.area) || '-')}</td><td style="border:1px solid #ccc;padding:3px;${esDesc ? 'color:red' : ''}">${ESCAPAR_HTML(emp.grado || '-')}</td><td style="border:1px solid #ccc;padding:3px;${esDesc ? 'color:red' : ''}">${ESCAPAR_HTML(emp.nombre || '-')}</td><td style="border:1px solid #ccc;padding:3px;font-size:9px">${ESCAPAR_HTML(emp.area || '-')}</td><td style="border:1px solid #ccc;padding:3px;text-align:center;${esDesc ? 'color:red' : ''}">${ESCAPAR_HTML(nt || '-')}</td><td style="border:1px solid #ccc;padding:3px;text-align:center">${ESCAPAR_HTML(h.entrada || '-')}</td><td style="border:1px solid #ccc;padding:3px;text-align:center">${ESCAPAR_HTML(h.salida || '-')}</td><td style="border:1px solid #ccc;padding:3px;text-align:center">-</td></tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{margin:30px;}body{font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#1e293b;}h1{font-size:18px;margin:0;}</style></head><body>
    <div style="text-align:center;margin-bottom:10px">
      <div style="font-size:24px;font-weight:800;letter-spacing:2px">POLICIA NACIONAL DEL PERU</div>
      <div style="font-weight:700;font-size:14px;margin-top:2px">ROL DE SERVICIO</div>
      <div style="font-weight:700;font-size:13px">HOSPITAL REGIONAL POLICIAL AREQUIPA - ${fechaFormateada}</div>
      <div style="font-size:10px;color:#555;margin-top:4px">NUMEROS TELEFONICOS: 959 005 797 | CORREO: dirsapol.regsanarequipa@gmail.com</div>
      <div style="font-size:10px;color:#555">CORREO ALTERNO: unidehumarequipa@gmail.com | DIRECCION: Av. Bolognesi 602 Cayma Arequipa</div>
    </div>
    <h3 style="text-align:center;font-size:11px;margin:6px 0">PERSONAL DEL HOSPITAL REGIONAL POLICIAL AREQUIPA - DIA ${dia}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:8px"><thead><tr style="background:#f3f4f6"><th style="border:1px solid #999;padding:3px;text-align:left">PERSONAL</th><th style="border:1px solid #999;padding:3px">OFIC. ARMAS</th><th style="border:1px solid #999;padding:3px">OFIC. SERV.</th><th style="border:1px solid #999;padding:3px">SUBOF. ARMAS</th><th style="border:1px solid #999;padding:3px">SUBOF. SERV.</th><th style="border:1px solid #999;padding:3px">CIVIL</th><th style="border:1px solid #999;padding:3px;background:#e5e7eb">TOTAL</th></tr></thead><tbody>
      <tr><td style="border:1px solid #999;padding:3px">EFECTIVOS</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.cat.OFICIALES_ARMAS}</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.cat.OFICIALES_SERVICIOS}</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.cat.SUBOFICIALES_ARMAS}</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.cat.SUBOFICIALES_SERVICIOS}</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.cat.CIVIL}</td><td style="border:1px solid #999;padding:3px;text-align:center;background:#e5e7eb;font-weight:700">${totalE}</td></tr>
      <tr><td style="border:1px solid #999;padding:3px">DESCUENTOS</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.desc.OFICIALES_ARMAS}</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.desc.OFICIALES_SERVICIOS}</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.desc.SUBOFICIALES_ARMAS}</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.desc.SUBOFICIALES_SERVICIOS}</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.desc.CIVIL}</td><td style="border:1px solid #999;padding:3px;text-align:center;background:#e5e7eb;font-weight:700">${totalD}</td></tr>
      <tr style="font-weight:700"><td style="border:1px solid #999;padding:3px">DISPONIBLES</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.cat.OFICIALES_ARMAS - resumen.desc.OFICIALES_ARMAS}</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.cat.OFICIALES_SERVICIOS - resumen.desc.OFICIALES_SERVICIOS}</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.cat.SUBOFICIALES_ARMAS - resumen.desc.SUBOFICIALES_ARMAS}</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.cat.SUBOFICIALES_SERVICIOS - resumen.desc.SUBOFICIALES_SERVICIOS}</td><td style="border:1px solid #999;padding:3px;text-align:center">${resumen.cat.CIVIL - resumen.desc.CIVIL}</td><td style="border:1px solid #999;padding:3px;text-align:center;background:#e5e7eb;font-weight:700">${totalE - totalD}</td></tr>
    </tbody></table>
    <table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:#e5e7eb"><th style="border:1px solid #999;padding:4px;width:4%">N&deg;</th><th style="border:1px solid #999;padding:4px;width:7%">CODIGO</th><th style="border:1px solid #999;padding:4px;text-align:left;width:11%">GRADO</th><th style="border:1px solid #999;padding:4px;text-align:left;width:21%">APELLIDOS Y NOMBRES</th><th style="border:1px solid #999;padding:4px;text-align:left;width:18%">AREA</th><th style="border:1px solid #999;padding:4px;width:13%">TURNO</th><th style="border:1px solid #999;padding:4px;width:7%">ENT.</th><th style="border:1px solid #999;padding:4px;width:7%">SAL.</th><th style="border:1px solid #999;padding:4px;width:9%">CELULAR</th></tr></thead><tbody>${filas}</tbody></table>
  </body></html>`;
};

export default function ParteScreen() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [personal, setPersonal] = useState([]);
  const [turnos, setTurnos] = useState({});
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [diaSel, setDiaSel] = useState(new Date().getDate());
  const [areaFiltro, setAreaFiltro] = useState('TODAS');
  const [error, setError] = useState('');
  const [imprimiendo, setImprimiendo] = useState(false);

  const hojas = MESES_SHEET;
  const totalDiasMes = new Date(anio, mes, 0).getDate();

  useEffect(() => { cargarDatos(); }, [mes, anio]);

  const cargarDatos = async () => {
    setCargando(true); setError('');
    try {
      const hojasList = await sheetsService.obtenerHojas();
      const hoja = hojasList.find(h => h.toUpperCase().includes(hojas[mes])) || MESES_SHEET[mes];
      if (!hoja) { setPersonal([]); setTurnos({}); return; }
      const data = await sheetsService.cargarPersonalConDatos(hoja, mes, anio);
      const t = {};
      data.forEach(e => { t[e.id] = {}; e.turnos.forEach((x, i) => { t[e.id][i + 1] = x || ''; }); });
      setPersonal(data); setTurnos(t);
      if (diaSel > new Date(anio, mes, 0).getDate()) setDiaSel(1);
    } catch (e) { setError('No se pudieron cargar los datos.'); }
    finally { setCargando(false); }
  };

  const areas = useMemo(() => [...new Set(personal.map(p => p.area).filter(Boolean))].sort(), [personal]);

  const personalDia = useMemo(() => {
    let f = personal;
    if (areaFiltro !== 'TODAS') f = f.filter(e => e.area === areaFiltro);
    return [...f].sort((a, b) => (a.area || '').localeCompare(b.area || 'es') || (a.grado || '').localeCompare(b.grado || 'es'));
  }, [personal, areaFiltro]);

  const resumen = useMemo(() => {
    const cat = { OFICIALES_ARMAS: 0, OFICIALES_SERVICIOS: 0, SUBOFICIALES_ARMAS: 0, SUBOFICIALES_SERVICIOS: 0, CIVIL: 0 };
    const desc = { OFICIALES_ARMAS: 0, OFICIALES_SERVICIOS: 0, SUBOFICIALES_ARMAS: 0, SUBOFICIALES_SERVICIOS: 0, CIVIL: 0 };
    personalDia.forEach(e => {
      const c = getCategoriaGrado(e.grado); cat[c]++;
      if (TURNOS_DESCANSO.includes(TURNO_MAP[turnos[e.id]?.[diaSel]]?.nombre || '')) desc[c]++;
    });
    return { cat, desc, total: personalDia.length, totalDesc: Object.values(desc).reduce((a, b) => a + b, 0) };
  }, [personalDia, turnos, diaSel]);

  const fechaFormateada = useMemo(() => {
    const f = new Date(anio, mes - 1, diaSel);
    return `${String(f.getDate()).padStart(2, '0')}${MESES[f.getMonth()].substring(0, 3).toUpperCase()}${String(f.getFullYear()).slice(-2)}`;
  }, [diaSel, mes, anio]);

  const getHorario = (ct) => HORARIOS_TURNO[TURNO_MAP[ct]?.nombre || ''] || { entrada: '', salida: '' };

  const generarPDF = async () => {
    setImprimiendo(true);
    try {
      const Print = require('expo-print');
      const html = generarHTMLParte(personalDia, turnos, diaSel, fechaFormateada);
      await Print.printAsync({ html });
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el PDF.');
    } finally { setImprimiendo(false); }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><X size={22} color="#FFF" /></TouchableOpacity>
        <Calendar size={20} color="#FFF" />
        <Text style={s.headerTitle}>Parte Diario</Text>
        <TouchableOpacity onPress={generarPDF} disabled={imprimiendo}>
          {imprimiendo ? <ActivityIndicator size="small" color="#FFF" /> : <FileDown size={20} color="#FFF" />}
        </TouchableOpacity>
      </View>

      <View style={s.controls}>
        <View style={s.diaSel}>
          <TouchableOpacity onPress={() => setDiaSel(d => Math.max(1, d - 1))} disabled={diaSel <= 1}><ChevronLeft size={20} color={diaSel <= 1 ? '#D1D5DB' : '#6B7280'} /></TouchableOpacity>
          <Text style={s.diaText}>Día {diaSel}</Text>
          <TouchableOpacity onPress={() => setDiaSel(d => Math.min(totalDiasMes, d + 1))} disabled={diaSel >= totalDiasMes}><ChevronRight size={20} color={diaSel >= totalDiasMes ? '#D1D5DB' : '#6B7280'} /></TouchableOpacity>
        </View>
        <View style={s.mesAnioRow}>
          <TouchableOpacity style={s.mesBtn} onPress={() => setMes(m => (m === 1 ? 12 : m - 1))}>
            <ChevronLeft size={16} color="#FFF" />
            <Text style={s.mesBtnText}>{MESES[mes - 1].substring(0, 3).toUpperCase()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.mesBtn} onPress={() => setAnio(a => a - 1)}>
            <ChevronLeft size={16} color="#FFF" /><Text style={s.mesBtnText}>{anio - 1}</Text>
          </TouchableOpacity>
          <Text style={s.mesActual}>{MESES[mes - 1]} {anio}</Text>
          <TouchableOpacity style={s.mesBtn} onPress={() => setAnio(a => a + 1)}>
            <Text style={s.mesBtnText}>{anio + 1}</Text><ChevronRight size={16} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={s.mesBtn} onPress={() => setMes(m => (m === 12 ? 1 : m + 1))}>
            <Text style={s.mesBtnText}>{MESES[mes].substring(0, 3).toUpperCase()}</Text>
            <ChevronRight size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
        {areas.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <TouchableOpacity style={[s.areaChip, areaFiltro === 'TODAS' && s.areaChipActive]} onPress={() => setAreaFiltro('TODAS')}><Text style={[s.areaChipText, areaFiltro === 'TODAS' && { color: '#FFF' }]}>TODAS</Text></TouchableOpacity>
            {areas.map(a => (
              <TouchableOpacity key={a} style={[s.areaChip, areaFiltro === a && s.areaChipActive]} onPress={() => setAreaFiltro(a)} activeOpacity={0.7}>
                <Text style={[s.areaChipText, areaFiltro === a && { color: '#FFF' }]} numberOfLines={1}>{a}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {cargando ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLOR_PRIMARIO} /></View>
      ) : error ? (
        <View style={s.center}><Text style={s.errorText}>{error}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false}>
          <Text style={s.rolTitle}>ROL DE SERVICIO - {fechaFormateada}</Text>
          <Text style={s.rolSub}>Hospital Regional Policial Arequipa · {MESES[mes - 1]} {anio}</Text>

          <View style={s.resumenBox}>
            <Text style={s.resumenTitle}>PERSONAL DEL HOSPITAL REGIONAL POLICIAL AREQUIPA - DÍA {diaSel}</Text>
            <View style={s.tablaRowHead}>
              <Text style={[s.tc, { flex: 1.6, textAlign: 'left' }]}>PERSONAL</Text>
              <Text style={s.tc}>OFIC. A.</Text><Text style={s.tc}>OFIC. S.</Text>
              <Text style={s.tc}>SUBOF. A.</Text><Text style={s.tc}>SUBOF. S.</Text>
              <Text style={s.tc}>CIVIL</Text><Text style={[s.tc, { flex: 0.8 }]}>TOT</Text>
            </View>
            {[
              ['EFECTIVOS', resumen.cat],
              ['DESCUENTOS', resumen.desc]
            ].map(([etiqueta, v]) => (
              <View key={etiqueta} style={s.tablaRow}>
                <Text style={[s.tc, { flex: 1.6, textAlign: 'left', fontWeight: '600' }]}>{etiqueta}</Text>
                <Text style={s.tc}>{v.OFICIALES_ARMAS}</Text><Text style={s.tc}>{v.OFICIALES_SERVICIOS}</Text>
                <Text style={s.tc}>{v.SUBOFICIALES_ARMAS}</Text><Text style={s.tc}>{v.SUBOFICIALES_SERVICIOS}</Text>
                <Text style={s.tc}>{v.CIVIL}</Text>
                <Text style={[s.tc, { flex: 0.8, fontWeight: '800' }]}>{etiqueta === 'EFECTIVOS' ? resumen.total : resumen.totalDesc}</Text>
              </View>
            ))}
            <View style={[s.tablaRow, { backgroundColor: '#F8FAFC' }]}>
              <Text style={[s.tc, { flex: 1.6, textAlign: 'left', fontWeight: '800' }]}>DISPONIBLES</Text>
              <Text style={[s.tc, { fontWeight: '700' }]}>{resumen.cat.OFICIALES_ARMAS - resumen.desc.OFICIALES_ARMAS}</Text>
              <Text style={[s.tc, { fontWeight: '700' }]}>{resumen.cat.OFICIALES_SERVICIOS - resumen.desc.OFICIALES_SERVICIOS}</Text>
              <Text style={[s.tc, { fontWeight: '700' }]}>{resumen.cat.SUBOFICIALES_ARMAS - resumen.desc.SUBOFICIALES_ARMAS}</Text>
              <Text style={[s.tc, { fontWeight: '700' }]}>{resumen.cat.SUBOFICIALES_SERVICIOS - resumen.desc.SUBOFICIALES_SERVICIOS}</Text>
              <Text style={[s.tc, { fontWeight: '700' }]}>{resumen.cat.CIVIL - resumen.desc.CIVIL}</Text>
              <Text style={[s.tc, { flex: 0.8, fontWeight: '800' }]}>{resumen.total - resumen.totalDesc}</Text>
            </View>
          </View>

          <View style={s.tablaPrincipal}>
            <View style={[s.tablaRow, s.tablaHeadRow]}>
              <Text style={[s.tp, { flex: 0.5, textAlign: 'center' }]}>N°</Text>
              <Text style={[s.tp, { flex: 0.8, textAlign: 'center' }]}>CÓD</Text>
              <Text style={[s.tp, { flex: 1.2, textAlign: 'left' }]}>GRADO</Text>
              <Text style={[s.tp, { flex: 2.4, textAlign: 'left' }]}>APELLIDOS Y NOMBRES</Text>
              <Text style={[s.tp, { flex: 2, textAlign: 'left' }]}>AREA</Text>
              <Text style={[s.tp, { flex: 1.3, textAlign: 'center' }]}>TURNO</Text>
              <Text style={[s.tp, { flex: 0.7, textAlign: 'center' }]}>ENT.</Text>
              <Text style={[s.tp, { flex: 0.7, textAlign: 'center' }]}>SAL.</Text>
              <Text style={[s.tp, { flex: 0.9, textAlign: 'center' }]}>CEL.</Text>
            </View>
            {personalDia.length === 0 ? (
              <View style={s.empty}><Text style={s.emptyText}>No hay registros para el día {diaSel}</Text></View>
            ) : personalDia.map((emp, i) => {
              const ct = turnos[emp.id]?.[diaSel] || '';
              const nt = TURNO_MAP[ct]?.nombre || '';
              const esDesc = TURNOS_DESCANSO.includes(nt);
              const h = getHorario(ct);
              return (
                <View key={emp.id} style={[s.tablaRow, i % 2 === 0 && { backgroundColor: '#F8FAFC' }]}>
                  <Text style={[s.tp, { flex: 0.5, textAlign: 'center', color: '#94A3B8' }]}>{i + 1}</Text>
                  <Text style={[s.tp, { flex: 0.8, textAlign: 'center', fontSize: 8 }]}>{obtenerCodigoArea(emp.area) || '-'}</Text>
                  <Text style={[s.tp, { flex: 1.2, textAlign: 'left', fontWeight: '600' }, esDesc && { color: '#DC2626' }]}>{emp.grado || '-'}</Text>
                  <Text style={[s.tp, { flex: 2.4, textAlign: 'left' }, esDesc && { color: '#DC2626' }]} numberOfLines={1}>{emp.nombre || '-'}</Text>
                  <Text style={[s.tp, { flex: 2, textAlign: 'left', fontSize: 8 }]} numberOfLines={1}>{emp.area || '-'}</Text>
                  <Text style={[s.tp, { flex: 1.3, textAlign: 'center', fontWeight: '600' }, esDesc && { color: '#DC2626' }]} numberOfLines={1}>{nt || '-'}</Text>
                  <Text style={[s.tp, { flex: 0.7, textAlign: 'center' }]}>{h.entrada || '-'}</Text>
                  <Text style={[s.tp, { flex: 0.7, textAlign: 'center' }]}>{h.salida || '-'}</Text>
                  <Text style={[s.tp, { flex: 0.9, textAlign: 'center', fontSize: 8 }]}>{'-'}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  errorText: { fontSize: 14, color: '#EF4444', fontWeight: '600' },

  header: { backgroundColor: COLOR_PRIMARIO, flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 50, gap: 10 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#FFF', flex: 1 },

  controls: { backgroundColor: '#FFF', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
  diaSel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  diaText: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  mesAnioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mesBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLOR_PRIMARIO, borderRadius: 10, paddingHorizontal: 10, height: 34, gap: 4 },
  mesBtnText: { fontSize: 11, color: '#FFF', fontWeight: '700' },
  mesActual: { fontSize: 14, fontWeight: '800', color: '#1F2937' },

  areaChip: { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  areaChipActive: { backgroundColor: COLOR_PRIMARIO },
  areaChipText: { fontSize: 11, color: '#64748B', fontWeight: '600', maxWidth: 160 },

  rolTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', color: '#1E293B', textTransform: 'uppercase', letterSpacing: 1 },
  rolSub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 },

  resumenBox: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 12, padding: 8 },
  resumenTitle: { fontSize: 10, fontWeight: '700', textAlign: 'center', color: '#475569', marginBottom: 6, textTransform: 'uppercase' },
  tablaRowHead: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 4 },
  tablaRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#E2E8F0', paddingVertical: 4 },
  tc: { flex: 1, textAlign: 'center', fontSize: 8, color: '#334155' },

  tablaPrincipal: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 12, overflow: 'hidden' },
  tablaHeadRow: { backgroundColor: '#E5E7EB', paddingVertical: 6 },
  tp: { fontSize: 9, color: '#334155', paddingHorizontal: 2 },
  empty: { padding: 30, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
});