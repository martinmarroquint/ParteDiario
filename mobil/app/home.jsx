// app/home.jsx
// HRPA - Panel de Turnos - VERSIÓN FINAL CON BARRA HORIZONTAL
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Dimensions, Animated, AppState,
  Modal, TextInput
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, X, Save, Shield, Lock, Eye, Printer, GitCompare, CalendarDays } from 'lucide-react-native';
import { sheetsService, mesCanonico } from '../src/services/sheets';
import { COLOR_PRIMARIO, MESES, TURNO_MAP, DEFAULT_GOOGLE_CONFIG, obtenerCodigoArea } from '../src/constants/config';

const { width } = Dimensions.get('window');
const CELL = Math.floor((width - 32 - 18) / 7);
const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const generarCodigoVerificacion = (area, mes, anio, responsable, totalPersonal, totalDias) => {
  const datos = `${area}|${mes}|${anio}|${responsable}|${totalPersonal}|${totalDias}|HRPA-PNP`;
  let hash = 0;
  for (let i = 0; i < datos.length; i++) {
    const char = datos.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hashAbs = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0');
  return `HRPA-${hashAbs}-${anio}`;
};

const escaparHTML = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const generarHTMLRol = ({ area, mes, anio, responsable, personal, turnos }) => {
  const totalDias = new Date(anio, mes, 0).getDate();
  const DIAS = Array.from({ length: totalDias }, (_, i) => i + 1);
  const turnosUsados = [...new Set(Object.values(turnos || {}).flatMap(emp => Object.values(emp).filter(c => c && TURNO_MAP[c])))].sort();
  const codigoArea = obtenerCodigoArea(area) || '';

  let filas = '';
  (personal || []).forEach((emp, i) => {
    let hrs = 0;
    const celdas = DIAS.map(d => {
      const c = turnos?.[emp.id]?.[d] || '';
      if (TURNO_MAP[c]?.horas) hrs += TURNO_MAP[c].horas;
      return `<td style="border:1px solid #d1d5db;padding:2px;text-align:center;font-size:8px">${escaparHTML(c || '')}</td>`;
    }).join('');
    filas += `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}"><td style="border:1px solid #d1d5db;padding:2px;text-align:center;font-size:8px;color:#94a3b8">${i + 1}</td><td style="border:1px solid #d1d5db;padding:2px;font-size:8px;font-weight:600">${escaparHTML(emp.grado)}</td><td style="border:1px solid #d1d5db;padding:2px;font-size:8px">${escaparHTML(emp.nombre)}</td>${celdas}<td style="border:1px solid #d1d5db;padding:2px;text-align:center;font-size:8px;font-weight:700;background:#ecfdf5">${hrs}h</td></tr>`;
  });

  const cabeceraDias = DIAS.map(d => {
    const f = new Date(anio, mes - 1, d);
    const dom = f.getDay() === 0;
    return `<th style="background:${dom ? '#064E3B' : '#188C5D'};color:#fff;padding:2px;font-size:8px;border:1px solid #d1d5db">${d}<br/><span style="font-size:6px;opacity:.8">${['D','L','M','M','J','V','S'][f.getDay()]}</span></th>`;
  }).join('');

  const leyenda = turnosUsados.length > 0
    ? `<div style="border:1px solid #D1FAE5;background:#ECFDF5;margin-top:6px;padding:4px;font-size:8px"><strong>Leyenda:</strong> ${turnosUsados.map(c => `${c}=${TURNO_MAP[c].nombre}`).join(' | ')}</div>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{margin:20px;}body{font-family:'Inter','Segoe UI',Helvetica,Arial,sans-serif;font-size:8px;color:#1e293b;}</style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #188C5D;padding-bottom:6px;margin-bottom:8px">
      <div><div style="font-size:14px;font-weight:800;color:#188C5D;text-transform:uppercase">Policia Nacional del Peru</div><div style="font-size:9px;color:#64748b">Hospital Regional Policial Arequipa</div></div>
      <div style="text-align:right;font-size:7px;color:#94a3b8"><strong>${escaparHTML(new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }))}</strong></div>
    </div>
    <h1 style="text-align:center;font-size:14px;font-weight:800;color:#188C5D;text-transform:uppercase;margin:6px 0">${escaparHTML(area)}</h1>
    <div style="display:flex;justify-content:center;gap:12px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;background:#ECFDF5;padding:4px 0;font-size:8px;margin-bottom:6px">
      <span><strong style="color:#188C5D">${MESES[mes - 1]} ${anio}</strong></span><span>Responsable: <strong>${escaparHTML(responsable)}</strong></span><span>Personal: <strong>${(personal || []).length}</strong></span><span>Dias: <strong>${DIAS.length}</strong></span><span>Codigo: <strong>${codigoArea || 'N/A'}</strong></span>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr><th style="background:#188C5D;color:#fff;padding:2px;font-size:7px;border:1px solid #d1d5db;width:3%">N&deg;</th><th style="background:#188C5D;color:#fff;padding:2px;font-size:7px;border:1px solid #d1d5db;width:9%">GRADO</th><th style="background:#188C5D;color:#fff;padding:2px;font-size:7px;border:1px solid #d1d5db;width:16%">APELLIDOS Y NOMBRES</th>${cabeceraDias}<th style="background:#188C5D;color:#fff;padding:2px;font-size:7px;border:1px solid #d1d5db;width:3%">HRS</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    ${leyenda}
    <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:4px;border-top:1px solid #e2e8f0;font-size:7px;color:#94a3b8">
      <span>Documento emitido por el sistema HRPA - Sin validez oficial</span>
      <span style="font-family:'Courier New',monospace;font-weight:700;color:#188C5D">${generarCodigoVerificacion(area, mes, anio, responsable, (personal || []).length, DIAS.length)}</span>
    </div>
  </body></html>`;
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const area = params.area || '';
  const responsable = params.responsable || 'ADMIN';
  const soloLectura = params.soloLectura === 'true';
  const esAdmin = area === 'ADMIN' || params.esAdmin === 'true';
  const pMes = parseInt(params.mes, 10);
  const pAnio = parseInt(params.anio, 10);
  const pHoja = params.hoja ? String(params.hoja) : '';

  const [personal, setPersonal] = useState([]);
  const [turnos, setTurnos] = useState({});
  const [turnosBackup, setTurnosBackup] = useState({});
  const [turnoActivo, setTurnoActivo] = useState('M');
  const [cargando, setCargando] = useState(true);
  const [semana, setSemana] = useState(0);
  const [rolHabilitado, setRolHabilitado] = useState(!soloLectura);
  const [guardando, setGuardando] = useState(false);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const autoGuardarTimeout = useRef(null);
  const personalRef = useRef([]);
  const turnosRef = useRef({});
  const turnosBackupRef = useRef({});
  const guardadosPendientesRef = useRef(new Set());
  const cargadoRef = useRef(false);
  const cargandoRef = useRef(false);

  const [hojas, setHojas] = useState([]);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [modalCambio, setModalCambio] = useState(false);
  const [modalVistaPrevia, setModalVistaPrevia] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  const [mes, setMes] = useState(() => {
    if (!Number.isNaN(pMes) && pMes >= 1 && pMes <= 12) return pMes;
    const hoja = (DEFAULT_GOOGLE_CONFIG.sheetName || 'AGOSTO').toUpperCase();
    const mapa = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 };
    return mapa[hoja] || 8;
  });
  const [anio, setAnio] = useState(!Number.isNaN(pAnio) && pAnio >= 2024 && pAnio <= 2035 ? pAnio : new Date().getFullYear());
  const [hojaSel, setHojaSel] = useState(pHoja || DEFAULT_GOOGLE_CONFIG.sheetName || 'AGOSTO');

  useEffect(() => {
    (async () => {
      try { setHojas(await sheetsService.obtenerHojas()); } catch (e) {}
      if (!Number.isNaN(pMes)) return;
      const mapa = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 };
      try {
        const mesActivo = await sheetsService.obtenerMesActivo();
        const m = mapa[mesActivo.toUpperCase()];
        if (m) { setMes(m); setHojaSel(mesActivo); }
      } catch (e) {}
    })();
  }, []);

  const totalDias = useMemo(() => { try { return new Date(anio, mes, 0).getDate(); } catch(e) { return 31; } }, [mes, anio]);
  const fechaBase = useMemo(() => new Date(anio, mes - 1, 1), [anio, mes]);
  const totalSemanas = useMemo(() => Math.ceil((totalDias + fechaBase.getDay()) / 7), [totalDias, fechaBase]);

  const diasSemana = useMemo(() => {
    const dias = []; const inicio = new Date(fechaBase);
    inicio.setDate(inicio.getDate() + semana * 7);
    const mesActual = fechaBase.getMonth();
    for (let i = 0; i < 7; i++) {
      const f = new Date(inicio); f.setDate(f.getDate() + i);
      if (f.getMonth() !== mesActual) continue;
      dias.push({ fecha: `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}-${String(f.getDate()).padStart(2,'0')}`, dia: f.getDate() });
    }
    return dias;
  }, [fechaBase, semana]);

  useEffect(() => { Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, []);
  useEffect(() => {
    cargadoRef.current = false;
    cargandoRef.current = false;
    if (hojaSel) cargarDatos(hojaSel, mes, anio);
  }, [hojaSel, mes, anio]);

  const cargarDatos = async (hoja = hojaSel, m = mes, a = anio) => {
    if (cargadoRef.current || cargandoRef.current) return;
    cargandoRef.current = true;
    setCargando(true);
    try {
      const data = await sheetsService.cargarPersonal(hoja, m, a);
      if (!data || data.length === 0) { setPersonal([]); setTurnos({}); personalRef.current = []; turnosRef.current = {}; return; }
      const verTodas = esAdmin && (!area || area === 'ADMIN');
      const filt = verTodas ? data : data.filter(p => p.area === area);
      const t = {}; filt.forEach(e => { t[e.id] = {}; e.turnos.forEach((x, i) => { t[e.id][i+1] = x || ''; }); });
      setPersonal(filt); setTurnos(t); setTurnosBackup(JSON.parse(JSON.stringify(t)));
      personalRef.current = filt;
      turnosRef.current = JSON.parse(JSON.stringify(t));
      turnosBackupRef.current = JSON.parse(JSON.stringify(t));
      cargadoRef.current = true;
      if (!esAdmin && !soloLectura) { try { const bloq = await sheetsService.verificarBloqueo(area, hoja); setRolHabilitado(!bloq); } catch (e) {} }
    } catch (e) { if (personalRef.current.length === 0) Alert.alert('Aviso', 'No se pudieron cargar los datos.'); }
    finally { setCargando(false); cargandoRef.current = false; }
  };

  const handleTurno = useCallback((empId, fechaStr) => {
    if (!rolHabilitado || soloLectura) return;
    const dia = parseInt(fechaStr.split('-')[2]);
    setTurnos(prev => { const actual = prev[empId]?.[dia] || ''; const nuevo = actual === turnoActivo ? '' : turnoActivo; if (actual === nuevo) return prev; const next = { ...prev, [empId]: { ...prev[empId], [dia]: nuevo } }; turnosRef.current = next; return next; });
    if (autoGuardarTimeout.current) clearTimeout(autoGuardarTimeout.current);
    autoGuardarTimeout.current = setTimeout(() => autoGuardar(), 2000);
  }, [rolHabilitado, soloLectura, turnoActivo]);

  const autoGuardar = useCallback(async () => {
    if (!rolHabilitado || guardando || personalRef.current.length === 0) return;
    const personalActual = personalRef.current;
    const turnosActual = turnosRef.current;
    const backupActual = turnosBackupRef.current;
    try {
      const filas = personalActual.map(emp => {
        const antes = backupActual[emp.id] || {};
        const ahora = turnosActual[emp.id] || {};
        let tieneCambios = false;
        for (let d = 1; d <= totalDias; d++) {
          if ((antes[d] || '') !== (ahora[d] || '')) { tieneCambios = true; break; }
        }
        if (!tieneCambios) return null;
        return { fila: emp.fila, valores: Array.from({ length: totalDias }, (_, i) => { const c = turnosActual[emp.id]?.[i+1]; return c ? (TURNO_MAP[c]?.nombre || '') : ''; }) };
      }).filter(Boolean);
      if (filas.length === 0) return;
      await sheetsService.guardarLote(hojaSel, area, responsable, filas);
      turnosBackupRef.current = JSON.parse(JSON.stringify(turnosActual));
      setTurnosBackup(JSON.parse(JSON.stringify(turnosActual)));
    } catch (e) {}
  }, [rolHabilitado, guardando, totalDias, area, responsable, hojaSel]);

  useEffect(() => { if (!rolHabilitado) return; const intervalo = setInterval(() => autoGuardar(), 45000); return () => clearInterval(intervalo); }, [rolHabilitado, autoGuardar]);
  useEffect(() => { const sub = AppState.addEventListener('change', state => { if (state === 'background' || state === 'inactive') autoGuardar(); }); return () => sub.remove(); }, [autoGuardar]);

  const handleGuardar = async () => {
    if (personalRef.current.length === 0) { Alert.alert('Aviso', 'No hay personal para guardar'); return; }
    setGuardando(true);
    try {
      const turnosActual = turnosRef.current;
      const filas = personalRef.current.map(emp => ({ fila: emp.fila, valores: Array.from({ length: totalDias }, (_, i) => { const c = turnosActual[emp.id]?.[i+1]; return c ? (TURNO_MAP[c]?.nombre || '') : ''; }) }));
      await sheetsService.guardarLote(hojaSel, area, responsable, filas);
      turnosBackupRef.current = JSON.parse(JSON.stringify(turnosActual));
      setTurnosBackup(JSON.parse(JSON.stringify(turnosActual)));
      if (!esAdmin) { await sheetsService.marcarFinalizado(area, mesCanonico(hojaSel)); setRolHabilitado(false); }
      Alert.alert('Éxito', 'Guardado correctamente');
    } catch (e) { Alert.alert('Error', 'No se pudo guardar.'); }
    finally { setGuardando(false); }
  };

  const getTurno = (empId, fechaStr) => { const dia = parseInt(fechaStr.split('-')[2]); return turnos[empId]?.[dia] || ''; };
  const getHorasSemana = (empId) => { let h = 0; diasSemana.forEach(d => { const c = getTurno(empId, d.fecha); if (TURNO_MAP[c]?.horas) h += TURNO_MAP[c].horas; }); return h; };

  if (cargando && personal.length === 0) return <View style={s.center}><ActivityIndicator size="large" color={COLOR_PRIMARIO} /><Text style={s.loadingText}>Cargando rol...</Text></View>;

  const imprimirRol = async () => {
    if (imprimiendo) return;
    setImprimiendo(true);
    try {
      const Print = require('expo-print');
      if (!Print?.printAsync) throw new Error('print-not-available');
      const html = generarHTMLRol({ area, mes, anio, responsable, personal, turnos });
      await Print.printAsync({ html, width: 1123, height: 794, orientation: 'landscape' });
      return true;
    } catch (e) {
      Alert.alert('No se pudo imprimir', 'La impresión no está disponible en este dispositivo. Use el visor para ver el detalle.');
      return false;
    } finally {
      setImprimiendo(false);
    }
  };

  const guardarCambioAdmin = async (emp, dia, codigo, motivo) => {
    if (esAdmin && emp && dia && codigo) {
      try {
        await sheetsService.guardarCelda(hojaSel, emp.fila, dia, codigo, { responsable: responsable || 'ADMIN', area, origen: 'modalCambioTurno', motivo: motivo || '' });
        setTurnos(prev => { const copia = JSON.parse(JSON.stringify(prev)); copia[emp.id] = copia[emp.id] || {}; copia[emp.id][dia] = codigo; return copia; });
        setTurnosBackup(prev => { const copia = JSON.parse(JSON.stringify(prev)); copia[emp.id] = copia[emp.id] || {}; copia[emp.id][dia] = codigo; return copia; });
      } catch (e) {}
    }
    setModalCambio(false);
  };

  const turnosRapidos = Object.keys(TURNO_MAP);

  return (
    <View style={s.container}>
      <Animated.View style={[s.inner, { opacity: fadeAnim }]}>
        <View style={[s.header, { paddingTop: (insets.top || 20) + 14 }]}>
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => router.back()}><X size={22} color="#FFF" /></TouchableOpacity>
            <View style={{flex:1, marginLeft:10}}><Text style={s.hTitle} numberOfLines={1}>{area}</Text><Text style={s.hSub}>{responsable} · {hojaSel}</Text></View>
            {esAdmin && <View style={s.badge}><Shield size={12} color="#FFF" /><Text style={s.badgeText}>Admin</Text></View>}
            {soloLectura && <View style={s.badge}><Text style={s.badgeText}>Consulta</Text></View>}
            {!rolHabilitado && !soloLectura && <View style={s.badgeLocked}><Lock size={12} color="#FFF" /><Text style={s.badgeText}>Cerrado</Text></View>}
          </View>
          <Text style={s.hCount}>{personal.length} personal · {totalDias} días</Text>
          <View style={s.selectorRow}>
            <TouchableOpacity style={s.selectorBtn} onPress={() => setSelectorAbierto(o => !o)} activeOpacity={0.8}>
              <CalendarDays size={14} color="#FFF" />
              <Text style={s.selectorBtnText}>{selectorAbierto ? 'Ocultar' : 'Cambiar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.selectorBtn} onPress={imprimirRol} activeOpacity={0.8}>
              {imprimiendo ? <ActivityIndicator size="small" color="#FFF" /> : <><Printer size={14} color="#FFF" /><Text style={s.selectorBtnText}>PDF</Text></>}
            </TouchableOpacity>
            {esAdmin && <TouchableOpacity style={s.selectorBtn} onPress={() => setModalCambio(true)} activeOpacity={0.8}>
              <GitCompare size={14} color="#FFF" /><Text style={s.selectorBtnText}>Cambio</Text>
            </TouchableOpacity>}
            {area && <TouchableOpacity style={s.selectorBtn} onPress={() => router.push('/consulta')} activeOpacity={0.8}>
              <Eye size={14} color="#FFF" /><Text style={s.selectorBtnText}>Ver</Text>
            </TouchableOpacity>}
          </View>
          {selectorAbierto && (
            <View style={s.selectorPanel}>
              <Text style={s.selectorLabel}>Hoja activa</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                {hojas.length > 0 && hojas.map(h => {
                  const activa = h === hojaSel;
                  return (
                    <TouchableOpacity key={h} onPress={() => { const up = String(h).toUpperCase(); const mapa = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 }; let m = mes; for (const k of Object.keys(mapa)) { if (up.includes(k)) { m = mapa[k]; break; } } const ym = up.match(/(20\d{2})/); const a = ym ? parseInt(ym[1], 10) : anio; setMes(m); setAnio(a); setHojaSel(h); setSelectorAbierto(false); }} style={[s.hojaChip, activa && s.hojaChipActive]}>
                      <Text style={[s.hojaChipText, activa && s.hojaChipTextActive]}>{h}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={s.nav}>
          <TouchableOpacity onPress={() => setSemana(s => Math.max(0, s-1))} disabled={semana===0}><ChevronLeft size={22} color={semana===0?'#D1D5DB':'#6B7280'} /></TouchableOpacity>
          <Text style={s.navText}>Semana {semana+1} de {totalSemanas}</Text>
          <TouchableOpacity onPress={() => setSemana(s => Math.min(totalSemanas-1, s+1))} disabled={semana>=totalSemanas-1}><ChevronRight size={22} color={semana>=totalSemanas-1?'#D1D5DB':'#6B7280'} /></TouchableOpacity>
        </View>

        {personal.length === 0 ? <View style={s.empty}><Text style={s.emptyText}>No hay personal en esta área</Text></View> : (
          <FlatList data={personal} keyExtractor={item => item.id.toString()} contentContainerStyle={{padding:12, gap:8}}
            renderItem={({ item: emp }) => {
              const horasSemana = getHorasSemana(emp.id);
              const sinTurnos = !diasSemana.some(d => getTurno(emp.id, d.fecha));
              return (
                <View style={s.card}>
                  <View style={s.cardHeader}><View style={{flex:1}}><Text style={s.cardGrado}>{emp.grado}</Text><Text style={s.cardNombre}>{emp.nombre}</Text>{emp.dni && <Text style={s.cardDni}>DNI: {emp.dni}</Text>}</View><View style={{alignItems:'flex-end'}}><Text style={s.cardHoras}>{horasSemana}h</Text><Text style={s.cardHorasLabel}>semana</Text></View></View>
                  <View style={s.gridContainer}>
                    <View style={s.gridHeader}>{DIAS.map((d, i) => <View key={i} style={s.gridHeaderCell}><Text style={[s.gridHeaderText, (i===0||i===6)&&{color:'#EF4444'}]}>{d}</Text></View>)}</View>
                    <View style={s.gridRow}>
                      {diasSemana.map(d => { const codigo = getTurno(emp.id, d.fecha); const turno = TURNO_MAP[codigo]; return (
                        <TouchableOpacity key={d.fecha} onPress={() => handleTurno(emp.id, d.fecha)} disabled={!rolHabilitado || soloLectura} style={s.gridCell} activeOpacity={0.7}>
                          <View style={[s.gridDay, turno ? {backgroundColor: turno.color} : {backgroundColor:'#F1F5F9'}]}><Text style={[s.gridDayNum, turno ? {color: turno.texto} : {color:'#94A3B8'}]}>{d.dia}</Text><Text style={[s.gridDayTurno, turno ? {color: turno.texto} : {color:'#CBD5E1'}]} numberOfLines={1}>{codigo||'·'}</Text></View>
                        </TouchableOpacity>
                      );})}
                      {Array.from({length: 7 - diasSemana.length}).map((_, i) => <View key={`e-${i}`} style={s.gridCell} />)}
                    </View>
                  </View>
                  {sinTurnos && rolHabilitado && <View style={s.alerta}><Text style={s.alertaText}>Sin turnos esta semana</Text></View>}
                </View>
              );
            }}
          />
        )}
      </Animated.View>

      {rolHabilitado && !soloLectura && (
        <View style={[s.barra, { paddingBottom: (insets.bottom || 8) + 12 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.turnosScroll}>
            {turnosRapidos.map(c => {
              const t = TURNO_MAP[c]; if (!t) return null;
              const activo = turnoActivo === c;
              return (
                <TouchableOpacity key={c} onPress={() => setTurnoActivo(c)} style={[s.turnoBtn, {backgroundColor: t.color}, activo && s.turnoBtnActive]}>
                  <Text style={[s.turnoBtnText, {color: t.texto}]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={s.saveBtn} onPress={handleGuardar} disabled={guardando}>
            {guardando ? <ActivityIndicator size="small" color="#FFF" /> : <><Save size={18} color="#FFF" /><Text style={s.saveText}>{esAdmin ? 'Guardar' : 'Finalizar'}</Text></>}
          </TouchableOpacity>
        </View>
      )}

      {modalCambio && <ModalCambioTurno visible={modalCambio} personal={personal} turnos={turnos} totalDias={totalDias} MES={MESES[mes-1]} ANIO={anio} onCerrar={() => setModalCambio(false)} onGuardar={guardarCambioAdmin} />}
    </View>
  );
}

const ModalCambioTurno = ({ visible, personal, turnos, totalDias, MES, ANIO, onCerrar, onGuardar }) => {
  const [emp, setEmp] = useState(null);
  const [dia, setDia] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [motivo, setMotivo] = useState('');

  const reset = () => { setEmp(null); setDia(null); setCodigo(''); setMotivo(''); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <View style={s.modalOverlay}>
        <View style={s.modalBox}>
          <View style={s.modalHeader}><Text style={s.modalTitle}>Cambio de Turno (Admin)</Text><TouchableOpacity onPress={() => { reset(); onCerrar(); }}><X size={20} color="#FFF" /></TouchableOpacity></View>
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={s.modalLabel}>{MES} {ANIO} · {personal.length} trabajadores</Text>

            {!emp && <FlatList data={personal} keyExtractor={it => it.id.toString()} renderItem={({ item }) => (
              <TouchableOpacity style={s.personaRow} onPress={() => setEmp(item)}>
                <View style={s.personaChip}><Text style={s.personaChipText}>{item.grado}</Text></View>
                <View style={{ flex: 1 }}><Text style={s.personaNombre}>{item.nombre}</Text><Text style={s.personaSub}>{item.dni}</Text></View>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>
            )} />}

            {emp && !dia && (
              <>
                <View style={s.empSel}><Text style={s.empSelName}>{emp.grado} {emp.nombre}</Text></View>
                <Text style={s.modalLabel}>Seleccione el día a cambiar</Text>
                <View style={s.diasWrap}>{Array.from({ length: totalDias }, (_, i) => i + 1).map(d => {
                  const actual = turnos[emp.id]?.[d] || '';
                  const t = TURNO_MAP[actual];
                  return (
                    <TouchableOpacity key={d} style={[s.diaBox, t && { backgroundColor: t.color }]} onPress={() => setDia(d)}>
                      <Text style={[s.diaNum, t && { color: t.texto }]}>{d}</Text>
                      <Text style={[s.diaTurno, t ? { color: t.texto } : { color: '#CBD5E1' }]} numberOfLines={1}>{actual || '·'}</Text>
                    </TouchableOpacity>
                  );
                })}</View>
              </>
            )}

            {emp && dia && (
              <>
                <View style={s.empSel}><Text style={s.empSelName}>{emp.grado} {emp.nombre}</Text><Text style={s.empSelSub}>Día {dia} · Actual: {turnos[emp.id]?.[dia] || 'Sin turno'}</Text></View>
                <Text style={s.modalLabel}>Nuevo turno</Text>
                <View style={s.turnosWrap}>{Object.keys(TURNO_MAP).map(c => {
                  const t = TURNO_MAP[c]; if (!t) return null;
                  const activo = codigo === c;
                  return (
                    <TouchableOpacity key={c} onPress={() => setCodigo(c)} style={[s.turnoBox, { backgroundColor: t.color }, activo && s.turnoBoxActive]}>
                      <Text style={[s.turnoBoxText, { color: t.texto }]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}</View>
                <Text style={s.modalLabel}>Motivo (opcional)</Text>
                <TextInput style={s.motivoInput} value={motivo} onChangeText={setMotivo} placeholder="Ej: Cobertura por descanso médico" placeholderTextColor="#94A3B8" />
                <TouchableOpacity style={[s.guardarCambio, !codigo && { opacity: 0.5 }]} disabled={!codigo} onPress={() => { onGuardar(emp, dia, codigo, motivo); reset(); }}>
                  <Text style={s.guardarCambioText}>Guardar cambio</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  container: {flex:1, backgroundColor:'#F8FAFC'},
  inner: {flex:1},
  center: {flex:1, justifyContent:'center', alignItems:'center'},
  loadingText: {fontSize:16, color:'#64748B', fontWeight:'600', marginTop:12},
  empty: {flex:1, justifyContent:'center', alignItems:'center'},
  emptyText: {fontSize:14, color:'#94A3B8'},
  header: {backgroundColor:COLOR_PRIMARIO, paddingBottom:14, paddingHorizontal:14},
  headerRow: {flexDirection:'row', alignItems:'center'},
  hTitle: {fontSize:17, fontWeight:'800', color:'#FFF'},
  hSub: {fontSize:11, color:'rgba(255,255,255,0.7)', marginTop:2},
  hCount: {fontSize:10, color:'rgba(255,255,255,0.5)', marginTop:8},
  badge: {flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.2)', paddingHorizontal:8, paddingVertical:4, borderRadius:20, gap:4},
  badgeLocked: {flexDirection:'row', alignItems:'center', backgroundColor:'rgba(239,68,68,0.4)', paddingHorizontal:8, paddingVertical:4, borderRadius:20, gap:4},
  badgeText: {fontSize:10, color:'#FFF', fontWeight:'600'},
  nav: {flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:10, backgroundColor:'#FFF', borderBottomWidth:1, borderBottomColor:'#F1F5F9'},
  navText: {fontSize:13, fontWeight:'600', color:'#374151'},
  card: {backgroundColor:'#FFF', borderRadius:16, borderWidth:1, borderColor:'#F1F5F9', overflow:'hidden'},
  cardHeader: {flexDirection:'row', alignItems:'center', padding:12, borderBottomWidth:1, borderBottomColor:'#F8FAFC'},
  cardGrado: {fontSize:10, fontWeight:'700', color:'#64748B', textTransform:'uppercase'},
  cardNombre: {fontSize:13, fontWeight:'700', color:'#1E293B', marginTop:1},
  cardDni: {fontSize:10, color:'#94A3B8', marginTop:2},
  cardHoras: {fontSize:18, fontWeight:'800', color:COLOR_PRIMARIO},
  cardHorasLabel: {fontSize:9, color:'#94A3B8'},
  gridContainer: {padding:8},
  gridHeader: {flexDirection:'row', marginBottom:4},
  gridHeaderCell: {width:CELL, alignItems:'center'},
  gridHeaderText: {fontSize:10, fontWeight:'700', color:'#9CA3AF'},
  gridRow: {flexDirection:'row'},
  gridCell: {width:CELL, alignItems:'center', paddingVertical:2},
  gridDay: {width:CELL-4, borderRadius:8, alignItems:'center', justifyContent:'center', paddingVertical:8},
  gridDayNum: {fontSize:12, fontWeight:'600'},
  gridDayTurno: {fontSize:9, fontWeight:'700', marginTop:2, textAlign:'center'},
  alerta: {backgroundColor:'#FEF3C7', padding:8, alignItems:'center'},
  alertaText: {fontSize:10, color:'#D97706', fontWeight:'600'},
  barra: {backgroundColor:'#FFF', borderTopWidth:1, borderTopColor:'#E2E8F0', padding:8},
  turnosScroll: {paddingHorizontal:4, paddingVertical:4, gap:5},
  turnoBtn: {width:38, height:38, borderRadius:10, alignItems:'center', justifyContent:'center'},
  turnoBtnActive: {borderWidth:2.5, borderColor:'#FFF', transform:[{scale:1.15}], shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.1, shadowRadius:2, elevation:3},
  turnoBtnText: {fontSize:11, fontWeight:'800'},
  saveBtn: {flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:COLOR_PRIMARIO, height:46, borderRadius:14, marginTop:6, gap:8},
  saveText: {color:'#FFF', fontSize:15, fontWeight:'700'},

  selectorRow: {flexDirection:'row', alignItems:'center', gap:6, marginTop:8, flexWrap:'wrap'},
  selectorBtn: {flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.2)', paddingHorizontal:10, paddingVertical:6, borderRadius:20, gap:4},
  selectorBtnText: {fontSize:10, color:'#FFF', fontWeight:'600'},
  selectorPanel: {backgroundColor:'rgba(255,255,255,0.08)', borderRadius:14, marginTop:10, padding:12, gap:8},
  selectorLabel: {fontSize:10, color:'rgba(255,255,255,0.7)', fontWeight:'700', textTransform:'uppercase', letterSpacing:1},
  hojaChip: {backgroundColor:'rgba(255,255,255,0.15)', paddingHorizontal:12, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:'rgba(255,255,255,0.25)'},
  hojaChipActive: {backgroundColor:'#FFF', borderColor:'#FFF'},
  hojaChipText: {fontSize:11, color:'rgba(255,255,255,0.9)', fontWeight:'600'},
  hojaChipTextActive: {color:COLOR_PRIMARIO, fontWeight:'800'},
  selectorMesRow: {flexDirection:'row', alignItems:'center', gap:10},
  mesBtn: {backgroundColor:'rgba(255,255,255,0.2)', width:34, height:34, borderRadius:10, alignItems:'center', justifyContent:'center'},
  mesText: {fontSize:13, fontWeight:'700', color:'#FFF', textAlign:'center'},
  mesSub: {fontSize:10, color:'rgba(255,255,255,0.6)', textAlign:'center'},

  modalOverlay: {flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end'},
  modalBox: {backgroundColor:'#FFF', borderTopLeftRadius:22, borderTopRightRadius:22, maxHeight:'90%', paddingBottom:20},
  modalHeader: {flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:'#F1F5F9'},
  modalTitle: {fontSize:15, fontWeight:'800', color:'#1E293B'},
  modalLabel: {fontSize:11, color:'#64748B', fontWeight:'700', textTransform:'uppercase', letterSpacing:1, marginTop:14, marginBottom:6},
  personaRow: {flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'#F8FAFC', borderRadius:12, padding:10, marginBottom:6, borderWidth:1, borderColor:'#F1F5F9'},
  personaChip: {backgroundColor:'#E2E8F0', borderRadius:8, paddingHorizontal:8, paddingVertical:4},
  personaChipText: {fontSize:9, fontWeight:'700', color:'#334155'},
  personaNombre: {fontSize:13, fontWeight:'700', color:'#1E293B'},
  personaSub: {fontSize:11, color:'#94A3B8'},
  empSel: {backgroundColor:'#ECFDF5', borderRadius:12, padding:10, flexDirection:'row', alignItems:'center', justifyContent:'space-between'},
  empSelName: {fontSize:14, fontWeight:'700', color:'#065F46'},
  empSelSub: {fontSize:11, color:'#64748B', marginTop:2},
  diasWrap: {flexDirection:'row', flexWrap:'wrap', gap:6},
  diaBox: {width:'13%', aspectRatio:1, borderRadius:8, alignItems:'center', justifyContent:'center', backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0'},
  diaNum: {fontSize:11, fontWeight:'700', color:'#334155'},
  diaTurno: {fontSize:7, fontWeight:'700', marginTop:1},
  turnosWrap: {flexDirection:'row', flexWrap:'wrap', gap:6},
  turnoBox: {minWidth:52, height:44, borderRadius:10, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#E5E7EB', paddingHorizontal:6},
  turnoBoxActive: {borderWidth:3, borderColor:'#1E293B'},
  turnoBoxText: {fontSize:12, fontWeight:'800'},
  motivoInput: {backgroundColor:'#F8FAFC', borderRadius:12, borderWidth:1, borderColor:'#E2E8F0', paddingHorizontal:12, paddingVertical:10, fontSize:13, color:'#334155'},
  guardarCambio: {backgroundColor:COLOR_PRIMARIO, borderRadius:14, height:50, alignItems:'center', justifyContent:'center', marginTop:16},
  guardarCambioText: {color:'#FFF', fontSize:15, fontWeight:'700'},
});