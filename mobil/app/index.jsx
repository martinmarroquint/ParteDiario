// app/index.jsx
// HRPA - Pantalla de Login - Autenticación JWT con FastAPI Backend
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, Animated, Modal, Keyboard, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, User, LogIn, X, Building2, Key, Lock } from 'lucide-react-native';
import { authService } from '../src/services/authService';
import { COLOR_PRIMARIO } from '../src/constants/config';

export default function LoginScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(true);
  const [iniciandoSesion, setIniciandoSesion] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    verificarSesion();
  }, []);

  const verificarSesion = async () => {
    try {
      const isAuth = await authService.isAuthenticated();
      if (isAuth) {
        const result = await authService.verifyToken();
        if (result.success) {
          navegarSegunRol(result.usuario);
          return;
        }
      }
    } catch (e) {}
    setCargando(false);
  };

  const navegarSegunRol = (user) => {
    const esAdmin = user.roles?.includes(4);
    if (esAdmin) {
      router.replace('/admin');
    } else {
      // Para usuarios normales, ir a home con sus areas
      const areas = user.areas?.join(', ') || '';
      router.replace({ pathname: '/home', params: { area: areas || 'TODAS', responsable: user.nombre || '' } });
    }
  };

  const handleLogin = async () => {
    if (!usuario.trim()) return Alert.alert('Validación', 'Ingrese su usuario');
    if (!password.trim()) return Alert.alert('Validación', 'Ingrese su contraseña');

    setIniciandoSesion(true);
    setError('');

    try {
      const result = await authService.login(usuario.trim(), password);

      if (result.success) {
        navegarSegunRol(result.usuario);
      } else {
        setError(result.error || 'Credenciales incorrectas');
      }
    } catch (e) {
      setError('Error de conexión. Verifique que el servidor esté disponible.');
    } finally {
      setIniciandoSesion(false);
    }
  };

  if (cargando) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={COLOR_PRIMARIO} />
        <Text style={s.loadingText}>Verificando sesión...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <Animated.View style={[s.container, { opacity: fadeAnim }]}>
        {/* HEADER */}
        <View style={s.header}>
          <View style={s.logoContainer}>
            <Image
              source={require('../assets/Escudo Sanidad.png')}
              style={{ width: 55, height: 55, resizeMode: 'contain' }}
            />
          </View>
          <Text style={s.title}>Rol de Servicio PNP</Text>
          <Text style={s.subtitle}>Hospital Regional Policial Arequipa</Text>
        </View>

        {/* FORMULARIO DE LOGIN */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Iniciar Sesión</Text>
          <Text style={s.cardSub}>Ingrese sus credenciales para acceder al sistema</Text>

          <Text style={s.label}>Usuario</Text>
          <View style={s.inputContainer}>
            <User size={18} color="#94A3B8" strokeWidth={1.5} />
            <TextInput
              style={s.input}
              value={usuario}
              onChangeText={(t) => { setUsuario(t); setError(''); }}
              placeholder="Ej: jperez"
              placeholderTextColor="#CBD5E1"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
            />
          </View>

          <Text style={s.label}>Contraseña</Text>
          <View style={s.inputContainer}>
            <Lock size={18} color="#94A3B8" strokeWidth={1.5} />
            <TextInput
              style={s.input}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              placeholder="••••••••"
              placeholderTextColor="#CBD5E1"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={s.showPasswordText}>{showPassword ? 'Ocultar' : 'Ver'}</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={s.errorBox}>
              <X size={14} color="#EF4444" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.btnPrimary, (!usuario || !password || iniciandoSesion) && s.btnDisabled]}
            onPress={handleLogin}
            disabled={!usuario || !password || iniciandoSesion}
            activeOpacity={0.8}
          >
            {iniciandoSesion ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <LogIn size={20} color="#FFF" strokeWidth={2} />
                <Text style={s.btnPrimaryText}>Ingresar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* INFO */}
        <View style={s.infoSection}>
          <View style={s.infoCard}>
            <Shield size={16} color="#D97706" strokeWidth={1.5} />
            <Text style={s.infoText}>
              Los usuarios son creados por el administrador del sistema. Si olvidó su contraseña, contacte al administrador.
            </Text>
          </View>
        </View>

        <View style={s.footer}>
          <Building2 size={14} color="#94A3B8" />
          <Text style={s.footerText}>Sistema de Gestión PNP · v2.0</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { fontSize: 16, color: '#475569', fontWeight: '600', marginTop: 16 },
  header: { alignItems: 'center', marginBottom: 24 },
  logoContainer: {
    width: 90, height: 90, borderRadius: 25, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden'
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 12, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '500', textAlign: 'center' },
  card: {
    backgroundColor: '#FFF', borderRadius: 24, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  cardSub: { fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 17 },
  label: {
    fontSize: 11, fontWeight: '700', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 6
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14,
    paddingHorizontal: 14, height: 52, gap: 10
  },
  input: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '500', padding: 0 },
  showPasswordText: { fontSize: 12, color: COLOR_PRIMARIO, fontWeight: '600' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2',
    padding: 10, borderRadius: 10, marginTop: 12, gap: 6
  },
  errorText: { fontSize: 13, color: '#EF4444', fontWeight: '500' },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLOR_PRIMARIO, height: 52, borderRadius: 16,
    marginTop: 20, gap: 8,
    shadowColor: COLOR_PRIMARIO, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 3
  },
  btnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  infoSection: { marginTop: 20 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB',
    borderWidth: 1, borderColor: '#FDE68A', borderRadius: 14, padding: 12, gap: 8
  },
  infoText: { fontSize: 11, color: '#92400E', flex: 1, lineHeight: 16 },
  footer: { alignItems: 'center', paddingVertical: 18, flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginLeft: 6 },
});
