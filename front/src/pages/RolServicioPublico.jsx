// src/pages/RolServicioPublico.jsx
// Vista PUBLICA del ROL DE SERVICIO — no requiere login.
// v5: reutiliza <DocumentoRol/> (mismo layout que el modal del sistema).
// PDF REAL vertical (A4 portrait) generado con react-pdf SOLO al hacer
// clic (usePDF bajo demanda, documento memoizado) — cero renders en bucle.
// Layout table-fixed: se ajusta al 100%, sin scroll horizontal.

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Loader2, FileDown, FileWarning } from 'lucide-react';
import { usePDF } from '@react-pdf/renderer';
import apiClient from '../components/ocr/services/apiClient';
import RolServicioPDF from './RolServicioPDF';
import DocumentoRol, { MESES_LIBRO, formatearDia } from '../components/ocr/roleservicio/DocumentoRol';

// Descarga un blob URL creando un <a> temporal
function descargarUrl(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function RolServicioPublico() {
  const [mes, setMes] = useState('');
  const [dia, setDia] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // PDF bajo demanda.
  // NOTA IMPORTANTE: usePDF({document: X}) solo usa X del PRIMER render en
  // react-pdf 4.x (setup con deps []). Pasarlo como prop hace que cambiar el
  // documento de null a X NO genere nada. Uso el patrón correcto: hook sin
  // documento y `usarPdf(doc)` explicito al hacer clic.
  const [pdf, usarPdf] = usePDF();
  const [descargarPendiente, setDescargarPendiente] = useState(false);
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
      // _skipAuthRedirect: esta vista es publica, sin sesion
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

  // Carga inicial
  useEffect(() => {
    cargar('', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nombreArchivo = data
    ? `ROL_SERVICIO_${(data.titulo || 'PARTE_DIARIO').replace(/[^A-Za-z0-9]+/g, '_')}.pdf`
    : 'ROL_SERVICIO.pdf';

  // Cuando la instancia del PDF termina y hay descarga pendiente → descarga.
  useEffect(() => {
    if (descargarPendiente && pdf.url && !pdf.loading && firmaPdfRef.current === firma) {
      descargarUrl(pdf.url, nombreArchivo);
      setDescargarPendiente(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descargarPendiente, pdf.url, pdf.loading, firma]);

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

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-500">Cargando rol de servicio...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="bg-white rounded-xl shadow p-6 max-w-md text-center">
          <p className="text-red-600 text-sm font-medium">{error}</p>
          <button
            onClick={() => cargar(mes || '', dia || '')}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const manejarDescarga = () => {
    if (pdf.loading) return;
    if (pdf.url && !pdf.error && firmaPdfRef.current === firma) {
      descargarUrl(pdf.url, nombreArchivo);
      return;
    }
    firmaPdfRef.current = firma;
    setDescargarPendiente(true);
    usarPdf(doc);
  };

  const generando = pdf.loading && descargarPendiente;

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Barra de controles */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">ROL</div>
            <div>
              <p className="text-xs font-semibold text-gray-800 leading-tight">ROL DE SERVICIO</p>
              <p className="text-[10px] text-gray-400 leading-tight">Vista publica · Hospital Regional Policial Arequipa</p>
            </div>
          </div>

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
              {(data.dias_disponibles || []).map((d) => (
                <option key={d.dia} value={String(d.dia)}>{formatearDia(d.header)}</option>
              ))}
            </select>
          </label>

          {/* Descarga PDF — se genera SOLO al hacer clic */}
          <button
            onClick={manejarDescarga}
            disabled={generando}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 flex items-center gap-2 disabled:opacity-60 disabled:cursor-wait"
            title="Genera y descarga el PDF del parte diario"
          >
            {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {generando ? 'GENERANDO...' : 'DESCARGAR PDF'}
          </button>
          {loading && <span className="text-xs text-emerald-600 font-medium">Cargando...</span>}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Documento compartido con el modal del sistema */}
        <DocumentoRol data={data} />

        <p className="text-center text-[10px] text-gray-400 mt-6 mb-4">
          Generado automaticamente · {data.total_personal} personas · {formatearDia(data.header_dia)} {data.mes} · Hospital Regional Policial Arequipa
        </p>
      </main>

      {pdf.error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-2 rounded-lg shadow flex items-center gap-2">
          <FileWarning className="w-4 h-4 flex-shrink-0" />
          No se pudo generar el PDF. Intentalo de nuevo.
        </div>
      )}
    </div>
  );
}

export default RolServicioPublico;