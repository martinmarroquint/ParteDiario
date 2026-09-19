// src/components/ocr/roleservicio/ModalParteDiario.jsx
// MODAL del Parte Diario dentro del sistema (no navega a otra pestaña).
// Muestra el ROL DE SERVICIO del backend con selectores mes/dia.
//
// RENDIMIENTO: el PDF NO se renderiza al abrir el modal. Solo se genera
// cuando el usuario hace clic en DESCARGAR (usePDF bajo demanda) y el
// documento esta memoizado: cero renders en bucle, cero carga innecesaria.

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { X, Loader2, FileDown, AlertTriangle, FileWarning } from 'lucide-react';
import { usePDF } from '@react-pdf/renderer';
import apiClient from '../services/apiClient';
import RolServicioPDF from '@/pages/RolServicioPDF';
import DocumentoRol, { MESES_LIBRO, formatearDia } from './DocumentoRol';

// Descarga un blob URL creando un <a> temporal
function descargarUrl(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const ModalParteDiario = ({ isOpen, onClose }) => {
  const [mes, setMes] = useState('');
  const [dia, setDia] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // PDF bajo demanda.
  // NOTA IMPORTANTE: usePDF({document: X}) solo usa X del PRIMER render en
  // react-pdf 4.x (el setup corre una sola vez con deps []). Si se pasa el
  // documento como prop, cambiar docActivo de null a un documento NO genera
  // nada: el boton quedaba muerto. Uso el patrón correcto: hook sin documento
  // y `usarPdf(doc)` explícito al hacer clic.
  const [pdf, usarPdf] = usePDF();
  const [descargarPendiente, setDescargarPendiente] = useState(false); // espera a que termine
  // Firma mes-dia del PDF actualmente generado (o en generacion). Evita
  // descargar el PDF equivocado si la data cambia a mitad de la generacion.
  const firmaPdfRef = useRef(null);
  const firma = data ? `${data.mes}-${data.dia}` : null;

  // El documento es ESTABLE entre renders: solo cambia cuando cambia data.
  const doc = useMemo(() => (data ? <RolServicioPDF data={data} /> : null), [data]);

  const cargar = useCallback(async (mesSel, diaSel) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (mesSel) params.mes = mesSel;
      if (diaSel) params.dia = diaSel;
      // _skipAuthRedirect: el endpoint es publico
      const res = await apiClient.get('/rol-servicio', params, {
        _skipAuthRedirect: true,
        _timeout: 90000,
        _retries: 1,
        _retryDelays: [3000],
      });
      setData(res);
      setMes(res.mes);
      setDia(String(res.dia));
    } catch (e) {
      setError(e.message || 'No se pudo cargar el rol de servicio.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga al abrir el modal
  useEffect(() => {
    if (isOpen) cargar('', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Bloquea el scroll del fondo mientras el modal esta abierto
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Cuando la instancia del PDF termina y hay una descarga pendiente → descarga.
  useEffect(() => {
    if (descargarPendiente && pdf.url && !pdf.loading && firmaPdfRef.current === firma) {
      descargarUrl(pdf.url, nombreArchivo);
      setDescargarPendiente(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descargarPendiente, pdf.url, pdf.loading, firma]);

  if (!isOpen) return null;

  const cambiarMes = (m) => {
    const primerDia = data && m === data.mes ? data.dia : 1;
    setMes(m);
    setDia(String(primerDia));
    cargar(m, primerDia);
  };

  const cambiarDia = (d) => {
    setDia(d);
    cargar(mes, Number(d));
  };

  const nombreArchivo = data
    ? `ROL_SERVICIO_${(data.titulo || 'PARTE_DIARIO').replace(/[^A-Za-z0-9]+/g, '_')}.pdf`
    : 'ROL_SERVICIO.pdf';

  // Solo se genera el PDF cuando el usuario hace clic. Si ya existe uno
  // generado para la data actual, se descarga directo (sin re-render).
  const manejarDescarga = () => {
    if (pdf.loading) return;
    if (pdf.url && !pdf.error && firmaPdfRef.current === firma) {
      descargarUrl(pdf.url, nombreArchivo);
      return;
    }
    // Primer clic o la data cambio: marca pendiente y arranca el render
    firmaPdfRef.current = firma;
    setDescargarPendiente(true);
    usarPdf(doc);
  };

  const generando = pdf.loading && descargarPendiente;

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-2">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* HEADER del modal */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">ROL</div>
            <div>
              <h3 className="font-bold text-sm text-gray-800">Parte Diario</h3>
              <p className="text-[11px] text-gray-500">ROL DE SERVICIO · Hospital Regional Policial Arequipa</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors" title="Cerrar">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* CONTROLES mes/dia */}
        <div className="px-5 py-2.5 border-b border-gray-200 bg-white flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            Mes
            <select
              value={mes}
              onChange={(e) => cambiarMes(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
            >
              {MESES_LIBRO.map((m) => (
                <option key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            Dia
            <select
              value={dia}
              onChange={(e) => cambiarDia(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none"
            >
              {(data?.dias_disponibles || []).map((d) => (
                <option key={d.dia} value={String(d.dia)}>{formatearDia(d.header)}</option>
              ))}
            </select>
          </label>

          {/* Descarga PDF — se genera SOLO al hacer clic */}
          {data && (
            <button
              onClick={manejarDescarga}
              disabled={generando}
              className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-wait"
              title="Genera y descarga el PDF del parte diario"
            >
              {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              {generando ? 'GENERANDO...' : 'DESCARGAR PDF'}
            </button>
          )}

          {loading && <span className="text-xs text-emerald-600 font-medium">Cargando...</span>}
        </div>

        {/* CONTENIDO con scroll — solo vertical, nunca horizontal */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gray-100">
          {loading && !data ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : error && !data ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={() => cargar(mes || '', dia || '')}
                className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
              >
                Reintentar
              </button>
            </div>
          ) : data ? (
            <>
              <div className="max-w-4xl mx-auto w-full min-w-0">
                <DocumentoRol data={data} />
                <p className="text-center text-[10px] text-gray-400 mt-4">
                  Generado automaticamente · {data.total_personal} personas · {formatearDia(data.header_dia)} {data.mes} · Hospital Regional Policial Arequipa
                </p>
              </div>
              {/* Error de generacion del PDF (si ocurre) */}
              {pdf.error && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-2 rounded-lg shadow flex items-center gap-2">
                  <FileWarning className="w-4 h-4 flex-shrink-0" />
                  No se pudo generar el PDF. Intentalo de nuevo.
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ModalParteDiario;