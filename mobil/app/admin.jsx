// app/admin.jsx
// HRPA - Panel de Control Administrador (profesional)
// Áreas + bloqueo por mes + rol de servicio editable por celda + cambio de turno por trabajador.
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet,
  ActivityIndicator, TextInput, Alert, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Shield, Lock, Unlock, RefreshCw, ChevronLeft, ChevronRight, Clock, Save, Search, AlertTriangle } from 'lucide-react-native';
import { sheetsService, mismoMes } from '../src/services/sheets';
import { COLOR_PRIMARIO, MESES, MESES_SHEET, TURNO_MAP, DEFAULT_GOOGLE_CONFIG } from '../src/constants/config';

const MAPA_MES = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 };
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function AdminScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [areas, setAreas] = useState([]);
  const [estados, setEstados] = useState({});
  const [areaSel, setAreaSel] = useState('');
  const [mes, setMes] = useState(8);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [personal, setPersonal] = useState([]);
  const [turnos, setTurnos] = useState({});
  const [turnosBackup, setTurnosBackup] = useState({});
  const [cargandoAreas, setCargandoAreas] = useState(true);
  const [cargandoRol, setCargandoRol] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaArea, setBusquedaArea] = useState('');
  const [semana, setSemana] = useState(0);
  const [mesNombre, setMesNombre] = useState('AGOSTO');
  const [turnoActivo, setTurnoActivo] = useState('M');
  const [modalCambio, setModalCambio] = useState(null); // emp
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef(null);

  const mesNombreMemo = useMemo(() => MESES_SHEET[mes] || 'AGOSTO', [mes]);

  useEffect(() => { setMesNombre(mesNombreMemo); }, [mesNombreMemo]);

  useEffect(() => {
    (async () => {
      try {
        const m = await sheetsService.obtenerMesActivo();
        if (MAPA_MES[m.toUpperCase()]) setMes(MAPA_MES[m.toUpperCase()]);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => { cargarAreas(); }, [mes, anio]);

  useEffect(() => { if (areaSel) cargarRol(); }, [areaSel, mes, anio]);

  const cargarAreas = async () => {
    setCargandoAreas(true);
    setSemana(0);
    try {
      const nombreMes = MESES_SHEET[mes] || 'AGOSTO';
      const hojas = await sheetsService.obtenerHojas();
      const hoja = hojas.find(h => String(h).toUpperCase().includes(nombreMes)) || nombreMes;
      const data = await sheetsService.cargarPersonal(hoja, mes, anio);
      const areasList = [...new Set(data.map(p => p.area).filter(Boolean))].sort();
      setAreas(areasList);
      const e = {};
      areasList.forEach(a => { e[a] = false; });

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_GOOGLE_CONFIG.sheetId}/values/ESTADOS!A:C?key=${DEFAULT_GOOGLE_CONFIG.apiKey}`;
      const response = await fetch(url);
      const d = await response.json();
      const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
      const areaPorNorm = {};
      areasList.forEach(a => { areaPorNorm[norm(a)] = a; });
      (d.values || []).forEach(fila => {
        const fArea = areaPorNorm[norm(fila[1])];
        const fEstado = (fila[2] || '').trim();
        if (mismoMes(fila[0], nombreMes) && fArea) e[fArea] = (fEstado === 'FINALIZADO');
      });
      setEstados(e);
      setAreaSel(prev => (prev && areasList.includes(prev) ? prev : (areasList[0] || '')));
    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar el panel');
    } finally {
      setCargandoAreas(false);
    }
  };

  const cargarRol = async () => {
    setCargandoRol(true);
    setSemana(0);
    setModalCambio(null);
    try {
      const nombreMes = MESES_SHEET[mes] || 'AGOSTO';
      const hojas = await sheetsService.obtenerHojas();
      const hoja = hojas.find(h => String(h).toUpperCase().includes(nombreMes)) || nombreMes;
      const data = await sheetsService.cargarPersonal(hoja, mes, anio);
      const filt = areaSel === 'TODAS' ? data : data.filter(p => p.area === areaSel);
      const t = {}; filt.forEach(e => { t[e.id] = {}; e.turnos.forEach((x, i) => { t[e.id][i + 1] = x || ''; }); });
      setPersonal(filt);
      setTurnos(t);
      setTurnosBackup(JSON.parse(JSON.stringify(t)));
    } catch (e) {
      setPersonal([]); setTurnos({});
      Alert.alert('Error', 'No se pudo cargar el rol');
    } finally {
      setCargandoRol(false);
    }
  };

  const toggleArea = async (area) => {
    const nombreMes = MESES_SHEET[mes] || 'AGOSTO';
    const nuevo = !estados[area];
    setEstados(prev => ({ ...prev, [area]: nuevo }));
    setGuardando(true);
    try {
      if (nuevo) await sheetsService.marcarFinalizado(area, nombreMes);
      else await sheetsService.desmarcarFinalizado(area, nombreMes);
    } catch (e) {
      setEstados(prev => ({ ...prev, [area]: !nuevo }));
      Alert.alert('Error', 'No se pudo actualizar');
    } finally { setGuardando(false); }
  };

  const pedirToggle = (area) => {
    if (guardando) return;
    const bloq = estados[area];
    Alert.alert(
      bloq ? 'Desbloquear área' : 'Bloquear área',
      `¿${bloq ? 'Habilitar' : 'Finalizar'} el área "${area}" para ${MESES[mes - 1]} ${anio}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: bloq ? 'Desbloquear' : 'Bloquear', style: bloq ? 'default' : 'destructive', onPress: () => toggleArea(area) }
      ]
    );
  };

  const totalDias = useMemo(() => { try { return new Date(anio, mes, 0).getDate(); } catch (e) { return 31; } }, [mes, anio]);
  const fechaBase = useMemo(() => new Date(anio, mes - 1, 1), [anio, mes]);
  const totalSemanas = useMemo(() => Math.ceil((totalDias + fechaBase.getDay()) / 7), [totalDias, fechaBase]);

  const diasSemana = useMemo(() => {
    const hoy = new Date();
    const hoyKey = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const dias = []; const inicio = new Date(fechaBase);
    inicio.setDate(inicio.getDate() + semana * 7);
    const mesActual = fechaBase.getMonth();
    for (let i = 0; i < 7; i++) {
      const f = new Date(inicio); f.setDate(f.getDate() + i);
      if (f.getMonth() !== mesActual) continue;
      const fecha = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
      const esDomingo = f.getDay() === 0;
      dias.push({ fecha, dia: f.getDate(), esHoy: fecha === hoyKey, esDomingo });
    }
    return dias;
  }, [fechaBase, semana]);

  const getTurno = useCallback((empId, dia) => turnos[empId]?.[dia] || '', [turnos]);

  const horasMesEmpleado = useCallback((empId) => {
    let h = 0;
    for (let d = 1; d <= totalDias; d++) {
      const c = getTurno(empId, d);
      if (TURNO_MAP[c]?.horas) h += TURNO_MAP[c].horas;
    }
    return h;
  }, [getTurno, totalDias]);

  const settTurno = (empId, dia, codigo) => {
    setTurnos(prev => ({ ...prev, [empId]: { ...prev[empId], [dia]: codigo } }));
  };

  const mostrarToast = useCallback((mensaje) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast(mensaje);
    toastTimeout.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const handleDiaClick = (empId, dia) => {
    if (cargandoRol) return;
    const actual = turnos[empId]?.[dia] || '';
    const nuevo = actual === turnoActivo ? '' : turnoActivo;
    if (actual === nuevo) return;
    settTurno(empId, dia, nuevo);
    mostrarToast(nuevo ? `${TURNO_MAP[nuevo]?.nombre || nuevo} · día ${dia}` : `Turno quitado · día ${dia}`);
  };

  const guardarCambio = async () => {
    if (personal.length === 0) return;
    setGuardando(true);
    try {
      const arr = personal.map(emp => ({
        fila: emp.fila,
        valores: Array.from({ length: totalDias }, (_, i) => {
          const c = turnos[emp.id]?.[i + 1];
          return c ? (TURNO_MAP[c]?.nombre || '') : '';
        })
      }));
      await sheetsService.guardarLote(MESES_SHEET[mes] || 'AGOSTO', areaSel === 'TODAS' ? '' : areaSel, 'ADMIN', arr);
      setTurnosBackup(JSON.parse(JSON.stringify(turnos)));
      Alert.alert('Éxito', 'Rol guardado correctamente');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el rol');
    } finally { setGuardando(false); }
  };

  const registrarCambioAdmin = async (emp, dia, codigo, motivo) => {
    try {
      await sheetsService.guardarCelda(MESES_SHEET[mes] || 'AGOSTO', emp.fila, dia, codigo, {
        responsable: 'ADMIN',
        area: emp.area || areaSel,
        origen: 'modalCambioTurno',
        motivo: motivo || ''
      });
    } catch (e) {}
    settTurno(emp.id, dia, codigo);
    setModalCambio(null);
  };

  const tieneCambios = JSON.stringify(turnos) !== JSON.stringify(turnosBackup);
  const bloqueada = estados[areaSel];
  const bloqueadas = Object.values(estados).filter(v => v).length;
  const disponibles = Object.values(estados).filter(v => !v).length;

  const personalFiltrado = useMemo(() => {
    if (!busqueda.trim()) return personal;
    const t = busqueda.toLowerCase().trim();
    return personal.filter(p =>
      (p.nombre || '').toLowerCase().includes(t) ||
      (p.grado || '').toLowerCase().includes(t) ||
      (p.dni || '').includes(t)
    );
  }, [personal, busqueda]);

  const francosInvalidos = useMemo(() => {
    const inval = {};
    personal.forEach(emp => {
      if ((emp.grado || '').toUpperCase().includes('CIVIL')) return;
      let cont = 0, ini = null;
      for (let d = 1; d <= totalDias; d++) {
        const c = turnos[emp.id]?.[d];
        if (c === 'F') { if (cont === 0) ini = d; cont++; }
        else {
          if (cont >= 3) {
            if (!inval[emp.id]) inval[emp.id] = [];
            inval[emp.id].push({ inicio: ini, fin: d - 1, cantidad: cont });
          }
          cont = 0; ini = null;
        }
      }
      if (cont >= 3) {
        if (!inval[emp.id]) inval[emp.id] = [];
        inval[emp.id].push({ inicio: ini, fin: totalDias, cantidad: cont });
      }
    });
    return inval;
  }, [personal, turnos, totalDias]);

  const idsConFrancos = useMemo(() => new Set(Object.keys(francosInvalidos).map(Number)), [francosInvalidos]);
  const totalFrancosInvalidos = Object.values(francosInvalidos).reduce((sum, i) => sum + i.length, 0);

  const quitarTildes = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const areasFiltradas = useMemo(() => {
    if (!busquedaArea.trim()) return areas;
    const t = quitarTildes(busquedaArea.trim());
    return areas.filter(a => quitarTildes(a).includes(t));
  }, [areas, busquedaArea]);

  if (cargandoAreas) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLOR_PRIMARIO} />
        <Text style={s.loadingText}>Cargando panel de control...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* HEADER */}
      <View style={[s.header, { paddingTop: (insets.top || 20) + 14 }]}>
        <TouchableOpacity onPress={() => router.back()}><X size={22} color="#FFF" /></TouchableOpacity>
        <Shield size={20} color="#FFF" />
        <View style={{ flex: 1 }}>
          <Text style={s.hTitle}>Panel de Control</Text>
          <Text style={s.hSub}>{MESES[mes - 1]} {anio} · {areaSel}</Text>
        </View>
        <TouchableOpacity onPress={() => { cargarAreas(); }}><RefreshCw size={20} color="#FFF" /></TouchableOpacity>
      </View>

      {/* NAVEGACION DE MES */}
      <View style={s.mesNav}>
        <TouchableOpacity style={s.mesBtn} onPress={() => setMes(m => (m === 1 ? 12 : m - 1))} activeOpacity={0.7}><ChevronLeft size={20} color="#FFF" /></TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.mesLabel}>Mes de trabajo</Text>
          <Text style={s.mesText}>{MESES[mes - 1]} {anio}</Text>
        </View>
        <TouchableOpacity style={s.mesBtn} onPress={() => setMes(m => (m === 12 ? 1 : m + 1))} activeOpacity={0.7}><ChevronRight size={20} color="#FFF" /></TouchableOpacity>
      </View>

      {/* ESTADÍSTICAS */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: '#F0FDF6' }]}>
          <Unlock size={20} color={COLOR_PRIMARIO} />
          <Text style={[s.statNum, { color: COLOR_PRIMARIO }]}>{disponibles}</Text>
          <Text style={s.statLabel}>Disponibles</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: '#F1F5F9' }]}>
          <Lock size={20} color="#64748B" />
          <Text style={[s.statNum, { color: '#64748B' }]}>{bloqueadas}</Text>
          <Text style={s.statLabel}>Bloqueadas</Text>
        </View>
      </View>

      {/* BUSCADOR DE AREAS */}
      <View style={s.searchBoxArea}>
        <Search size={16} color="#94A3B8" />
        <TextInput style={s.searchInputArea} value={busquedaArea} onChangeText={setBusquedaArea} placeholder="Buscar área por nombre..." placeholderTextColor="#94A3B8" />
        {busquedaArea ? (
          <TouchableOpacity onPress={() => setBusquedaArea('')} hitSlop={8}>
            <X size={16} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* SELECTOR DE AREAS */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.areasScroll}>
          {['TODAS', ...areasFiltradas].map(a => {
            const activa = a === areaSel;
            const bloq = estados[a];
            return (
              <TouchableOpacity key={a} onPress={() => setAreaSel(a)} activeOpacity={0.7}
                style={[s.areaChip, activa && s.areaChipActive]}>
                {!activa && a !== 'TODAS' && <View style={[s.areaDot, bloq ? { backgroundColor: '#64748B' } : { backgroundColor: COLOR_PRIMARIO }]} />}
                <Text style={[s.areaChipText, activa && s.areaChipTextActive]} numberOfLines={1}>
                  {a === 'TODAS' ? 'Todas las áreas' : a}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* GESTION DE AREAS (bloquear / desbloquear) */}
      <View style={s.gestRow}>
        <Text style={s.gestTitle}>Gestión de áreas {busquedaArea ? `(${areasFiltradas.length})` : ''}</Text>
        <TouchableOpacity style={s.gestRefresh} onPress={() => { setBusquedaArea(''); cargarAreas(); }} activeOpacity={0.7}>
          <RefreshCw size={13} color={COLOR_PRIMARIO} />
          <Text style={s.gestRefreshText}>Recargar</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.gestScroll}>
        {areasFiltradas.length === 0 && (
          <View style={s.gestVacio}>
            <Text style={s.gestVacioText}>Sin resultados para "{busquedaArea}"</Text>
          </View>
        )}
        {areasFiltradas.map(a => {
          const bloq = estados[a];
          return (
            <View key={a} style={s.gestChip}>
              <View style={[s.gestDot, bloq ? { backgroundColor: '#EF4444' } : { backgroundColor: COLOR_PRIMARIO }]} />
              <Text style={s.gestChipNombre} numberOfLines={1}>{a}</Text>
              <Text style={[s.gestChipEstado, { color: bloq ? '#EF4444' : COLOR_PRIMARIO }]}>{bloq ? 'Finalizado' : 'Disponible'}</Text>
              <TouchableOpacity style={[s.gestBtn, { backgroundColor: bloq ? '#FEF2F2' : '#F0FDF6' }]}
                onPress={() => pedirToggle(a)} disabled={guardando} activeOpacity={0.7}>
                {bloq ? <Unlock size={13} color="#EF4444" /> : <Lock size={13} color={COLOR_PRIMARIO} />}
                <Text style={[s.gestBtnText, { color: bloq ? '#EF4444' : COLOR_PRIMARIO }]}>
                  {bloq ? 'Desbloquear' : 'Bloquear'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* CONTROL DE BLOQUEO DE LA AREA SELECCIONADA */}
      {areaSel !== 'TODAS' && (
        <View style={s.controlRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.controlTitle} numberOfLines={1}>{areaSel}</Text>
            <Text style={[s.controlSub, { color: bloqueada ? '#64748B' : COLOR_PRIMARIO }]}>
              {bloqueada ? 'Área bloqueada (FINALIZADO) · edición admin activa' : 'Área disponible'}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.lockBtn, { backgroundColor: bloqueada ? '#F0FDF6' : '#FEF2F2' }]}
            onPress={() => pedirToggle(areaSel)}
            disabled={guardando}
          >
            {bloqueada ? <Unlock size={16} color={COLOR_PRIMARIO} /> : <Lock size={16} color="#EF4444" />}
            <Text style={[s.lockBtnText, { color: bloqueada ? COLOR_PRIMARIO : '#EF4444' }]}>
              {bloqueada ? 'Desbloquear' : 'Bloquear'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* BUSCADOR */}
      <View style={s.searchBox}>
        <Search size={18} color="#94A3B8" />
        <TextInput style={s.searchInput} value={busqueda} onChangeText={setBusqueda} placeholder="Buscar personal por nombre, grado o DNI..." placeholderTextColor="#94A3B8" />
      </View>

      {/* NAVEGACION DE SEMANA */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => setSemana(s => Math.max(0, s - 1))} disabled={semana === 0}><ChevronLeft size={22} color={semana === 0 ? '#D1D5DB' : '#6B7280'} /></TouchableOpacity>
        <Text style={s.navText}>Semana {semana + 1} de {totalSemanas} · {personal.length} personal</Text>
        <TouchableOpacity onPress={() => setSemana(s => Math.min(totalSemanas - 1, s + 1))} disabled={semana >= totalSemanas - 1}><ChevronRight size={22} color={semana >= totalSemanas - 1 ? '#D1D5DB' : '#6B7280'} /></TouchableOpacity>
      </View>

      {/* ROL */}
      {areaSel && (
        <FlatList
          data={personalFiltrado}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 100 }}
          ListHeaderComponent={
            <>
              {totalFrancosInvalidos > 0 && (
                <View style={s.francosBanner}>
                  <AlertTriangle size={14} color="#FFF" />
                  <Text style={s.francosBannerText}>
                    {totalFrancosInvalidos} {totalFrancosInvalidos === 1 ? 'franco inválido consecutivo' : 'francos inválidos consecutivos'} · {idsConFrancos.size} {idsConFrancos.size === 1 ? 'persona' : 'personas'} marcadas en rojo
                  </Text>
                </View>
              )}
              <View style={s.gridHeader}>
                {DIAS.map((d, i) => <View key={i} style={s.gridHeaderCell}><Text style={[s.gridHeaderText, (i === 5 || i === 6) && { color: '#CBD5E1' }]}>{d}</Text></View>)}
                <View style={s.gridHeaderHoras}><Text style={s.gridHeaderText}>Hrs</Text></View>
              </View>
            </>
          }
          renderItem={({ item: emp }) => {
            const horasMes = horasMesEmpleado(emp.id);
            const conFrancos = idsConFrancos.has(emp.id);
            const francosInfo = francosInvalidos[emp.id];
            return (
              <View style={[s.card, conFrancos && s.cardInvalido]}>
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={s.cardGradoRow}>
                      <Text style={s.cardGrado}>{emp.grado}</Text>
                      {conFrancos && <AlertTriangle size={12} color="#DC2626" />}
                    </View>
                    <Text style={s.cardNombre}>{emp.nombre}</Text>
                    <Text style={s.cardDni}>{emp.dni} · {emp.area}</Text>
                    {conFrancos && (
                      <Text style={s.cardFrancosInfo}>
                        {francosInfo.map(f => `${f.inicio}-${f.fin} (${f.cantidad})`).join(', ')}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.cardHoras}>{horasMes}h</Text>
                    <Text style={s.cardHorasLabel}>mes</Text>
                  </View>
                  <TouchableOpacity style={s.cambioBtn} onPress={() => setModalCambio(emp)} activeOpacity={0.7}>
                    <Clock size={15} color={COLOR_PRIMARIO} />
                    <Text style={s.cambioBtnText}>Cambio</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.gridContainer}>
                  <View style={s.gridRow}>
                    {diasSemana.map(d => {
                      const codigo = getTurno(emp.id, d.dia);
                      const turno = TURNO_MAP[codigo];
                      return (
                        <TouchableOpacity key={d.fecha} onPress={() => handleDiaClick(emp.id, d.dia)} style={s.gridCell} activeOpacity={0.7}>
                          <View style={[
                            s.gridDay,
                            turno ? { backgroundColor: turno.color } : { backgroundColor: '#F1F5F9' },
                            d.esHoy && s.gridDayHoy,
                          ]}>
                            <Text style={[
                              s.gridDayNum,
                              turno ? { color: turno.texto } : { color: '#94A3B8' },
                              d.esHoy && { color: '#FFF' },
                            ]}>{d.dia}</Text>
                            <Text style={[
                              s.gridDayTurno,
                              turno ? { color: turno.texto } : { color: '#CBD5E1' },
                              d.esHoy && { color: '#FFF' },
                            ]} numberOfLines={1}>{codigo || '·'}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {Array.from({ length: 7 - diasSemana.length }).map((_, i) => <View key={`e-${i}`} style={s.gridCell} />)}
                    <View style={s.gridCellHoras}>
                      <Text style={s.gridHorasText}>{diasSemana.reduce((h, d) => { const c = getTurno(emp.id, d.dia); return h + (TURNO_MAP[c]?.horas || 0); }, 0)}h</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* BARRA DE TURNOS ACTIVOS + GUARDADO */}
      <View style={[s.footer, { paddingBottom: (insets.bottom || 8) + 10 }]}>
        <View style={s.turnosBar}>
          <Text style={s.turnosBarLabel}>Turno:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.turnosScroll}>
            {[['', 'S/T'], ...Object.keys(TURNO_MAP).map(c => [c, c])].map(([codigo, label]) => {
              const t = TURNO_MAP[codigo] || { color: '#E2E8F0', texto: '#334155' };
              const activo = turnoActivo === codigo;
              return (
                <TouchableOpacity key={codigo || 'st'} onPress={() => setTurnoActivo(codigo)} activeOpacity={0.8}
                  style={[s.turnoChipBar, { backgroundColor: t.color }, activo && s.turnoChipBarActive]}>
                  <Text style={[s.turnoChipBarText, { color: t.texto }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        <TouchableOpacity style={[s.saveBtn, (!tieneCambios || guardando) && { opacity: guardando ? 0.6 : 0.4 }]} onPress={guardarCambio} disabled={guardando}>
          {guardando ? <ActivityIndicator size="small" color="#FFF" /> : <><Save size={18} color="#FFF" /><Text style={s.saveText}>{tieneCambios ? 'Guardar cambios' : 'Sin cambios'}</Text></>}
        </TouchableOpacity>
      </View>

      {/* TOAST */}
      {!!toast && (
        <View style={s.toast} pointerEvents="none">
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}

      {/* MODAL CAMBIO DE TURNO (registro con motivo) */}
      <ModalCambioTurnoAdmin visible={!!modalCambio} emp={modalCambio} personal={personal} turnos={turnos} totalDias={totalDias} MES={MESES[mes - 1]} ANIO={anio}
        onCerrar={() => setModalCambio(null)}
        onGuardar={registrarCambioAdmin} />
    </View>
  );
}

const ModalCambioTurnoAdmin = ({ visible, emp, personal, turnos, totalDias, MES, ANIO, onCerrar, onGuardar }) => {
  const [dia, setDia] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => { setDia(null); setCodigo(''); setMotivo(''); }, [emp]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <View style={s.modalOverlay}>
        <View style={s.modalBox}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Cambio de Turno</Text>
            <TouchableOpacity onPress={onCerrar}><X size={20} color="#FFF" /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            {emp && <Text style={s.modalInfo}>{emp.grado} {emp.nombre} · {MES} {ANIO}</Text>}
            {emp && emp.area && <Text style={s.modalSub}>Área: {emp.area}</Text>}

            {!dia && (
              <>
                <Text style={s.modalLabel}>Seleccione el día a cambiar</Text>
                <View style={s.diasWrap}>
                  {Array.from({ length: totalDias }, (_, i) => i + 1).map(d => {
                    const actual = emp ? (turnos[emp.id]?.[d] || '') : '';
                    const t = TURNO_MAP[actual];
                    return (
                      <TouchableOpacity key={d} style={[s.diaBox, t && { backgroundColor: t.color }]} onPress={() => setDia(d)}>
                        <Text style={[s.diaNum, t && { color: t.texto }]}>{d}</Text>
                        <Text style={[s.diaTurno, t ? { color: t.texto } : { color: '#CBD5E1' }]} numberOfLines={1}>{actual || '·'}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {dia && (
              <>
                <View style={s.empSel}>
                  <Text style={s.empSelName}>{emp.grado} {emp.nombre}</Text>
                  <Text style={s.empSelSub}>Día {dia} · Actual: {turnos[emp.id]?.[dia] || 'Sin turno'}</Text>
                </View>
                <Text style={s.modalLabel}>Nuevo turno</Text>
                <View style={s.turnosWrap}>
                  {Object.keys(TURNO_MAP).map(c => {
                    const t = TURNO_MAP[c]; if (!t) return null;
                    const activo = codigo === c;
                    return (
                      <TouchableOpacity key={c} onPress={() => setCodigo(c)} style={[s.turnoBox, { backgroundColor: t.color }, activo && s.turnoBoxActive]}>
                        <Text style={[s.turnoBoxText, { color: t.texto }]}>{c}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={s.modalLabel}>Motivo (opcional)</Text>
                <TextInput style={s.motivoInput} value={motivo} onChangeText={setMotivo} placeholder="Ej: Cobertura por descanso médico" placeholderTextColor="#94A3B8" />
                <TouchableOpacity style={[s.guardarCambio, !codigo && { opacity: 0.5 }]} disabled={!codigo} onPress={() => onGuardar(emp, dia, codigo, motivo)}>
                  <Text style={s.guardarCambioText}>Asignar turno</Text>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { fontSize: 14, color: '#64748B', marginTop: 12 },

  header: { backgroundColor: COLOR_PRIMARIO, flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 14, gap: 10 },
  hTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  hSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },

  mesNav: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', marginHorizontal: 12, marginTop: 12,
    borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F1F5F9',
  },
  mesBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLOR_PRIMARIO, alignItems: 'center', justifyContent: 'center' },
  mesLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  mesText: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 2 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12, gap: 10 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 2 },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },

  areasScroll: { paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  areaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', maxWidth: 240,
  },
  areaChipActive: { backgroundColor: COLOR_PRIMARIO, borderColor: COLOR_PRIMARIO },
  areaDot: { width: 8, height: 8, borderRadius: 4 },
  areaChipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  areaChipTextActive: { color: '#FFF', fontWeight: '700' },

  controlRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', marginHorizontal: 12,
    borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F1F5F9',
  },

  gestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 12 },
  gestTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  gestRefresh: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gestRefreshText: { fontSize: 11, fontWeight: '700', color: COLOR_PRIMARIO },
  gestScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  gestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 12, paddingVertical: 8, minWidth: 220, maxWidth: 280,
  },
  gestDot: { width: 8, height: 8, borderRadius: 4 },
  gestChipNombre: { flex: 1, fontSize: 12, fontWeight: '700', color: '#334155' },
  gestChipEstado: { fontSize: 10, fontWeight: '700' },
  gestBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  gestBtnText: { fontSize: 11, fontWeight: '700' },
  controlTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  controlSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  lockBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', marginHorizontal: 12, marginTop: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 14, paddingHorizontal: 14, height: 46, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#334155' },

  searchBoxArea: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', marginHorizontal: 12, marginTop: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 14, paddingHorizontal: 14, height: 42, gap: 8,
  },
  searchInputArea: { flex: 1, fontSize: 13, color: '#334155' },
  gestVacio: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8 },
  gestVacioText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 10 },
  navText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  francosBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DC2626', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8 },
  francosBannerText: { color: '#FFF', fontSize: 12, fontWeight: '700', flex: 1 },

  gridHeader: { flexDirection: 'row', marginBottom: 4, paddingRight: 36 },
  gridHeaderCell: { flex: 1, alignItems: 'center' },
  gridHeaderHoras: { position: 'absolute', right: 0, width: 30, alignItems: 'center' },
  gridHeaderText: { fontSize: 10, fontWeight: '700', color: '#9CA3AF' },

  card: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  cardInvalido: { borderColor: '#FECACA', borderWidth: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', gap: 8 },
  cardGradoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardGrado: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  cardNombre: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 1 },
  cardDni: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  cardFrancosInfo: { fontSize: 10, fontWeight: '700', color: '#DC2626', marginTop: 2 },
  cardHoras: { fontSize: 18, fontWeight: '800', color: COLOR_PRIMARIO },
  cardHorasLabel: { fontSize: 9, color: '#94A3B8', textAlign: 'center' },
  cambioBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF6', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  cambioBtnText: { fontSize: 11, fontWeight: '700', color: COLOR_PRIMARIO },

  gridContainer: { padding: 8 },
  gridRow: { flexDirection: 'row' },
  gridCell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  gridCellHoras: { width: 30, alignItems: 'center', justifyContent: 'center' },
  gridHorasText: { fontSize: 11, fontWeight: '800', color: COLOR_PRIMARIO },
  gridDay: { width: '100%', maxWidth: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  gridDayHoy: { borderWidth: 2, borderColor: COLOR_PRIMARIO, borderRadius: 10 },
  gridDayNum: { fontSize: 12, fontWeight: '600' },
  gridDayTurno: { fontSize: 9, fontWeight: '700', marginTop: 2, textAlign: 'center' },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', padding: 10 },
  turnosBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  turnosBarLabel: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  turnosScroll: { gap: 6, paddingRight: 12 },
  turnoChipBar: { minWidth: 40, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 8 },
  turnoChipBarActive: { borderWidth: 3, borderColor: '#1E293B' },
  turnoChipBarText: { fontSize: 12, fontWeight: '800' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR_PRIMARIO, height: 48, borderRadius: 14, gap: 8 },
  saveText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  toast: { position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: 'rgba(15,23,42,0.94)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, zIndex: 90, maxWidth: '90%' },
  toastText: { color: '#FFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: COLOR_PRIMARIO, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  modalBody: { padding: 16 },
  modalInfo: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 11, color: '#64748B', marginTop: 3, marginBottom: 10 },
  modalLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 8 },

  diasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  diaBox: { width: '13%', aspectRatio: 0.8, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 4 },
  diaNum: { fontSize: 11, fontWeight: '700', color: '#334155' },
  diaTurno: { fontSize: 7, fontWeight: '700', marginTop: 1 },
  empSel: { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 10 },
  empSelName: { fontSize: 14, fontWeight: '700', color: '#065F46' },
  empSelSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  turnosWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  turnoBox: { minWidth: 52, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 6 },
  turnoBoxActive: { borderWidth: 3, borderColor: '#1E293B' },
  turnoBoxText: { fontSize: 12, fontWeight: '800' },
  motivoInput: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#334155' },
  guardarCambio: { backgroundColor: COLOR_PRIMARIO, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  guardarCambioText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  lockBtnText: { fontSize: 12, fontWeight: '700' },
});