// app/index.jsx
// HRPA - Pantalla de Acceso - CON ESCUDO LOCAL
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, Animated, Modal, Keyboard, ScrollView, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Shield, MapPin, User, ChevronDown, 
  LogIn, X, Building2, Eye, Key, FileText, Umbrella, GitCompare, CalendarDays
} from 'lucide-react-native';
import { sheetsService } from '../src/services/sheets';
import { COLOR_PRIMARIO, DEFAULT_GOOGLE_CONFIG } from '../src/constants/config';

export default function LoginScreen() {
  const router = useRouter();
  const [areas, setAreas] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [areaSel, setAreaSel] = useState('');
  const [respSel, setRespSel] = useState('');
  const [cargando, setCargando] = useState(true);
  const [areaTexto, setAreaTexto] = useState('');
  const [respTexto, setRespTexto] = useState('');
  const [dropdownArea, setDropdownArea] = useState(false);
  const [dropdownResp, setDropdownResp] = useState(false);
  const [modalAdmin, setModalAdmin] = useState(false);
  const [claveAdmin, setClaveAdmin] = useState('');
  const [claveError, setClaveError] = useState('');
  const [mesActivo, setMesActivo] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    cargarDatos();
    (async () => {
      try {
        const m = await sheetsService.obtenerMesActivo();
        if (m) setMesActivo(m);
      } catch (e) {}
    })();
  }, []);

  const cargarDatos = async () => {
    try {
      let hoja = DEFAULT_GOOGLE_CONFIG.sheetName;
      let mesNum = new Date().getMonth() + 1;
      try {
        const m = await sheetsService.obtenerMesActivo();
        if (m) {
          hoja = m;
          const mapa = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 };
          if (mapa[m.toUpperCase()]) mesNum = mapa[m.toUpperCase()];
        }
      } catch (e) {}
      const hojas = await sheetsService.obtenerHojas();
      const hojaReal = hojas.find(h => String(h).toUpperCase().includes((hoja || 'AGOSTO').toUpperCase())) || hoja;
      const data = await sheetsService.cargarPersonal(hojaReal, mesNum, new Date().getFullYear());
      setAreas([...new Set(data.map(p => p.area).filter(Boolean))].sort());
      setResponsables(data.filter(p => p.nombre).map(p => ({ nombre: p.nombre, grado: p.grado, area: p.area })));
    } catch (e) { Alert.alert('Error', 'No se pudo conectar con Google Sheets'); }
    finally { setCargando(false); }
  };

  const handleAdminAccess = () => {
    if (claveAdmin === 'R3curs*sHum@n*s') {
      setModalAdmin(false); setClaveAdmin(''); setClaveError('');
      router.push({ pathname: '/admin' });
    } else { setClaveError('Clave incorrecta'); setClaveAdmin(''); }
  };

  const cerrarDropdowns = () => {
    setDropdownArea(false);
    setDropdownResp(false);
    Keyboard.dismiss();
  };

  const normTexto = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const areasFiltradas = areaTexto ? areas.filter(a => normTexto(a).includes(normTexto(areaTexto))) : areas;
  const respFiltrados = respTexto ? responsables.filter(r => normTexto(r.nombre).includes(normTexto(respTexto)) || normTexto(r.grado).includes(normTexto(respTexto))) : responsables;

  const areaEfectiva = areaSel || (areas.find(a => normTexto(a) === normTexto(areaTexto)) || '');
  const respEfectivo = respSel || (responsables.find(r => normTexto(r.nombre) === normTexto(respTexto))?.nombre || '');

  if (cargando) {
    return (
      <View style={s.loading}><ActivityIndicator size="large" color={COLOR_PRIMARIO} /><Text style={s.loadingText}>Conectando con el sistema</Text></View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={cerrarDropdowns}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER CON ESCUDO LOCAL Y MES ACTIVO */}
        <Animated.View style={[s.header, { opacity: fadeAnim }]}>
          <View style={s.logoContainer}>
            <Image 
              source={require('../assets/Escudo Sanidad.png')}
              style={{ width: 55, height: 55, resizeMode: 'contain' }}
            />
          </View>
          <Text style={s.title}>Rol de Servicio PNP</Text>
          <Text style={s.subtitle}>Hospital Regional Policial Arequipa</Text>
          <View style={s.mesChip}>
            <CalendarDays size={13} color={COLOR_PRIMARIO} strokeWidth={1.5} />
            <Text style={s.mesChipText}>Hoja activa: {mesActivo || DEFAULT_GOOGLE_CONFIG.sheetName || 'AGOSTO'}</Text>
          </View>
        </Animated.View>

        {/* ACCESO */}
        <Animated.View style={[s.card, { opacity: fadeAnim }, (dropdownArea || dropdownResp) ? s.cardElevado : null]}>
          <Text style={s.cardTitle}>Acceso al sistema</Text>
          <Text style={s.cardSub}>Seleccione su área y responsable para ver el rol de servicio</Text>

          <Text style={s.label}>Área de Servicio</Text>
          <View style={[s.dropWrap, dropdownArea && s.dropWrapOpen]}>
            <View style={[s.combo, dropdownArea && s.comboOpen]}>
              <MapPin size={20} color={areaSel ? COLOR_PRIMARIO : '#94A3B8'} strokeWidth={1.5} />
              <TextInput
                style={s.comboInput}
                value={areaTexto}
                onChangeText={(t) => { setAreaTexto(t); setDropdownArea(true); setDropdownResp(false); if (t !== areaSel) setAreaSel(''); }}
                onFocus={() => { setDropdownArea(true); setDropdownResp(false); }}
                placeholder="Escriba o seleccione el área..."
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {areaTexto ? <TouchableOpacity onPress={() => { setAreaTexto(''); setAreaSel(''); }}><X size={16} color="#94A3B8" /></TouchableOpacity> : <ChevronDown size={18} color="#CBD5E1" />}
            </View>
            {dropdownArea && (
              <View style={s.dropdown}>
                <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {areasFiltradas.slice(0, 50).map(item => (
                    <TouchableOpacity key={item} style={[s.dropItem, areaSel === item && s.dropItemActive]} onPress={() => { setAreaSel(item); setAreaTexto(item); setDropdownArea(false); }}>
                      <MapPin size={16} color={areaSel === item ? COLOR_PRIMARIO : '#94A3B8'} /><Text style={[s.dropText, areaSel === item && s.dropTextActive]} numberOfLines={2}>{item}</Text>{areaSel === item && <View style={s.dot} />}
                    </TouchableOpacity>
                  ))}
                  {areasFiltradas.length === 0 && <Text style={s.dropEmpty}>Sin resultados para "{areaTexto}"</Text>}
                </ScrollView>
              </View>
            )}
          </View>

<Text style={s.label}>Responsable</Text>
          <View style={[s.dropWrap, dropdownResp && s.dropWrapOpen]}>
            <View style={[s.combo, dropdownResp && s.comboOpen]}>
              <User size={20} color={respSel ? COLOR_PRIMARIO : '#94A3B8'} strokeWidth={1.5} />
              <TextInput
                style={s.comboInput}
                value={respTexto}
                onChangeText={(t) => { setRespTexto(t); setDropdownResp(true); setDropdownArea(false); if (t !== respSel) setRespSel(''); }}
                onFocus={() => { setDropdownResp(true); setDropdownArea(false); }}
                placeholder="Escriba o seleccione el responsable..."
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {respTexto ? <TouchableOpacity onPress={() => { setRespTexto(''); setRespSel(''); }}><X size={16} color="#94A3B8" /></TouchableOpacity> : <ChevronDown size={18} color="#CBD5E1" />}
            </View>
            {dropdownResp && (
              <View style={s.dropdown}>
                <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {respFiltrados.slice(0, 50).map((item, i) => (
                    <TouchableOpacity key={i} style={[s.dropItem, respSel === item.nombre && s.dropItemActive]} onPress={() => { setRespSel(item.nombre); setRespTexto(item.nombre); setDropdownResp(false); }}>
                      <User size={16} color={respSel === item.nombre ? COLOR_PRIMARIO : '#94A3B8'} /><View style={{ flex: 1 }}><Text style={[s.dropText, respSel === item.nombre && s.dropTextActive]}>{item.nombre}</Text><Text style={s.dropSub}>{item.grado} · {item.area}</Text></View>{respSel === item.nombre && <View style={s.dot} />}
                    </TouchableOpacity>
                  ))}
                  {respFiltrados.length === 0 && <Text style={s.dropEmpty}>Sin resultados para "{respTexto}"</Text>}
                </ScrollView>
              </View>
            )}
          </View>

          <TouchableOpacity style={[s.btnPrimary, (!areaEfectiva || !respEfectivo) && s.btnDisabled]}
            onPress={() => {
              if (!areaEfectiva) return Alert.alert('Validación', 'Escriba o seleccione un área');
              if (!respEfectivo) return Alert.alert('Validación', 'Escriba o seleccione un responsable');
              router.push({ pathname: '/home', params: { area: areaEfectiva, responsable: respEfectivo } });
            }} activeOpacity={0.8} disabled={!areaEfectiva || !respEfectivo}>
            <LogIn size={20} color="#FFF" strokeWidth={2} /><Text style={s.btnPrimaryText}>Ver mi rol de servicio</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* MÓDULOS */}
        <Animated.View style={[s.menuSection, { opacity: fadeAnim }]}>
          <Text style={s.menuTitle}>Gestión</Text>
          <View style={s.modulosRow}>
            <TouchableOpacity style={s.moduloBtn} onPress={() => router.push('/parte')} activeOpacity={0.7}>
              <View style={[s.moduloIcon, { backgroundColor: '#F0FDF6' }]}><FileText size={22} color={COLOR_PRIMARIO} strokeWidth={1.5} /></View>
              <Text style={s.moduloTitle}>Parte Diario</Text><Text style={s.moduloSub}>Visor + PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.moduloBtn} onPress={() => router.push('/consulta')} activeOpacity={0.7}>
              <View style={[s.moduloIcon, { backgroundColor: '#F0FDF6' }]}><Eye size={22} color={COLOR_PRIMARIO} strokeWidth={1.5} /></View>
              <Text style={s.moduloTitle}>Consultar Turnos</Text><Text style={s.moduloSub}>Ver horarios</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.moduloBtn} onPress={() => router.push('/descanso')} activeOpacity={0.7}>
              <View style={[s.moduloIcon, { backgroundColor: '#FEF2F2' }]}><FileText size={22} color="#DC2626" strokeWidth={1.5} /></View>
              <Text style={s.moduloTitle}>Descanso Médico</Text><Text style={s.moduloSub}>Registrar nuevo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.moduloBtn} onPress={() => router.push('/vacaciones')} activeOpacity={0.7}>
              <View style={[s.moduloIcon, { backgroundColor: '#FFFBEB' }]}><Umbrella size={22} color="#D97706" strokeWidth={1.5} /></View>
              <Text style={s.moduloTitle}>Vacaciones</Text><Text style={s.moduloSub}>V / PCV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.moduloBtn} onPress={() => router.push('/solicitudes')} activeOpacity={0.7}>
              <View style={[s.moduloIcon, { backgroundColor: '#F0FDF6' }]}><GitCompare size={22} color={COLOR_PRIMARIO} strokeWidth={1.5} /></View>
              <Text style={s.moduloTitle}>Cambios de Turno</Text><Text style={s.moduloSub}>Solicitudes</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ADMIN */}
        <Animated.View style={[s.adminWrap, { opacity: fadeAnim }]}>
          <TouchableOpacity style={s.btnAdmin} onPress={() => setModalAdmin(true)} activeOpacity={0.7}>
            <View style={[s.moduloIcon, { backgroundColor: '#FFFBEB', width: 36, height: 36, borderRadius: 10 }]}><Shield size={18} color="#D97706" strokeWidth={1.5} /></View>
            <View style={{ flex: 1 }}><Text style={s.btnAdminTitle}>Acceso Administrador</Text><Text style={s.btnAdminSub}>Panel de control y bloqueos</Text></View>
            <ChevronDown size={16} color="#D97706" style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
          <View style={s.footer}><Building2 size={14} color="#94A3B8" /><Text style={s.footerText}>Sistema de Gestión PNP · {mesActivo || DEFAULT_GOOGLE_CONFIG.sheetName || 'AGOSTO'}</Text></View>
        </Animated.View>
      </ScrollView>

      <Modal visible={modalAdmin} transparent animationType="slide" onRequestClose={() => { setModalAdmin(false); setClaveAdmin(''); setClaveError(''); }}>
        <View style={s.adminOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setModalAdmin(false); setClaveAdmin(''); setClaveError(''); }} />
          <View style={s.adminCard}>
            <View style={s.adminHeader}><View style={s.adminIconCircle}><Shield size={28} color="#FFF" strokeWidth={1.5} /></View><Text style={s.adminTitle}>Acceso Administrador</Text><Text style={s.adminSub}>Ingrese la clave de seguridad del sistema</Text></View>
            <View style={s.adminBody}>
              <View style={s.adminInputContainer}><Key size={18} color="#94A3B8" strokeWidth={1.5} /><TextInput style={s.adminInput} value={claveAdmin} onChangeText={(t) => { setClaveAdmin(t); setClaveError(''); }} placeholder="••••••••••••" placeholderTextColor="#CBD5E1" secureTextEntry autoFocus textAlign="center" /></View>
              {claveError ? <View style={s.errorBox}><X size={14} color="#EF4444" /><Text style={s.errorText}>{claveError}</Text></View> : null}
              <View style={s.adminBtns}><TouchableOpacity style={s.adminBtnCancel} onPress={() => { setModalAdmin(false); setClaveAdmin(''); setClaveError(''); }}><Text style={s.adminBtnCancelText}>Cancelar</Text></TouchableOpacity><TouchableOpacity style={[s.adminBtnOk, !claveAdmin && { opacity: 0.4 }]} onPress={handleAdminAccess} disabled={!claveAdmin}><Text style={s.adminBtnOkText}>Ingresar</Text></TouchableOpacity></View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { fontSize: 16, color: '#475569', fontWeight: '600', marginTop: 16 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  header: { alignItems: 'center', marginTop: 12, marginBottom: 16 },
  mesChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF6', borderWidth: 1, borderColor: '#D1FAE5', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10 },
  mesChipText: { fontSize: 12, color: COLOR_PRIMARIO, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 12, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '500', textAlign: 'center' },
  logoContainer: { 
    width: 90, height: 90, borderRadius: 25, backgroundColor: '#FFF', 
    alignItems: 'center', justifyContent: 'center', 
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, 
    borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' 
  },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  cardElevado: { zIndex: 60, elevation: 24 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  cardSub: { fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 17 },
  menuSection: { marginTop: 22 },
  menuTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  adminWrap: { marginTop: 20 },
  label: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  dropWrap: { zIndex: 0 },
  dropWrapOpen: { zIndex: 40, elevation: 12 },
  combo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, height: 52, gap: 10 },
  comboOpen: { borderColor: COLOR_PRIMARIO, backgroundColor: '#FFF' },
  comboInput: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '500', padding: 0 },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 8, zIndex: 999 },
  dropEmpty: { padding: 14, fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  dropItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  dropItemActive: { backgroundColor: '#F0FDF6' },
  dropText: { flex: 1, fontSize: 13, color: '#334155', fontWeight: '500' },
  dropTextActive: { color: COLOR_PRIMARIO, fontWeight: '700' },
  dropSub: { fontSize: 10, color: '#94A3B8', marginTop: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLOR_PRIMARIO },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR_PRIMARIO, height: 52, borderRadius: 16, marginTop: 20, gap: 8, shadowColor: COLOR_PRIMARIO, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3 },
  btnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modulosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moduloBtn: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
  moduloIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  moduloTitle: { fontSize: 12, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  moduloSub: { fontSize: 10, color: '#94A3B8', marginTop: 2, textAlign: 'center' },
  btnAdmin: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 14, padding: 12, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
  btnAdminTitle: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  btnAdminSub: { fontSize: 11, color: '#A16207' },
  footer: { alignItems: 'center', paddingVertical: 18, flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginLeft: 6 },
  adminOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  adminCard: { backgroundColor: '#FFF', borderRadius: 24, width: '100%', maxWidth: 360, overflow: 'hidden' },
  adminHeader: { backgroundColor: COLOR_PRIMARIO, padding: 24, alignItems: 'center' },
  adminIconCircle: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  adminTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  adminSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  adminBody: { padding: 20 },
  adminInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, height: 52, gap: 10 },
  adminInput: { flex: 1, fontSize: 18, color: '#1E293B', fontWeight: '600', letterSpacing: 2 },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 10, borderRadius: 10, marginTop: 12, gap: 6 },
  errorText: { fontSize: 13, color: '#EF4444', fontWeight: '500' },
  adminBtns: { flexDirection: 'row', marginTop: 20, gap: 10 },
  adminBtnCancel: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center' },
  adminBtnCancelText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  adminBtnOk: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: COLOR_PRIMARIO, alignItems: 'center' },
  adminBtnOkText: { fontSize: 14, color: '#FFF', fontWeight: '700' },
});