// app/vacaciones.jsx
// HRPA - Registro de Vacaciones (V) y Permiso a Cuenta de Vacaciones (PCV)
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, TextInput, ScrollView, Alert, Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Search, User, Umbrella, Sun, ChevronLeft, ChevronRight, Save } from 'lucide-react-native';
import { sheetsService } from '../src/services/sheets';
import { COLOR_PRIMARIO, MESES, DEFAULT_GOOGLE_CONFIG } from '../src/constants/config';

const crearFechaLocal = (anio, mes, dia) => {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

const formatearFechaLegible = (fechaStr) => {
  if (!fechaStr) return '';
  const [a, m, d] = fechaStr.split('-');
  return `${d}/${m}/${a}`;
};

export default function VacacionesScreen() {
  const router = useRouter();
  const [personal, setPersonal] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busquedaPersonalInput, setBusquedaPersonalInput] = useState('');
  const [personalSel, setPersonalSel] = useState(null);
  const [tipo, setTipo] = useState('V');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const hoy = new Date();
  const [mesCal, setMesCal] = useState(hoy.getMonth());
  const [anioCal, setAnioCal] = useState(hoy.getFullYear());
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [seleccionando, setSeleccionando] = useState('inicio');

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      let hoja = DEFAULT_GOOGLE_CONFIG.sheetName;
      try {
        const mesActivo = await sheetsService.obtenerMesActivo();
        if (mesActivo) hoja = mesActivo;
      } catch (e) {}
      const mapa = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 };
      const hojas = await sheetsService.obtenerHojas();
      const hojaReal = hojas.find(h => String(h).toUpperCase().includes((hoja || 'AGOSTO').toUpperCase())) || hoja;
      const mesNum = mapa[(hoja || 'AGOSTO').toUpperCase()] || hoy.getMonth() + 1;
      const data = await sheetsService.cargarPersonal(hojaReal, mesNum, hoy.getFullYear());
      setPersonal(data);
    } catch (e) { Alert.alert('Error', 'No se pudo conectar con Google Sheets'); }
    finally { setCargando(false); }
  };

  const totalDias = useMemo(() => new Date(anioCal, mesCal + 1, 0).getDate(), [mesCal, anioCal]);
  const primerDiaSemana = useMemo(() => new Date(anioCal, mesCal, 1).getDay(), [mesCal, anioCal]);
  const hoyStr = crearFechaLocal(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const personalFiltrado = useMemo(() => {
    if (!busquedaPersonalInput.trim()) return personal.slice(0, 30);
    const t = busquedaPersonalInput.toLowerCase().trim();
    return personal.filter(p =>
      (p.nombre || '').toLowerCase().includes(t) ||
      (p.grado || '').toLowerCase().includes(t) ||
      (p.dni || '').includes(t)
    ).slice(0, 30);
  }, [personal, busquedaPersonalInput]);

  const mesAnterior = () => {
    if (mesCal === 0) { setMesCal(11); setAnioCal(a => a - 1); }
    else setMesCal(m => m - 1);
    setSeleccionando('inicio');
  };

  const mesSiguiente = () => {
    if (mesCal === 11) { setMesCal(0); setAnioCal(a => a + 1); }
    else setMesCal(m => m + 1);
    setSeleccionando('inicio');
  };

  const handleClickDia = (dia) => {
    const fechaDia = crearFechaLocal(anioCal, mesCal, dia);
    setError('');
    if (seleccionando === 'inicio') {
      setFechaInicio(fechaDia);
      setFechaFin(null);
      setSeleccionando('fin');
    } else {
      if (fechaInicio && fechaDia < fechaInicio) {
        setFechaFin(fechaInicio);
        setFechaInicio(fechaDia);
      } else {
        setFechaFin(fechaDia);
      }
      setSeleccionando('inicio');
    }
  };

  const diasVacaciones = useMemo(() => {
    if (!fechaInicio || !fechaFin) return 0;
    const [ai, mi, di] = fechaInicio.split('-').map(Number);
    const [af, mf, df] = fechaFin.split('-').map(Number);
    const inicio = new Date(ai, mi - 1, di);
    const fin = new Date(af, mf - 1, df);
    const diasCalendario = Math.round((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diasCalendario - 1);
  }, [fechaInicio, fechaFin]);

  const diaEnRango = (dia) => {
    if (!fechaInicio || !fechaFin) return false;
    const fechaDia = crearFechaLocal(anioCal, mesCal, dia);
    return fechaDia >= fechaInicio && fechaDia <= fechaFin;
  };

  const esDiaExtremo = (dia) => {
    const fechaDia = crearFechaLocal(anioCal, mesCal, dia);
    return fechaDia === fechaInicio || fechaDia === fechaFin;
  };

  const resetForm = () => {
    setPersonalSel(null); setTipo('V'); setFechaInicio(null); setFechaFin(null);
    setObservaciones(''); setError(''); setSeleccionando('inicio');
    setBusquedaPersonalInput(''); setMesCal(hoy.getMonth()); setAnioCal(hoy.getFullYear());
  };

  const handleRegistrar = async () => {
    Keyboard.dismiss();
    if (!personalSel) { setError('Seleccione el personal'); return; }
    if (!fechaInicio || !fechaFin) { setError('Seleccione las fechas en el calendario'); return; }
    if (diasVacaciones <= 0) { setError('La fecha de fin debe ser posterior a la de inicio'); return; }

    setGuardando(true);
    setError('');
    try {
      const vacaciones = {
        personal_id: personalSel.id,
        personal_nombre: personalSel.nombre,
        personal_grado: personalSel.grado,
        personal_dni: personalSel.dni,
        personal_area: personalSel.area,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        dias_vacaciones: diasVacaciones,
        tipo,
        codigo: tipo,
        observaciones: observaciones || 'Sin observaciones',
        registrado_por: 'Sistema PNP'
      };
      const res = await sheetsService.registrarVacaciones(vacaciones);
      if (res.success) {
        Alert.alert('Exito', res.mensaje);
        resetForm();
      } else {
        setError(res.error || 'No se pudo registrar');
      }
    } catch (e) {
      setError('No se pudo registrar las vacaciones');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLOR_PRIMARIO} /></View>;
  }

  if (personalSel) {
    const color = tipo === 'V' ? '#EF4444' : '#3B82F6';
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => { resetForm(); }}><X size={22} color="#FFF" /></TouchableOpacity>
          <Umbrella size={20} color="#FFF" />
          <Text style={s.headerTitle}>Registrar Vacaciones</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.seleccionCard}>
            <View style={s.avatar}><User size={24} color="#64748B" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.seleccionGrado}>{personalSel.grado}</Text>
              <Text style={s.seleccionNombre}>{personalSel.nombre}</Text>
              <Text style={s.seleccionSub}>{personalSel.dni} · {personalSel.area}</Text>
            </View>
            <TouchableOpacity onPress={() => setPersonalSel(null)}><X size={20} color="#EF4444" /></TouchableOpacity>
          </View>

          <Text style={s.label}>Tipo de Registro</Text>
          <View style={s.tipoRow}>
            <TouchableOpacity style={[s.tipoBtn, tipo === 'V' && { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }]} onPress={() => setTipo('V')} activeOpacity={0.7}>
              <View style={[s.tipoIcon, { backgroundColor: tipo === 'V' ? '#EF4444' : '#E5E7EB' }]}><Umbrella size={16} color={tipo === 'V' ? '#FFF' : '#6B7280'} /></View>
              <Text style={[s.tipoTitle, tipo === 'V' && { color: '#B91C1C' }]}>Vacaciones</Text>
              <Text style={s.tipoSub}>Codigo: V</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tipoBtn, tipo === 'PCV' && { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }]} onPress={() => setTipo('PCV')} activeOpacity={0.7}>
              <View style={[s.tipoIcon, { backgroundColor: tipo === 'PCV' ? '#3B82F6' : '#E5E7EB' }]}><Sun size={16} color={tipo === 'PCV' ? '#FFF' : '#6B7280'} /></View>
              <Text style={[s.tipoTitle, tipo === 'PCV' && { color: '#1D4ED8' }]}>Cuenta de Vac.</Text>
              <Text style={s.tipoSub}>Codigo: PCV</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>{seleccionando === 'inicio' ? 'Seleccione FECHA INICIO' : 'Seleccione FECHA FIN'}</Text>
          <View style={s.fechasRow}>
            <View style={[s.fechaBox, fechaInicio && { borderColor: color, backgroundColor: '#F0FDF6' }]}><Text style={fechaInicio ? { color: color, fontWeight: '700', fontSize: 13 } : s.fechaText}>{fechaInicio ? formatearFechaLegible(fechaInicio) : 'Inicio'}</Text></View>
            <Text style={s.fechaSep}>-</Text>
            <View style={[s.fechaBox, fechaFin && { borderColor: color, backgroundColor: '#F0FDF6' }]}><Text style={fechaFin ? { color: color, fontWeight: '700', fontSize: 13 } : s.fechaText}>{fechaFin ? formatearFechaLegible(fechaFin) : 'Fin'}</Text></View>
          </View>

          <View style={s.calTop}>
            <TouchableOpacity onPress={mesAnterior}><ChevronLeft size={22} color="#FFF" /></TouchableOpacity>
            <Text style={s.calMes}>{MESES[mesCal]} {anioCal}</Text>
            <TouchableOpacity onPress={mesSiguiente}><ChevronRight size={22} color="#FFF" /></TouchableOpacity>
          </View>
          <View style={s.calGrid}>
            <View style={s.calHeaderRow}>
              {['D','L','M','M','J','V','S'].map((d, i) => (
                <View key={i} style={s.calHeaderCell}><Text style={[s.calHeaderText, i === 0 && { color: '#FCA5A5' }]}>{d}</Text></View>
              ))}
            </View>
            {Array.from({ length: Math.ceil((totalDias + primerDiaSemana) / 7) }).map((_, wi) => {
              let diaNum = wi * 7 - primerDiaSemana + 1;
              return (
                <View key={wi} style={s.calRow}>
                  {Array.from({ length: 7 }).map((_, di) => {
                    const vacio = diaNum < 1 || diaNum > totalDias;
                    const fechaDia = vacio ? '' : crearFechaLocal(anioCal, mesCal, diaNum);
                    const extremo = !vacio && esDiaExtremo(diaNum);
                    const enRango = !vacio && diaEnRango(diaNum);
                    const esHoy = fechaDia === hoyStr;
                    const cellDia = diaNum;
                    diaNum++;
                    return (
                      <View key={di} style={s.calCell}>
                        {!vacio && (
                          <TouchableOpacity
                            style={[s.calDiaBox,
                              extremo && { backgroundColor: color },
                              enRango && !extremo && (tipo === 'V' ? { backgroundColor: '#FEE2E2' } : { backgroundColor: '#DBEAFE' }),
                              esHoy && !extremo && { borderWidth: 2, borderColor: color }
                            ]}
                            onPress={() => handleClickDia(cellDia)} activeOpacity={0.7}
                          >
                            <Text style={[s.calDiaNum, extremo && { color: '#FFF' }, enRango && !extremo && { color }]}>{cellDia}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>

          {diasVacaciones > 0 && (
            <View style={[s.diasBox, { borderColor: tipo === 'V' ? '#FECACA' : '#BFDBFE' }]}>
              <Text style={[s.diasText, { color: tipo === 'V' ? '#B91C1C' : '#1D4ED8' }]}><Text style={{ fontWeight: '800' }}>{diasVacaciones} dia(s)</Text> de {tipo === 'V' ? 'vacaciones' : 'permiso a cuenta de vacaciones'}</Text>
              <Text style={[s.diasSub, { color: tipo === 'V' ? '#EF4444' : '#3B82F6' }]}>Del {formatearFechaLegible(fechaInicio)} al {formatearFechaLegible(fechaFin)}</Text>
            </View>
          )}

          <Text style={s.label}>Observaciones</Text>
          <TextInput
            style={s.input}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Periodo vacacional, destino, autorizacion..."
            placeholderTextColor="#94A3B8"
            multiline
          />

          {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

          <TouchableOpacity style={[s.btnRegistrar, (guardando) && { opacity: 0.6 }]} onPress={handleRegistrar} disabled={guardando}>
            {guardando ? <ActivityIndicator size="small" color="#FFF" /> : <><Save size={18} color="#FFF" /><Text style={s.btnRegistrarText}>Registrar Vacaciones</Text></>}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><X size={22} color="#FFF" /></TouchableOpacity>
        <Umbrella size={20} color="#FFF" />
        <Text style={s.headerTitle}>Registro de Vacaciones</Text>
      </View>

      <View style={s.searchBox}>
        <Search size={18} color="#94A3B8" />
        <TextInput style={s.searchInput} value={busquedaPersonalInput} onChangeText={setBusquedaPersonalInput}
          placeholder="Buscar por nombre, grado o DNI..." placeholderTextColor="#94A3B8" />
        {busquedaPersonalInput ? <TouchableOpacity onPress={() => setBusquedaPersonalInput('')}><X size={18} color="#94A3B8" /></TouchableOpacity> : null}
      </View>

      <FlatList
        data={personalFiltrado}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => setPersonalSel(item)} activeOpacity={0.7}>
            <View style={s.avatar}><User size={24} color="#64748B" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardGrado}>{item.grado}</Text>
              <Text style={s.cardNombre}>{item.nombre}</Text>
              <Text style={s.cardInfo}>{item.dni} · {item.area}</Text>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },

  header: { backgroundColor: COLOR_PRIMARIO, flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 50, gap: 10 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#FFF', flex: 1 },

  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#334155' },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F1F5F9', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  cardGrado: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  cardNombre: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginTop: 1 },
  cardInfo: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  seleccionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 14, margin: 12, borderWidth: 1, borderColor: '#F1F5F9', gap: 12 },
  seleccionGrado: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  seleccionNombre: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  seleccionSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  label: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: 12, marginTop: 14, marginBottom: 6 },

  tipoRow: { flexDirection: 'row', marginHorizontal: 12, gap: 10 },
  tipoBtn: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 2, borderColor: '#E5E7EB', padding: 14, alignItems: 'center' },
  tipoIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tipoTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  tipoSub: { fontSize: 10, color: '#94A3B8', marginTop: 2 },

  fechasRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, gap: 8 },
  fechaBox: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', alignItems: 'center' },
  fechaText: { fontSize: 13, color: '#94A3B8' },
  fechaSep: { fontSize: 16, color: '#CBD5E1' },

  calTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLOR_PRIMARIO, marginHorizontal: 12, marginTop: 10, padding: 12, borderRadius: 14 },
  calMes: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  calGrid: { backgroundColor: '#FFF', marginHorizontal: 12, marginTop: 6, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  calHeaderRow: { flexDirection: 'row' },
  calHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  calHeaderText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  calRow: { flexDirection: 'row' },
  calCell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  calDiaBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  calDiaNum: { fontSize: 13, fontWeight: '600', color: '#334155' },

  diasBox: { borderWidth: 1, borderRadius: 12, margin: 12, padding: 12, backgroundColor: '#FEF3C7' },
  diasText: { fontSize: 13, color: '#B45309' },
  diasSub: { fontSize: 11, marginTop: 2 },

  input: { backgroundColor: '#FFF', marginHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, fontSize: 13, color: '#334155', minHeight: 60, textAlignVertical: 'top' },

  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, margin: 12, padding: 10 },
  errorText: { fontSize: 13, color: '#EF4444', fontWeight: '500' },

  btnRegistrar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR_PRIMARIO, height: 50, borderRadius: 14, marginHorizontal: 12, marginTop: 16, gap: 8 },
  btnRegistrarText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});