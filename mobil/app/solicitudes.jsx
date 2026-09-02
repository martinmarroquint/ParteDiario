// app/solicitudes.jsx
// HRPA - Cambios de Turno: Bandeja de solicitudes + Registro + Modo Admin
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, TextInput, ScrollView, Alert, Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  X, Inbox, RefreshCw, Lock, Shield, Check, Ban, Calendar, Search,
  User, Users, ArrowRightLeft, Send, ChevronDown, Key, GitCompare, UserPlus
} from 'lucide-react-native';
import { sheetsService } from '../src/services/sheets';
import {
  obtenerSolicitudesCambio, actualizarSolicitudCambio, enviarSolicitudCambio, ESTADOS
} from '../src/services/solicitudes';
import { COLOR_PRIMARIO, MESES, TURNO_MAP, TURNOS, CLAVE_SECRETA, DEFAULT_GOOGLE_CONFIG } from '../src/constants/config';

const SIN_TURNO_VAL = 'S/T';
const config = DEFAULT_GOOGLE_CONFIG;
const mesActualDefault = (() => { const mapa = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 }; return mapa[(config.sheetName || 'AGOSTO').toUpperCase()] || new Date().getMonth() + 1; })();
const anioActualDefault = new Date().getFullYear();

const formatearFecha = (iso) => {
  if (!iso) return '';
  try {
    const f = new Date(iso);
    if (isNaN(f.getTime())) return iso;
    return `${String(f.getDate()).padStart(2,'0')}/${String(f.getMonth()+1).padStart(2,'0')}/${f.getFullYear()} ${String(f.getHours()).padStart(2,'0')}:${String(f.getMinutes()).padStart(2,'0')}`;
  } catch { return iso; }
};

export default function SolicitudesScreen() {
  const router = useRouter();
  const [vista, setVista] = useState('bandeja');
  const [esAdmin, setEsAdmin] = useState(false);
  const [claveModo, setClaveModo] = useState(false);
  const [claveInput, setClaveInput] = useState('');

  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(ESTADOS.PENDIENTE);
  const [expandida, setExpandida] = useState(null);
  const [observacion, setObservacion] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await obtenerSolicitudesCambio();
      setLista(data);
      setError('');
    } catch { setError('No se pudieron cargar las solicitudes.'); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => {
    if (vista === 'bandeja') { cargar(); }
  }, [vista, cargar]);

  const verificarClave = () => {
    if (claveInput.trim() === CLAVE_SECRETA) { setEsAdmin(true); setClaveModo(false); setClaveInput(''); setError(''); }
    else { setClaveInput(''); setError('Clave incorrecta'); }
  };

  const procesar = async (sol, nuevoEstado) => {
    if (procesando) return;
    if (nuevoEstado === ESTADOS.DESAPROBADO && !observacion.trim()) {
      setError('Debe escribir la observacion / motivos para desaprobar.');
      setExpandida(sol.id);
      return;
    }
    setProcesando(true);
    setError('');
    try {
      await actualizarSolicitudCambio({ id: sol.id, estado: nuevoEstado, revisadoPor: 'ADMIN', observacion: observacion.trim() });
      setObservacion(''); setExpandida(null);
      await cargar();
      if (nuevoEstado === ESTADOS.APROBADO) Alert.alert('Exito', `Solicitud #${sol.id} aprobada. Turnos aplicados al rol.`);
    } catch { setError('No se pudo procesar la solicitud. Verifique el Apps Script.'); }
    finally { setProcesando(false); }
  };

  const pendientes = lista.filter(s => s.estado === ESTADOS.PENDIENTE);
  const aprobadas = lista.filter(s => s.estado === ESTADOS.APROBADO);
  const desaprobadas = lista.filter(s => s.estado === ESTADOS.DESAPROBADO);
  const actual = tab === ESTADOS.APROBADO ? aprobadas : tab === ESTADOS.DESAPROBADO ? desaprobadas : pendientes;

  const ChipTurno = ({ codigo, nombre }) => {
    const sinTurno = !codigo && !nombre;
    const t = TURNO_MAP[codigo];
    return (
      <View style={[s.chip, { backgroundColor: t ? t.color : (sinTurno ? '#F1F5F9' : '#FFF') }]}>
        <Text style={[s.chipText, { color: t ? t.texto : (sinTurno ? '#9CA3AF' : '#334155') }]}>{codigo || (sinTurno ? 'S/T' : '')}</Text>
      </View>
    );
  };

  const renderEstado = (estado) => {
    if (estado === ESTADOS.APROBADO) return <View style={[s.estadoBadge, { backgroundColor: '#D1FAE5' }]}><Text style={[s.estadoText, { color: '#047857' }]}>Aprobado</Text></View>;
    if (estado === ESTADOS.DESAPROBADO) return <View style={[s.estadoBadge, { backgroundColor: '#FEE2E2' }]}><Text style={[s.estadoText, { color: '#B91C1C' }]}>Desaprobado</Text></View>;
    return <View style={[s.estadoBadge, { backgroundColor: '#FEF3C7' }]}><Text style={[s.estadoText, { color: '#B45309' }]}>Pendiente</Text></View>;
  };

  if (vista === 'registro') {
    return (
      <RegistroCambio
        onCancel={() => setVista('bandeja')}
        onEnviado={() => { setVista('bandeja'); setTab(ESTADOS.PENDIENTE); cargar(); }}
      />
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><X size={22} color="#FFF" /></TouchableOpacity>
        <Inbox size={20} color="#FFF" />
        <Text style={s.headerTitle}>Cambios de Turno</Text>
        {!esAdmin && !claveModo && (
          <TouchableOpacity onPress={() => setClaveModo(true)}><Shield size={20} color="#FFF" /></TouchableOpacity>
        )}
        {esAdmin && (
          <TouchableOpacity onPress={() => setEsAdmin(false)}><Lock size={20} color="#FFF" /></TouchableOpacity>
        )}
        <TouchableOpacity onPress={cargar} disabled={cargando}><RefreshCw size={20} color="#FFF" /></TouchableOpacity>
      </View>

      {claveModo && !esAdmin && (
        <View style={s.claveRow}>
          <View style={s.claveInputBox}>
            <Key size={16} color="#94A3B8" />
            <TextInput style={s.claveInput} value={claveInput} onChangeText={(t) => { setClaveInput(t); setError(''); }} placeholder="Clave de administrador" placeholderTextColor="#94A3B8" secureTextEntry autoFocus onSubmitEditing={verificarClave} />
          </View>
          <TouchableOpacity style={s.claveBtn} onPress={verificarClave}><Shield size={16} color="#FFF" /><Text style={s.claveBtnText}>Verificar</Text></TouchableOpacity>
          <TouchableOpacity style={s.claveCancel} onPress={() => { setClaveModo(false); setClaveInput(''); }}><Text style={s.claveCancelText}>X</Text></TouchableOpacity>
        </View>
      )}

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tabBtn, tab === ESTADOS.PENDIENTE && s.tabActive]} onPress={() => setTab(ESTADOS.PENDIENTE)}>
          <Text style={[s.tabText, tab === ESTADOS.PENDIENTE && s.tabTextActive]}>Pendientes</Text>
          <View style={[s.tabCount, tab === ESTADOS.PENDIENTE && { backgroundColor: COLOR_PRIMARIO }]}><Text style={s.tabCountText}>{pendientes.length}</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === ESTADOS.APROBADO && s.tabActive]} onPress={() => setTab(ESTADOS.APROBADO)}>
          <Text style={[s.tabText, tab === ESTADOS.APROBADO && s.tabTextActive]}>Aprobadas</Text>
          <View style={[s.tabCount, tab === ESTADOS.APROBADO && { backgroundColor: COLOR_PRIMARIO }]}><Text style={s.tabCountText}>{aprobadas.length}</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === ESTADOS.DESAPROBADO && s.tabActive]} onPress={() => setTab(ESTADOS.DESAPROBADO)}>
          <Text style={[s.tabText, tab === ESTADOS.DESAPROBADO && s.tabTextActive]}>Desaprobadas</Text>
          <View style={[s.tabCount, tab === ESTADOS.DESAPROBADO && { backgroundColor: COLOR_PRIMARIO }]}><Text style={s.tabCountText}>{desaprobadas.length}</Text></View>
        </TouchableOpacity>
      </View>

      {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

      {cargando && actual.length === 0 ? (
        <View style={s.centerList}><ActivityIndicator size="large" color={COLOR_PRIMARIO} /><Text style={s.emptyText}>Cargando solicitudes...</Text></View>
      ) : actual.length === 0 ? (
        <View style={s.centerList}><Inbox size={48} color="#E2E8F0" /><Text style={s.emptyText}>Sin solicitudes {tab.toLowerCase()}{tab === ESTADOS.DESAPROBADO ? 's' : 's'}</Text></View>
      ) : (
        <FlatList
          data={actual}
          keyExtractor={s => s.id.toString()}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          renderItem={({ item: sol }) => {
            const abierta = expandida === sol.id;
            const resumen = (sol.participantes || []).map(p => p.trabajador).filter(Boolean).join(' y ') || 'Sin trabajadores';
            return (
              <View style={[s.card, abierta && s.cardOpen]}>
                <TouchableOpacity style={s.cardHeader} onPress={() => { setExpandida(abierta ? null : sol.id); setObservacion(''); setError(''); }}>
                  <View style={s.cardIcon}><User size={18} color="#64748B" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle} numberOfLines={1}>{resumen}</Text>
                    <Text style={s.cardSub}><Calendar size={10} color="#94A3B8" /> {MESES[(sol.mes || 1) - 1]} {sol.anio} · {sol.dias.join(', ')} · #{sol.id}</Text>
                  </View>
                  {renderEstado(sol.estado)}
                  <ChevronDown size={16} color="#CBD5E1" style={{ transform: [{ rotate: abierta ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>

                {abierta && (
                  <View style={s.cardBody}>
                    <View style={s.infoGrid}>
                      <View style={s.infoCell}><Text style={s.infoLabel}>Area</Text><Text style={s.infoValue} numberOfLines={1}>{sol.area_solicitante || '-'}</Text></View>
                      <View style={s.infoCell}><Text style={s.infoLabel}>Solicitante</Text><Text style={s.infoValue} numberOfLines={1}>{sol.solicitante || '-'}</Text></View>
                      <View style={s.infoCell}><Text style={s.infoLabel}>Días</Text><Text style={s.infoValue}>{sol.dias.join(', ')}</Text></View>
                      <View style={s.infoCell}><Text style={s.infoLabel}>Fecha</Text><Text style={s.infoValue}>{formatearFecha(sol.fecha_solicitud) || '-'}</Text></View>
                    </View>

                    {(sol.participantes || []).map((p, i) => (
                      <View key={i} style={s.participante}>
                        <Text style={s.participanteName}>{i + 1}. {p.trabajador || 'Sin nombre'} <Text style={s.participanteSub}>{p.dni ? `DNI ${p.dni}` : ''}{p.area ? ` · ${p.area}` : ''}</Text></Text>
                        <View style={s.participanteRow}>
                          <Text style={s.participanteLabel}>Actual:</Text>
                          <ChipTurno codigo={p.turno_actual} nombre={p.turno_actual_nombre} />
                          <ArrowRightLeft size={14} color={COLOR_PRIMARIO} />
                          <Text style={s.participanteLabel}>Propuesta:</Text>
                          <ChipTurno codigo={p.turno_solicitado} nombre={p.turno_solicitado_nombre} />
                        </View>
                      </View>
                    ))}

                    <View style={s.detailBox}><Text style={s.detailLabel}>{sol.tipo_cambio || 'Tipo'} · Motivo</Text><Text style={s.detailText}>{sol.motivo || '-'}</Text></View>
                    <View style={[s.detailBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}><Text style={[s.detailLabel, { color: '#B45309' }]}>Pormenores</Text><Text style={[s.detailText, { color: '#92400E' }]}>{sol.pormenores || '-'}</Text></View>

                    {sol.estado !== ESTADOS.PENDIENTE && (
                      <View style={[s.revisionBox, { backgroundColor: sol.estado === ESTADOS.APROBADO ? '#ECFDF5' : '#FEF2F2', borderColor: sol.estado === ESTADOS.APROBADO ? '#A7F3D0' : '#FECACA' }]}>
                        <Text style={[s.revisionTitle, { color: sol.estado === ESTADOS.APROBADO ? '#047857' : '#B91C1C' }]}>
                          {sol.estado === ESTADOS.APROBADO ? 'Aprobada por' : 'Desaprobada por'} {sol.revisado_por || '-'} · {formatearFecha(sol.fecha_revision) || '-'}
                        </Text>
                        {sol.observacion_revision && <Text style={s.revisionText}>Observacion / motivos: {sol.observacion_revision}</Text>}
                      </View>
                    )}

                    {sol.estado === ESTADOS.PENDIENTE && esAdmin && (
                      <>
                        <TextInput style={s.obsInput} value={observacion} onChangeText={setObservacion} placeholder="Observacion (obligatoria al desaprobar)" placeholderTextColor="#94A3B8" multiline />
                        <View style={s.accBtns}>
                          <TouchableOpacity style={s.btnDesaprobar} onPress={() => procesar(sol, ESTADOS.DESAPROBADO)} disabled={procesando}>
                            {procesando ? <ActivityIndicator size="small" color="#EF4444" /> : <><Ban size={14} color="#EF4444" /><Text style={s.btnDesaprobarText}>Desaprobar</Text></>}
                          </TouchableOpacity>
                          <TouchableOpacity style={s.btnAprobar} onPress={() => procesar(sol, ESTADOS.APROBADO)} disabled={procesando}>
                            {procesando ? <ActivityIndicator size="small" color="#FFF" /> : <><Check size={14} color="#FFF" /><Text style={s.btnAprobarText}>Aprobar</Text></>}
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                    {sol.estado === ESTADOS.PENDIENTE && !esAdmin && (
                      <View style={[s.detailBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}><Text style={s.detailText}>Solicitud pendiente de revision por el administrador.</Text></View>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      <View style={s.footer}>
        <TouchableOpacity style={s.btnRegistrarSolicitud} onPress={() => setVista('registro')} activeOpacity={0.8}>
          <UserPlus size={18} color="#FFF" /><Text style={s.btnRegistrarSolicitudText}>Registrar cambio de turno</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================
// REGISTRO DE SOLICITUD (flujo por pasos)
// ============================================================
function RegistroCambio({ onCancel, onEnviado }) {
  const [participantes, setParticipantes] = useState([]);
  const [modalidad, setModalidad] = useState('PERSONAL');
  const [paso, setPaso] = useState(0);
  const [busquedaSolicitante, setBusquedaSolicitante] = useState('');
  const [busquedaComp, setBusquedaComp] = useState('');
  const [motivo, setMotivo] = useState('');
  const [pormenores, setPormenores] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [personal, setPersonal] = useState([]);
  const [turnosData, setTurnosData] = useState({});
  const [cargandoPersonal, setCargandoPersonal] = useState(true);
  const [diaSel, setDiaSel] = useState(null);
  const [turnoNuevo, setTurnoNuevo] = useState('');
  const [motivoCambio, setMotivoCambio] = useState('');
  const [hojaAct, setHojaAct] = useState(config.sheetName || 'AGOSTO');
  const [mesAct, setMesAct] = useState(mesActualDefault);
  const [anioAct, setAnioAct] = useState(anioActualDefault);

  const totalDias = new Date(anioAct, mesAct, 0).getDate();
  const DIAS = Array.from({ length: totalDias }, (_, i) => i + 1);

  const cargarPersonal = useCallback(async () => {
    try {
      const data = await sheetsService.cargarPersonal(hojaAct, mesAct, anioAct);
      setPersonal(data);
      const t = {};
      data.forEach(e => { t[e.id] = {}; e.turnos.forEach((x, i) => { t[e.id][i + 1] = x || ''; }); });
      setTurnosData(t);
    } catch (e) { setError('No se pudo cargar el personal'); }
    finally { setCargandoPersonal(false); }
  }, [hojaAct, mesAct, anioAct]);

  useEffect(() => {
    (async () => {
      try {
        const m = await sheetsService.obtenerMesActivo();
        const mapa = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 };
        const num = mapa[(m || 'AGOSTO').toUpperCase()];
        if (num) { setHojaAct(m); setMesAct(num); }
      } catch (e) {}
    })();
  }, []);

  useEffect(() => { cargarPersonal(); }, [cargarPersonal]);

  const turnoDe = (emp, d) => (turnosData[emp?.id]?.[d]) || '';

  const candidatos = (t, idsExcluidos = []) => {
    const idsYa = new Set(idsExcluidos);
    let r = personal.filter(p => !idsYa.has(p.id));
    const q = String(t || '').trim().toLowerCase();
    if (q) r = r.filter(p =>
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.dni || '').includes(q) ||
      (p.grado || '').toLowerCase().includes(q) ||
      (p.area || '').toLowerCase().includes(q)
    );
    return r.slice(0, 30);
  };

  const seleccionarSolicitante = (emp) => {
    setParticipantes([{ emp, cambios: [] }]);
    setBusquedaSolicitante('');
    setError('');
  };

  const agregarCompanero = (emp) => {
    setParticipantes(prev => {
      if (prev.length >= 2 || prev.some(p => p.emp.id === emp.id)) return prev;
      return [...prev, { emp, cambios: [] }];
    });
    setBusquedaComp('');
    setError('');
  };

  const quitarCompanero = () => { setParticipantes(prev => prev.slice(0, 1)); setError(''); };

  const agregarCambio = (idx) => {
    if (!diaSel || !turnoNuevo) return;
    const emp = participantes[idx]?.emp;
    if (!emp) return;
    const actual = turnoDe(emp, diaSel);
    setParticipantes(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const cambios = [...p.cambios.filter(c => c.dia !== diaSel)];
      cambios.push({ dia: diaSel, actual: actual || '', nuevo: turnoNuevo, motivo: motivoCambio || 'Cambio de turno' });
      cambios.sort((a, b) => a.dia - b.dia);
      return { ...p, cambios };
    }));
    setDiaSel(null); setTurnoNuevo(''); setMotivoCambio(''); setError('');
  };

  const eliminarCambio = (idx, i) => {
    setParticipantes(prev => prev.map((p, j) => j === idx ? { ...p, cambios: p.cambios.filter((_, k) => k !== i) } : p));
  };

  const diasDeSolicitud = () => [...new Set(participantes.flatMap(p => p.cambios.map(c => c.dia)))].sort((a, b) => a - b);

  const validarPasoActual = () => {
    if (participantes.length === 0) return 'Seleccione quien solicita el cambio';
    if (paso === 0 && participantes[0].cambios.length === 0) return 'Indique al menos un cambio de turno del solicitante';
    if (paso === 1 && (!participantes[1] || participantes[1].cambios.length === 0)) return 'Indique al menos un cambio de turno del companero';
    if (paso === 2) {
      if (motivo.trim().length < 10) return 'El motivo debe estar justificado (minimo 10 caracteres)';
      if (!pormenores.trim()) return 'Los pormenores son obligatorios (quien autoriza, referencia, documento)';
    }
    return '';
  };

  const pasos = modalidad === 'CON COMPANERO' ? [0, 1, 2] : [0, 2];
  const pasoIdx = pasos.indexOf(paso);

  const siguiente = () => {
    const err = validarPasoActual();
    if (err) { setError(err); return; }
    setError('');
    if (pasoIdx < pasos.length - 1) setPaso(pasos[pasoIdx + 1]);
  };

  const atras = () => {
    setError('');
    if (pasoIdx > 0) setPaso(pasos[pasoIdx - 1]);
  };

  const handleEnviar = async () => {
    const err = validarPasoActual();
    if (err) { setError(err); return; }
    const datos = {
      solicitante: `${participantes[0].emp.grado || ''} ${participantes[0].emp.nombre || ''}`.trim(),
      area_solicitante: participantes[0].emp.area || '',
      hoja: hojaAct,
      mes: mesAct, anio: anioAct,
      dias: diasDeSolicitud(),
      tipo_cambio: modalidad,
      motivo: motivo.trim(),
      pormenores: pormenores.trim(),
      participantes: participantes.map(p => ({
        trabajador: `${p.emp.grado || ''} ${p.emp.nombre || ''}`.trim(),
        dni: p.emp.dni || '',
        fila: p.emp.fila || 0,
        area: p.emp.area || '',
        cambios: p.cambios
      }))
    };
    setGuardando(true);
    setError('');
    try {
      await enviarSolicitudCambio(datos);
      Alert.alert('Enviado', 'La solicitud de cambio de turno fue registrada.');
      if (onEnviado) onEnviado(datos);
    } catch (e) {
      setError('No se pudo enviar la solicitud. Verifique la configuracion.');
    } finally { setGuardando(false); }
  };

  const EditorParticipante = ({ p, idx }) => (
    <View style={s.editor}>
      <View style={[s.participanteHeader, { backgroundColor: idx === 0 ? '#ECFDF5' : '#FFFBEB', borderColor: idx === 0 ? '#A7F3D0' : '#FDE68A' }]}>
        <View style={s.participanteIcon}>{idx === 0 ? <User size={16} color="#047857" /> : <Users size={16} color="#B45309" />}</View>
        <View style={{ flex: 1 }}>
          <Text style={s.participanteName}>{idx === 0 ? 'Solicitante' : 'Companero'}: {p.emp.grado} {p.emp.nombre}</Text>
          <Text style={s.participanteSub}>{p.emp.dni || 'Sin DNI'} - {p.emp.area || 'Sin area'}</Text>
        </View>
        {idx === 1 && <TouchableOpacity onPress={quitarCompanero}><X size={18} color="#EF4444" /></TouchableOpacity>}
      </View>

      <Text style={s.editorLabel}>Horario actual - {MESES[mesAct - 1]} {anioAct}</Text>
      <View style={s.horarioGrid}>
        {DIAS.map(dia => {
          const c = turnoDe(p.emp, dia);
          const cambiado = p.cambios.find(x => x.dia === dia);
          const codigoMostrar = cambiado ? cambiado.nuevo : c;
          const t = TURNO_MAP[codigoMostrar];
          return (
            <View key={dia} style={[s.diaChip, { backgroundColor: cambiado ? '#FFEDD5' : (t ? t.color : '#FFF') }, cambiado && s.diaChipChanged]}>
              <Text style={[s.diaChipNum, { color: cambiado ? '#C2410C' : '#6B7280' }]}>{dia}</Text>
              <Text style={[s.diaChipCode, { color: cambiado ? '#C2410C' : (t ? t.texto : '#D1D5DB') }]}>{codigoMostrar || '-'}</Text>
            </View>
          );
        })}
      </View>

      <View style={s.nuevoCambio}>
        <Text style={s.editorLabel}>Nuevo cambio - {p.emp.grado} {p.emp.nombre}</Text>
        <View style={s.formRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Día</Text>
            <TouchableOpacity style={s.selectBox} onPress={() => setDiaSel(diaSel ? null : 1)} activeOpacity={0.7}>
              <Text style={s.selectText}>{diaSel ? `Día ${diaSel}` : 'Seleccionar'}</Text>
              <ChevronDown size={14} color="#94A3B8" />
            </TouchableOpacity>
            {diaSel && (
              <View style={s.diaPicker}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, padding: 8 }}>
                  {DIAS.map(d => (
                    <TouchableOpacity key={d} style={[s.diaOption, diaSel === d && { backgroundColor: COLOR_PRIMARIO }]} onPress={() => setDiaSel(d)}>
                      <Text style={[s.diaOptionText, diaSel === d && { color: '#FFF' }]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>Nuevo Turno</Text>
            <TouchableOpacity style={s.selectBox} onPress={() => setTurnoNuevo('M')} activeOpacity={0.7}>
              <Text style={s.selectText}>{turnoNuevo ? `${turnoNuevo} - ${TURNO_MAP[turnoNuevo]?.nombre || ''}` : 'Seleccionar'}</Text>
              <ChevronDown size={14} color="#94A3B8" />
            </TouchableOpacity>
            <View style={s.turnoPicker}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, padding: 8 }}>
                <TouchableOpacity style={[s.turnoOption, turnoNuevo === SIN_TURNO_VAL && { backgroundColor: '#E2E8F0' }]} onPress={() => setTurnoNuevo(SIN_TURNO_VAL)}>
                  <Text style={s.turnoOptionText}>S/T - SIN TURNO</Text>
                </TouchableOpacity>
                {TURNOS.map(t => (
                  <TouchableOpacity key={t.codigo} style={[s.turnoOption, { backgroundColor: t.color }, turnoNuevo === t.codigo && s.turnoOptionActive]} onPress={() => setTurnoNuevo(t.codigo)}>
                    <Text style={[s.turnoOptionCode, { color: t.texto }]}>{t.codigo}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
        <TextInput style={s.motivoInput} value={motivoCambio} onChangeText={setMotivoCambio} placeholder="Motivo (opcional)" placeholderTextColor="#94A3B8" />
        <TouchableOpacity style={[s.btnAddCambio, (!diaSel || !turnoNuevo) && { opacity: 0.4 }]} onPress={() => agregarCambio(idx)} disabled={!diaSel || !turnoNuevo}>
          <Text style={s.btnAddCambioText}>+ Agregar Cambio</Text>
        </TouchableOpacity>
      </View>

      {p.cambios.length > 0 && (
        <View>
          <Text style={s.editorLabel}>Cambios pendientes ({p.cambios.length})</Text>
          {p.cambios.map((c, i) => {
            const tA = TURNO_MAP[c.actual];
            const tN = TURNO_MAP[c.nuevo];
            return (
              <View key={i} style={s.cambioRow}>
                <Text style={s.cambioDia}>Día {c.dia}</Text>
                <View style={[s.cambioChip, { backgroundColor: tA?.color || '#F1F5F9' }]}><Text style={{ color: tA?.texto || '#9CA3AF', fontSize: 10, fontWeight: '700' }}>{c.actual || '-'}</Text></View>
                <ArrowRightLeft size={12} color={COLOR_PRIMARIO} />
                <View style={[s.cambioChip, { backgroundColor: tN?.color || '#FFF' }]}><Text style={{ color: tN?.texto || '#334155', fontSize: 10, fontWeight: '700' }}>{c.nuevo}</Text></View>
                <Text style={s.cambioMotivo} numberOfLines={1}>{c.motivo}</Text>
                <TouchableOpacity onPress={() => eliminarCambio(idx, i)}><X size={14} color="#EF4444" /></TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onCancel}><X size={22} color="#FFF" /></TouchableOpacity>
        <GitCompare size={20} color="#FFF" />
        <Text style={s.headerTitle}>Solicitud de Cambio</Text>
        <Text style={s.headerSub}>{MESES[mesAct - 1]} {anioAct}</Text>
      </View>

      <View style={s.stepsRow}>
        {pasos.map((p, i) => (
          <View key={p} style={s.stepItem}>
            <View style={[s.stepDot, i === pasoIdx ? { backgroundColor: COLOR_PRIMARIO } : i < pasoIdx ? { backgroundColor: '#86B7A0' } : { backgroundColor: '#E2E8F0' }]}>
              <Text style={[s.stepDotText, (i === pasoIdx || i < pasoIdx) && { color: '#FFF' }]}>{i < pasoIdx ? '✓' : i + 1}</Text>
            </View>
            <Text style={[s.stepLabel, i === pasoIdx && { color: COLOR_PRIMARIO, fontWeight: '700' }]}>
              {p === 0 ? 'Solicitante' : p === 1 ? 'Companero' : 'Resumen'}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {paso === 0 && (
          <>
            <View style={s.sectionPad}>
              <Text style={s.sectionTitle}>Quien solicita el cambio <Text style={{ color: '#EF4444' }}>*</Text></Text>
              {participantes.length === 0 ? (
                <>
                  <View style={s.searchBox}>
                    <Search size={18} color="#94A3B8" />
                    <TextInput style={s.searchInput} value={busquedaSolicitante} onChangeText={setBusquedaSolicitante} placeholder="Buscar por nombre, grado o DNI..." placeholderTextColor="#94A3B8" />
                  </View>
                  {cargandoPersonal ? <ActivityIndicator size="small" color={COLOR_PRIMARIO} style={{ marginTop: 12 }} /> : (
                    candidatos(busquedaSolicitante).map(emp => (
                      <TouchableOpacity key={emp.id} style={s.personaItem} onPress={() => seleccionarSolicitante(emp)}>
                        <View style={s.personaIcon}><User size={16} color="#64748B" /></View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.personaName}>{emp.grado} {emp.nombre}</Text>
                          <Text style={s.personaSub}>{emp.dni || 'Sin DNI'} - {emp.area || 'Sin area'}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </>
              ) : (
                <EditorParticipante p={participantes[0]} idx={0} />
              )}
            </View>

            <View style={s.sectionPad}>
              <Text style={s.sectionTitle}>Tipo de cambio <Text style={{ color: '#EF4444' }}>*</Text></Text>
              <View style={s.tipoRow}>
                <TouchableOpacity style={[s.tipoModalBtn, modalidad === 'PERSONAL' && s.tipoModalBtnActive]} onPress={() => { setModalidad('PERSONAL'); setParticipantes(prev => prev.slice(0, 1)); setPaso(0); setError(''); }}>
                  <User size={16} color={modalidad === 'PERSONAL' ? COLOR_PRIMARIO : '#6B7280'} />
                  <Text style={[s.tipoModalText, modalidad === 'PERSONAL' && { color: COLOR_PRIMARIO }]}>Personal</Text>
                  <Text style={s.tipoModalSub}>Solo mi cambio</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.tipoModalBtn, modalidad === 'CON COMPANERO' && s.tipoModalBtnActive]} onPress={() => { setModalidad('CON COMPANERO'); setError(''); }}>
                  <Users size={16} color={modalidad === 'CON COMPANERO' ? COLOR_PRIMARIO : '#6B7280'} />
                  <Text style={[s.tipoModalText, modalidad === 'CON COMPANERO' && { color: COLOR_PRIMARIO }]}>Con companero</Text>
                  <Text style={s.tipoModalSub}>Intercambio de turnos</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {paso === 1 && (
          <View style={s.sectionPad}>
            <Text style={s.sectionTitle}>Companero (intercambio) <Text style={{ color: '#EF4444' }}>*</Text></Text>
            {participantes.length < 2 ? (
              <>
                <View style={s.searchBox}>
                  <Search size={18} color="#94A3B8" />
                  <TextInput style={s.searchInput} value={busquedaComp} onChangeText={setBusquedaComp} placeholder="Buscar companero..." placeholderTextColor="#94A3B8" />
                </View>
                {cargandoPersonal ? <ActivityIndicator size="small" color={COLOR_PRIMARIO} style={{ marginTop: 12 }} /> : (
                  candidatos(busquedaComp, participantes.map(p => p.emp.id)).map(emp => (
                    <TouchableOpacity key={emp.id} style={s.personaItem} onPress={() => agregarCompanero(emp)}>
                      <View style={s.personaIcon}><Users size={16} color="#64748B" /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.personaName}>{emp.grado} {emp.nombre}</Text>
                        <Text style={s.personaSub}>{emp.dni || 'Sin DNI'} - {emp.area || 'Sin area'}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </>
            ) : (
              <EditorParticipante p={participantes[1]} idx={1} />
            )}
          </View>
        )}

        {paso === 2 && (
          <View style={s.sectionPad}>
            <View style={s.resumenBox}>
              <Check size={16} color="#047857" />
              <Text style={s.resumenTitle}>Revise los cambios de turno propuestos antes de enviar la solicitud.</Text>
            </View>
            {participantes.map((p, idx) => (
              <View key={p.emp.id} style={s.resumenCard}>
                <Text style={s.resumenName}>{idx === 0 ? 'Solicitante' : 'Companero'}: {p.emp.grado} {p.emp.nombre}</Text>
                {p.cambios.map(c => {
                  const tA = TURNO_MAP[c.actual];
                  const tN = TURNO_MAP[c.nuevo];
                  return (
                    <View key={c.dia} style={s.resumenRow}>
                      <Text style={s.cambioDia}>Día {c.dia}</Text>
                      <View style={[s.cambioChip, { backgroundColor: tA?.color || '#F1F5F9' }]}><Text style={{ color: tA?.texto || '#94A3B8', fontSize: 10, fontWeight: '700' }}>{c.actual || 'S/T'}</Text></View>
                      <ArrowRightLeft size={12} color={COLOR_PRIMARIO} />
                      <View style={[s.cambioChip, { backgroundColor: tN?.color || '#FFF' }]}><Text style={{ color: tN?.texto || '#334155', fontSize: 10, fontWeight: '700' }}>{c.nuevo}</Text></View>
                    </View>
                  );
                })}
              </View>
            ))}

            <Text style={s.fieldLabel}>Motivo justificado <Text style={{ color: '#EF4444' }}>*</Text> ({motivo.trim().length}/10 minimo)</Text>
            <TextInput style={s.motivoInput} value={motivo} onChangeText={setMotivo} placeholder="Detalle el motivo del cambio..." placeholderTextColor="#94A3B8" multiline />
            <Text style={s.fieldLabel}>Pormenores <Text style={{ color: '#EF4444' }}>*</Text></Text>
            <TextInput style={s.motivoInput} value={pormenores} onChangeText={setPormenores} placeholder="Quien autoriza, referencia, documento sustentatorio..." placeholderTextColor="#94A3B8" multiline />
          </View>
        )}

        {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}
        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={s.footerRow}>
        {paso === 0 ? (
          <TouchableOpacity style={s.btnCancel} onPress={onCancel}><Text style={s.btnCancelText}>Cancelar</Text></TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.btnCancel} onPress={atras}><Text style={s.btnCancelText}>Volver</Text></TouchableOpacity>
        )}
        {paso === 2 ? (
          <TouchableOpacity style={[s.btnNext, guardando && { opacity: 0.6 }]} onPress={handleEnviar} disabled={guardando}>
            {guardando ? <ActivityIndicator size="small" color="#FFF" /> : <><Send size={16} color="#FFF" /><Text style={s.btnNextText}>Enviar Solicitud</Text></>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.btnNext, participantes.length === 0 && { opacity: 0.4 }]} onPress={siguiente} disabled={participantes.length === 0}>
            <Text style={s.btnNextText}>Siguiente</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerList: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

  header: { backgroundColor: COLOR_PRIMARIO, flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 50, gap: 10 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#FFF', flex: 1 },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },

  claveRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 8 },
  claveInputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 8 },
  claveInput: { flex: 1, fontSize: 14, color: '#334155' },
  claveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLOR_PRIMARIO, borderRadius: 12, paddingHorizontal: 14, height: 44, gap: 6 },
  claveBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  claveCancel: { padding: 10 },
  claveCancelText: { color: '#64748B', fontSize: 13, fontWeight: '700' },

  tabs: { flexDirection: 'row', backgroundColor: '#FFF', padding: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 12, borderWidth: 2, borderColor: '#F1F5F9', gap: 6 },
  tabActive: { borderColor: COLOR_PRIMARIO, backgroundColor: '#F0FDF6' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#047857' },
  tabCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  tabCountText: { fontSize: 10, fontWeight: '700', color: '#64748B' },

  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, margin: 12, padding: 10 },
  errorText: { fontSize: 13, color: '#EF4444', fontWeight: '500' },

  card: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  cardOpen: { borderColor: '#6EE7B7' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  cardIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  cardSub: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  estadoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  estadoText: { fontSize: 10, fontWeight: '700' },

  cardBody: { padding: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoCell: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 8 },
  infoLabel: { fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '600' },
  infoValue: { fontSize: 11, color: '#374151', fontWeight: '600', marginTop: 2 },

  participante: { backgroundColor: '#F0FDF6', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 10, padding: 10 },
  participanteName: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  participanteSub: { fontSize: 10, color: '#94A3B8', fontWeight: '400' },
  participanteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  participanteLabel: { fontSize: 10, color: '#6B7280' },

  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  chipText: { fontSize: 10, fontWeight: '700' },

  detailBox: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10 },
  detailLabel: { fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '600', marginBottom: 2 },
  detailText: { fontSize: 12, color: '#374151' },

  revisionBox: { borderWidth: 1, borderRadius: 10, padding: 10 },
  revisionTitle: { fontSize: 11, fontWeight: '700' },
  revisionText: { fontSize: 11, color: '#374151', marginTop: 4 },

  obsInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, fontSize: 13, color: '#334155', minHeight: 50, textAlignVertical: 'top' },
  accBtns: { flexDirection: 'row', gap: 8 },
  btnDesaprobar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#FECACA', gap: 6 },
  btnDesaprobarText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  btnAprobar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, backgroundColor: COLOR_PRIMARIO, gap: 6 },
  btnAprobarText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  footer: { backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', padding: 12, paddingBottom: 24 },
  btnRegistrarSolicitud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR_PRIMARIO, height: 50, borderRadius: 14, gap: 8 },
  btnRegistrarSolicitudText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  stepsRow: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  stepItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepDotText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  stepLabel: { fontSize: 11, color: '#9CA3AF' },

  sectionPad: { padding: 12, gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 12, height: 46, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#334155' },

  personaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F1F5F9', gap: 10 },
  personaIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  personaName: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  personaSub: { fontSize: 11, color: '#94A3B8', marginTop: 1 },

  tipoRow: { flexDirection: 'row', gap: 10 },
  tipoModalBtn: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 14, alignItems: 'center', gap: 4 },
  tipoModalBtnActive: { borderColor: COLOR_PRIMARIO, backgroundColor: '#F0FDF6' },
  tipoModalText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  tipoModalSub: { fontSize: 10, color: '#94A3B8' },

  editor: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, padding: 14, gap: 10 },
  participanteHeader: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 10, gap: 10 },
  participanteIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  editorLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 4 },

  horarioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  diaChip: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  diaChipChanged: { borderColor: '#FDBA74', borderWidth: 1.5 },
  diaChipNum: { fontSize: 9 },
  diaChipCode: { fontSize: 10, fontWeight: '700' },

  nuevoCambio: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, gap: 8 },
  formRow: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  selectBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  selectText: { fontSize: 13, color: '#334155' },
  diaPicker: { backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 6 },
  diaOption: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  diaOptionText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  turnoPicker: { backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 6 },
  turnoOption: { minWidth: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 6 },
  turnoOptionActive: { borderWidth: 2, borderColor: '#334155' },
  turnoOptionCode: { fontSize: 11, fontWeight: '800' },
  turnoOptionText: { fontSize: 10, fontWeight: '700', color: '#334155' },
  motivoInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, fontSize: 13, color: '#334155', minHeight: 44 },
  btnAddCambio: { backgroundColor: COLOR_PRIMARIO, borderRadius: 10, padding: 12, alignItems: 'center' },
  btnAddCambioText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  cambioRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74', borderRadius: 10, padding: 8, gap: 8 },
  cambioDia: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  cambioChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  cambioMotivo: { fontSize: 10, color: '#94A3B8', flex: 1 },

  resumenBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 12, padding: 12, gap: 8 },
  resumenTitle: { fontSize: 12, color: '#047857', flex: 1 },
  resumenCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 12, padding: 12, gap: 8 },
  resumenName: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  resumenRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, padding: 8, gap: 8 },

  footerRow: { flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', padding: 12, paddingBottom: 24, gap: 10 },
  btnCancel: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0' },
  btnCancelText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  btnNext: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR_PRIMARIO, padding: 14, borderRadius: 12, gap: 8 },
  btnNextText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});