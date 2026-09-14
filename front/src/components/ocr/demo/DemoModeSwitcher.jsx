// src/components/ocr/demo/DemoModeSwitcher.jsx
// Permite al usuario demo cambiar entre perspectivas de rol sin cerrar sesion

import React, { useState } from 'react';
import { Eye, ChevronDown, User, Shield, FileText, Users, Building2, Briefcase } from 'lucide-react';
import { COLOR_PRIMARIO } from '../constantes';

const DEMO_PERSPECTIVES = [
  {
    rol: 'admin',
    rol_principal: 4,
    nombre: 'Administrador',
    descripcion: 'Control total del sistema',
    icono: Shield,
    color: '#dc2626',
  },
  {
    rol: 'jefe_division',
    rol_principal: 3,
    nombre: 'Jefe de Division',
    descripcion: 'Gestiona divisiones y aprueba',
    icono: Building2,
    color: '#7c3aed',
  },
  {
    rol: 'jefe_departamento',
    rol_principal: 2,
    nombre: 'Jefe de Departamento',
    descripcion: 'Gestiona departamentos',
    icono: Briefcase,
    color: '#2563eb',
  },
  {
    rol: 'jefe_area',
    rol_principal: 1,
    nombre: 'Jefe de Area',
    descripcion: 'Gestiona su area directa',
    icono: Users,
    color: '#059669',
  },
  {
    rol: 'usuario',
    rol_principal: 0,
    nombre: 'Usuario',
    descripcion: 'Consulta y solicita cambios',
    icono: User,
    color: '#6b7280',
  },
  {
    rol: 'tramite_documentario',
    rol_principal: 5,
    nombre: 'Tramite Documentario',
    descripcion: 'Gestion documentaria',
    icono: FileText,
    color: '#d97706',
  },
];

const DemoModeSwitcher = ({ user, onPerspectiveChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPerspective, setCurrentPerspective] = useState(
    DEMO_PERSPECTIVES.find(p => p.rol === user?.rol) || DEMO_PERSPECTIVES[0]
  );

  const handlePerspectiveChange = (perspective) => {
    setCurrentPerspective(perspective);
    setIsOpen(false);
    if (onPerspectiveChange) {
      onPerspectiveChange(perspective);
    }
  };

  const Icon = currentPerspective.icono;

  return (
    <div className="relative">
      {/* Boton del demo mode */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-dashed transition-all duration-200 hover:shadow-md"
        style={{ 
          borderColor: COLOR_PRIMARIO,
          backgroundColor: `${COLOR_PRIMARIO}08`
        }}
      >
        <Eye className="w-4 h-4" style={{ color: COLOR_PRIMARIO }} />
        <span className="text-xs font-semibold" style={{ color: COLOR_PRIMARIO }}>MODO DEMO</span>
        <div className="w-px h-4 bg-gray-200" />
        <Icon className="w-3.5 h-3.5" style={{ color: currentPerspective.color }} />
        <span className="text-xs font-medium text-gray-700">{currentPerspective.nombre}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown de perspectivas */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100" style={{ backgroundColor: `${COLOR_PRIMARIO}08` }}>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" style={{ color: COLOR_PRIMARIO }} />
                <span className="text-sm font-bold" style={{ color: COLOR_PRIMARIO }}>Cambiar Perspectiva</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Selecciona un rol para ver como lo experimenta ese usuario
              </p>
            </div>

            {/* Lista de perspectivas */}
            <div className="py-2 max-h-80 overflow-y-auto">
              {DEMO_PERSPECTIVES.map((perspective) => {
                const PIcon = perspective.icono;
                const isActive = currentPerspective.rol === perspective.rol;
                
                return (
                  <button
                    key={perspective.rol}
                    onClick={() => handlePerspectiveChange(perspective)}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                      isActive 
                        ? 'bg-gray-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${perspective.color}15` }}
                    >
                      <PIcon className="w-4 h-4" style={{ color: perspective.color }} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{perspective.nombre}</span>
                        {isActive && (
                          <span 
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: `${perspective.color}20`, color: perspective.color }}
                          >
                            ACTUAL
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{perspective.descripcion}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-[10px] text-gray-400 text-center">
                Los datos son de solo lectura en modo demo
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DemoModeSwitcher;
