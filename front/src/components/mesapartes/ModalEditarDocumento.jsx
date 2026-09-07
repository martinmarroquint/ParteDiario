// src/components/mesapartes/ModalEditarDocumento.jsx
// Modal de edición - Etapa 1
import React, { useState, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';
import FormularioDocumento from './FormularioDocumento';
import apiClient from '../ocr/services/apiClient';
import { API_ENDPOINTS } from './constantes';

const ModalEditarDocumento = ({ documento, onClose, onActualizado }) => {
  const [form, setForm] = useState({
    fecha: documento.fecha || '',
    tipoDoc: documento.tipo_doc || '',
    nDocOrigen: documento.n_doc_origen || '',
    fechaDoc: documento.fecha_doc || '',
    procedencia: documento.procedencia || '',
    contenido: documento.contenido || ''
  });
  const [guardando, setGuardando] = useState(false);
  const [opcionesBD, setOpcionesBD] = useState({ tiposDoc: [] });

  useEffect(() => {
    apiClient.get(API_ENDPOINTS.opciones)
      .then(d => {
        setOpcionesBD({ tiposDoc: d.tipos_doc || [] });
      }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    setGuardando(true);
    try {
      await apiClient.put(API_ENDPOINTS.documento(documento.id), {
        fecha: form.fecha,
        tipo_doc: form.tipoDoc,
        n_doc_origen: form.nDocOrigen,
        fecha_doc: form.fechaDoc,
        procedencia: form.procedencia,
        contenido: form.contenido,
      });
      onActualizado?.();
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
              Editar Documento
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Solo campos de Etapa 1: Recepción</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto p-5">
          <FormularioDocumento 
            form={form} 
            onChange={setForm} 
            onSubmit={handleSubmit} 
            guardando={guardando} 
            modo="editar"
            opcionesBD={opcionesBD}
          />
        </div>
      </div>
    </div>
  );
};

export default ModalEditarDocumento;
