// src/components/mesapartes/ModalDerivarDocumento.jsx
import React, { useState, useEffect } from 'react';
import { X, Send, Loader2, Plus, Trash2 } from 'lucide-react';
import apiClient from '../ocr/services/apiClient';
import { API_ENDPOINTS, TIPOS_MOV_DEFAULT } from './constantes';
import Dropdown from '../ui/Dropdown';

const ModalDerivarDocumento = ({ documento, onClose, onActualizado }) => {
  const [tipoMov, setTipoMov] = useState('PASE');
  const [contenido, setContenido] = useState('');
  const [areas, setAreas] = useState(['']);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [opcionesAreas, setOpcionesAreas] = useState([]);
  const [tiposMov, setTiposMov] = useState([]);

  useEffect(() => {
    apiClient.get(API_ENDPOINTS.opciones)
      .then(d => {
        setOpcionesAreas((d.areas || []).map(a => ({ value: a, label: a })));
        setTiposMov((d.tipos_mov && d.tipos_mov.length > 0) ? d.tipos_mov : TIPOS_MOV_DEFAULT);
      })
      .catch(() => {
        setTiposMov(TIPOS_MOV_DEFAULT);
      });
  }, []);

  const handleDerivar = async () => {
    const areasValidas = areas.filter(a => a.trim());
    if (!areasValidas.length) return;
    setGuardando(true);
    setError(null);
    try {
      await apiClient.post(API_ENDPOINTS.derivar, {
        documento_id: documento.id,
        areas: areasValidas,
        tipo_mov: tipoMov,
        contenido: contenido
      });
      onActualizado?.();
      onClose();
    } catch(e) {
      setError(e.message || 'Error al derivar');
    } finally { setGuardando(false); }
  };

  const addArea = () => setAreas(p => [...p, '']);
  const removeArea = (i) => setAreas(p => p.filter((_, idx) => idx !== i));
  const updateArea = (i, v) => setAreas(p => p.map((a, idx) => idx === i ? v : a));

  const tiposMovOptions = tiposMov.map(t => ({ value: t, label: t }));

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
              Derivar Documento
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Crear movimiento y enviar a area(s)</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700 truncate">{documento.asunto || documento.contenido}</p>
          <p className="text-xs text-gray-400 mt-0.5">{documento.numero} · {documento.tipo_doc}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Tipo de movimiento */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Tipo de documento</label>
            <Dropdown
              options={tiposMovOptions}
              value={tipoMov}
              onChange={v => setTipoMov(v)}
              placeholder="Seleccionar tipo"
              searchable
            />
          </div>

          {/* Contenido del movimiento */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Contenido / Instrucciones <span className="text-red-400">*</span>
            </label>
            <textarea
              value={contenido}
              onChange={e => setContenido(e.target.value)}
              placeholder="Describa las instrucciones o contenido del documento a derivar..."
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-200/60 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 outline-none transition-all bg-white focus:border-gray-400 resize-none"
            />
          </div>

          {/* Áreas de destino */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Areas de destino</label>
            {areas.map((area, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <div className="flex-1">
                  <Dropdown
                    options={opcionesAreas}
                    value={area}
                    onChange={v => updateArea(i, v)}
                    placeholder={`Area ${i + 1}`}
                    searchable
                    clearable
                  />
                </div>
                {areas.length > 1 && (
                  <button onClick={() => removeArea(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addArea} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 mt-1">
              <Plus className="w-3.5 h-3.5" /> Agregar otra area
            </button>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Se generara un <span className="font-medium">{tipoMov}</span> por cada area y el documento pasara a <span className="font-medium">DERIVADO</span>
            </p>
          </div>

          <button 
            onClick={handleDerivar} 
            disabled={guardando || !areas.some(a => a.trim()) || !contenido.trim()}
            className="w-full py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 bg-blue-600 hover:bg-blue-700"
          >
            {guardando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
            ) : (
              <><Send className="w-4 h-4" /> Derivar ({areas.filter(a => a.trim()).length} area{areas.filter(a => a.trim()).length !== 1 ? 's' : ''})</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDerivarDocumento;
