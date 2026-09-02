// app/_layout.jsx
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      animation: 'slide_from_right',
      contentStyle: { backgroundColor: '#F8FAFC' }
    }}>
      <Stack.Screen name="index" options={{ title: 'Acceso' }} />
      <Stack.Screen name="home" options={{ title: 'Roles' }} />
      <Stack.Screen name="descanso" options={{ title: 'Descanso Médico' }} />
      <Stack.Screen name="vacaciones" options={{ title: 'Registro de Vacaciones' }} />
      <Stack.Screen name="consulta" options={{ title: 'Consultar Turnos' }} />
      <Stack.Screen name="solicitudes" options={{ title: 'Cambios de Turno' }} />
      <Stack.Screen name="parte" options={{ title: 'Parte Diario' }} />
      <Stack.Screen name="admin" options={{ title: 'Panel Admin' }} />
    </Stack>
  );
}