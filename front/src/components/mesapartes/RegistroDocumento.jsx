// src/components/mesapartes/RegistroDocumento.jsx
// ETAPA 1: RECEPCIÓN - Wrapper ligero para FormularioDocumento
import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import FormularioDocumento from './FormularioDocumento';
import apiClient from '../ocr/services/apiClient';
import { API_ENDPOINTS } from './constantes';

const RegistroDocumento = ({ onRegistrado }) => {
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipoDoc: '',
    nDocOrigen: '',
    fechaDoc: new Date().toISOString().split('T')[0],
    procedencia: '',
    contenido: ''
  });
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [opcionesBD, setOpcionesBD] = useState({ tiposDoc: [] });

  useEffect(() => {
    apiClient.get(API_ENDPOINTS.opciones)
      .then(d => {
        setOpcionesBD({ tiposDoc: d.tipos_doc || [] });
      }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!form.tipoDoc || !form.contenido.trim()) {
      setMensaje({ tipo: 'error', texto: 'Tipo de Documento y Contenido son obligatorios' });
      setTimeout(() => setMensaje(null), 3000);
      return;
    }

    setGuardando(true);
    try {
      await apiClient.post(API_ENDPOINTS.documentos, {
        fecha: form.fecha,
        tipo_doc: form.tipoDoc,
        n_doc_origen: form.nDocOrigen,
        fecha_doc: form.fechaDoc,
        procedencia: form.procedencia,
        contenido: form.contenido,
      });

      setMensaje({ tipo: 'success', texto: 'Documento registrado correctamente' });
      setForm({
        fecha: new Date().toISOString().split('T')[0],
        tipoDoc: '', nDocOrigen: '',
        fechaDoc: new Date().toISOString().split('T')[0],
        procedencia: '', contenido: ''
      });

      setTimeout(() => { setMensaje(null); onRegistrado?.(); }, 600);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al registrar' });
      setTimeout(() => setMensaje(null), 3000);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      {mensaje && (
        <div className={`p-3 rounded-xl mb-4 flex items-center gap-2 text-sm ${mensaje.tipo==='success'?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-600 border border-red-200'}`}>
          {mensaje.tipo==='success'?<CheckCircle2 className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}
          {mensaje.texto}
        </div>
      )}
      <FormularioDocumento form={form} onChange={setForm} onSubmit={handleSubmit} guardando={guardando} modo="registro" opcionesBD={opcionesBD} />
    </>
  );
};

export default RegistroDocumento;
