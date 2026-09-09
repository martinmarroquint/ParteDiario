// src/components/mesapartes/RegistroDocumento.jsx
import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import apiClient from '../ocr/services/apiClient';
import { API_ENDPOINTS, FUENTES } from './constantes';
import Dropdown from '../ui/Dropdown';

const RegistroDocumento = ({ onRegistrado }) => {
  const [form, setForm] = useState({
    fecha_doc: new Date().toISOString().split('T')[0],
    tipo_doc: '',
    n_doc_origen: '',
    procedencia: '',
    asunto: '',
    contenido: '',
    fuente: 'fisico'
  });
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [tiposDoc, setTiposDoc] = useState([]);

  useEffect(() => {
    apiClient.get(API_ENDPOINTS.opciones)
      .then(d => setTiposDoc((d.tipos_doc || []).map(t => ({ value: t, label: t }))))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!form.tipo_doc || !form.contenido.trim()) {
      setMensaje({ tipo: 'error', texto: 'Tipo y Contenido son obligatorios' });
      setTimeout(() => setMensaje(null), 3000);
      return;
    }
    setGuardando(true);
    try {
      await apiClient.post(API_ENDPOINTS.documentos, {
        tipo_doc: form.tipo_doc,
        n_doc_origen: form.n_doc_origen,
        fecha_doc: form.fecha_doc,
        procedencia: form.procedencia,
        asunto: form.asunto,
        contenido: form.contenido,
        fuente: form.fuente
      });
      setMensaje({ tipo: 'success', texto: 'Documento registrado' });
      setForm({ fecha_doc: new Date().toISOString().split('T')[0], tipo_doc: '', n_doc_origen: '', procedencia: '', asunto: '', contenido: '', fuente: 'fisico' });
      setTimeout(() => { setMensaje(null); onRegistrado?.(); }, 600);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al registrar' });
      setTimeout(() => setMensaje(null), 3000);
    } finally { setGuardando(false); }
  };

  const inputCls = "w-full px-3 py-2.5 border border-gray-200/60 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 outline-none transition-all bg-white focus:border-gray-400";

  return (
    <div className="space-y-4">
      {mensaje && (
        <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${mensaje.tipo==='success'?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-600 border border-red-200'}`}>
          {mensaje.tipo==='success'?<CheckCircle2 className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}
          {mensaje.texto}
        </div>
      )}

      {/* Fuente */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Fuente del documento</label>
        <div className="flex gap-2">
          {FUENTES.map(f => (
            <button key={f.value} type="button" onClick={() => setForm(p => ({...p, fuente: f.value}))}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${form.fuente === f.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tipo de documento */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Tipo de documento <span className="text-red-400">*</span></label>
        <Dropdown options={tiposDoc} value={form.tipo_doc} onChange={v => setForm(p => ({...p, tipo_doc: v}))} placeholder="Seleccionar tipo" searchable clearable />
      </div>

      {/* N° y Fecha */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">N° Documento original</label>
          <input type="text" value={form.n_doc_origen} onChange={e => setForm(p => ({...p, n_doc_origen: e.target.value}))} placeholder="Ej: 123/2026" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Fecha del documento</label>
          <input type="date" value={form.fecha_doc} onChange={e => setForm(p => ({...p, fecha_doc: e.target.value}))} className={inputCls} />
        </div>
      </div>

      {/* Procedencia */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Procedencia</label>
        <input type="text" value={form.procedencia} onChange={e => setForm(p => ({...p, procedencia: e.target.value}))} placeholder="De dónde viene el documento" className={inputCls} />
      </div>

      {/* Asunto */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Asunto</label>
        <input type="text" value={form.asunto} onChange={e => setForm(p => ({...p, asunto: e.target.value}))} placeholder="Resumen breve del documento" className={inputCls} />
      </div>

      {/* Contenido / Transcripción */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Contenido / Transcripción <span className="text-red-400">*</span>
        </label>
        <textarea value={form.contenido} onChange={e => setForm(p => ({...p, contenido: e.target.value}))}
          placeholder={form.fuente === 'digital' ? "Copie y pegue el contenido del documento..." : "Transcriba el contenido del documento físico..."}
          rows={6} className={inputCls + " resize-none"} />
      </div>

      <button onClick={handleSubmit} disabled={guardando || !form.tipo_doc || !form.contenido.trim()}
        className="w-full py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 bg-gray-900 hover:bg-gray-800">
        {guardando ? 'Registrando...' : 'Registrar Documento'}
      </button>
    </div>
  );
};

export default RegistroDocumento;
