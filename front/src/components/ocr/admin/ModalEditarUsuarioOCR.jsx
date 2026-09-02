// src/components/ocr/admin/ModalEditarUsuarioOCR.jsx
// Modal para editar usuario OCR

import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ROLES_OCR, JERARQUIA_OCR } from '../permissions/roles';

const ModalEditarUsuarioOCR = ({ isOpen, onClose, onGuardar, usuario, areas = [] }) => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('');
  const [areasSeleccionadas, setAreasSeleccionadas] = useState([]);
  const [activo, setActivo] = useState(true);
  
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (isOpen && usuario) {
      setNombre(usuario.nombre || '');
      setEmail(usuario.email || '');
      setRol(usuario.rol || ROLES_OCR.USUARIO);
      setAreasSeleccionadas(usuario.areas || []);
      setActivo(usuario.activo !== false);
      setError('');
      setExito(false);
    }
  }, [isOpen, usuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) {
      setError('El nombre completo es obligatorio');
      return;
    }
    if (!rol) {
      setError('El rol es obligatorio');
      return;
    }

    const esJefe = [ROLES_OCR.JEFE_AREA, ROLES_OCR.JEFE_DEPARTAMENTO, ROLES_OCR.JEFE_DIVISION].includes(rol);
    if (esJefe && areasSeleccionadas.length === 0) {
      setError('Los jefes deben tener al menos un área asignada');
      return;
    }

    setGuardando(true);

    try {
      await onGuardar({
        id: usuario.id,
        nombre: nombre.trim(),
        email: email.trim() || '',
        rol,
        areas: areasSeleccionadas,
        activo
      });
      setExito(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error al actualizar usuario');
    } finally {
      setGuardando(false);
    }
  };

  const toggleArea = (areaId) => {
    setAreasSeleccionadas(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  const esJefe = [ROLES_OCR.JEFE_AREA, ROLES_OCR.JEFE_DEPARTAMENTO, ROLES_OCR.JEFE_DIVISION].includes(rol);

  if (!isOpen || !usuario) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[500] p-2 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div 
          className="px-4 py-3 sm:px-5 sm:py-4 text-white flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: '#188C5D' }}
        >
          <div>
            <h3 className="font-bold text-sm sm:text-base">Editar Usuario</h3>
            <p className="text-[10px] sm:text-xs text-white/70">{usuario.nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Nombre Completo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => { setNombre(e.target.value); setError(''); }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
              disabled={guardando || exito}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
              disabled={guardando || exito}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Usuario
            </label>
            <input
              type="text"
              value={usuario.usuario}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 font-mono"
              disabled
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Rol <span className="text-red-400">*</span>
            </label>
            <select
              value={rol}
              onChange={e => { setRol(e.target.value); setError(''); }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
              disabled={guardando || exito}
            >
              {Object.entries(ROLES_OCR).map(([key, value]) => (
                <option key={key} value={value}>
                  {JERARQUIA_OCR[value]?.etiqueta || value}
                </option>
              ))}
            </select>
          </div>

          {esJefe && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Áreas Asignadas <span className="text-red-400">*</span>
                <span className="text-gray-400 normal-case font-medium ml-1">
                  ({areasSeleccionadas.length} seleccionadas)
                </span>
              </label>
              {areas.length === 0 ? (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">
                  No hay áreas disponibles.
                </p>
              ) : (
                <div className="border border-gray-200 rounded-xl p-2 max-h-40 overflow-y-auto">
                  {areas.map(area => {
                    const seleccionada = areasSeleccionadas.includes(area.id);
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => toggleArea(area.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                          seleccionada ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          seleccionada ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                        }`}>
                          {seleccionada && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm text-gray-700">{area.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={e => setActivo(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                disabled={guardando || exito}
              />
              <span className="text-sm font-medium text-gray-700">Usuario activo</span>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {exito && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Usuario actualizado exitosamente</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || exito}
              className="px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-md hover:shadow-lg flex items-center gap-2"
              style={{ backgroundColor: '#188C5D' }}
            >
              {guardando ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Guardar Cambios</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEditarUsuarioOCR;