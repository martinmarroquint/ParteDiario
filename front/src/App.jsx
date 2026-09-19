// src/App.jsx
// OCR - Roles de Servicio PNP
// Sistema independiente con Google Sheets

import React from 'react';
import PanelOCR from './pages/PanelOCR';
import RolServicioPublico from './pages/RolServicioPublico';

function App() {
  // Ruta PUBLICA: /?documento=rol — espejo del ROL DE SERVICIO sin login
  const esRolPublico =
    new URLSearchParams(window.location.search).get('documento') === 'rol';

  if (esRolPublico) {
    return (
      <div className="min-h-screen bg-gray-50">
        <RolServicioPublico />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PanelOCR />
    </div>
  );
}

export default App;
