// src/components/ocr/ModalVistaPrevia.jsx
// MODAL DE VISTA PREVIA - FORMATO SIMILAR A IMPRESIÓN CON MARCA DE AGUA
import React, { useMemo } from 'react';
import { X, Eye, CheckCircle2 } from 'lucide-react';
import { COLOR_PRIMARIO, MESES, DIAS_SEMANA, TURNO_MAP } from './constantes';

const FILAS_POR_PAGINA = 20;

const ModalVistaPrevia = ({ 
  isOpen, onClose, onConfirmar,
  area, responsable, mes, anio,
  personal, turnos, DIAS,
  totalTurnos, totalHoras
}) => {
  // Calcular filas vacías para completar la tabla cuando hay más de 15 personas
  const filasVacias = personal.length > 15 && personal.length < FILAS_POR_PAGINA
    ? FILAS_POR_PAGINA - personal.length
    : 0;

  const turnosUsados = useMemo(() => {
    const usados = new Set();
    Object.values(turnos).forEach(emp => 
      Object.values(emp).forEach(codigo => { 
        if (codigo && TURNO_MAP[codigo]) usados.add(codigo); 
      })
    );
    return Array.from(usados).sort();
  }, [turnos]);

  if (!isOpen) return null;

  const calcularHoras = (empId) => {
    let h = 0;
    DIAS.forEach(d => {
      const t = TURNO_MAP[turnos[empId]?.[d] || ''];
      if (t?.horas) h += t.horas;
    });
    return h;
  };

  const hoy = new Date();
  const fechaStr = `${hoy.getDate()} de ${MESES[hoy.getMonth()]} del ${hoy.getFullYear()}`;
  const horaStr = hoy.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[250] p-2">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        
        <div className="px-5 py-3 text-white flex items-center justify-between shrink-0" style={{ backgroundColor: COLOR_PRIMARIO }}>
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-base">Vista Previa del Rol</h3>
              <p className="text-xs text-white/60">{area} - {MESES[mes-1]} {anio}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-auto bg-gray-200 p-4 flex justify-center">
          <div className="bg-white shadow-lg" style={{ width: '420mm', minHeight: '297mm', padding: '10mm', position: 'relative' }}>
            
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%) rotate(-25deg)',
              fontSize: '48pt', fontWeight: 800,
              color: 'rgba(6, 95, 70, 0.04)',
              pointerEvents: 'none', zIndex: 0,
              whiteSpace: 'nowrap', letterSpacing: '10px',
              textTransform: 'uppercase', userSelect: 'none'
            }}>
              BORRADOR
            </div>

            <div style={{ position: 'relative', zIndex: 1, fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: '8pt', color: '#1e293b' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${COLOR_PRIMARIO}`, paddingBottom: '6px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                    <img src="/images/escudo-sanidad.png" alt="Escudo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <h1 style={{ fontSize: '10pt', fontWeight: 800, color: COLOR_PRIMARIO, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Policia Nacional del Peru</h1>
                    <h2 style={{ fontSize: '6.5pt', color: '#64748b', fontWeight: 500, marginTop: '1px' }}>Hospital Regional Policial Arequipa</h2>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '5.5pt', color: '#94a3b8' }}>
                  <strong style={{ color: '#64748b', fontSize: '6pt', fontWeight: 500 }}>{fechaStr}</strong> · {horaStr} hrs
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '6px 0' }}>
                <h3 style={{ fontSize: '11pt', fontWeight: 800, color: COLOR_PRIMARIO, textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>{area}</h3>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '3px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', marginBottom: '6px', backgroundColor: '#ECFDF5', fontSize: '6.5pt', alignItems: 'center', color: '#334155' }}>
                <span><strong style={{ color: COLOR_PRIMARIO }}>{MESES[mes-1]} {anio}</strong></span>
                <span style={{ width: '3px', height: '3px', backgroundColor: '#86B7A0', borderRadius: '50%' }} />
                <span>Resp: <strong style={{ color: COLOR_PRIMARIO }}>{responsable}</strong></span>
                <span style={{ width: '3px', height: '3px', backgroundColor: '#86B7A0', borderRadius: '50%' }} />
                <span>Personal: <strong style={{ color: COLOR_PRIMARIO }}>{personal.length}</strong></span>
                <span style={{ width: '3px', height: '3px', backgroundColor: '#86B7A0', borderRadius: '50%' }} />
                <span>Dias: <strong style={{ color: COLOR_PRIMARIO }}>{DIAS.length}</strong></span>
                <span style={{ width: '3px', height: '3px', backgroundColor: '#86B7A0', borderRadius: '50%' }} />
                <span>Turnos: <strong style={{ color: COLOR_PRIMARIO }}>{totalTurnos}</strong></span>
                <span style={{ width: '3px', height: '3px', backgroundColor: '#86B7A0', borderRadius: '50%' }} />
                <span>Horas: <strong style={{ color: COLOR_PRIMARIO }}>{totalHoras}h</strong></span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '5.5pt' }}>
                  <thead>
                    <tr>
                      <th style={{ backgroundColor: COLOR_PRIMARIO, color: '#fff', padding: '2px 1px', fontWeight: 600, fontSize: '4.5pt', textTransform: 'uppercase', width: '18px' }}>N°</th>
                      <th style={{ backgroundColor: COLOR_PRIMARIO, color: '#fff', padding: '2px 1px', fontWeight: 600, fontSize: '4.5pt', textTransform: 'uppercase', width: '32px', textAlign: 'left' }}>Grado</th>
                      <th style={{ backgroundColor: COLOR_PRIMARIO, color: '#fff', padding: '2px 2px', fontWeight: 600, fontSize: '4.5pt', textTransform: 'uppercase', width: '110px', textAlign: 'left' }}>Apellidos y Nombres</th>
                      {DIAS.map(d => {
                        const f = new Date(anio, mes-1, d);
                        const dom = f.getDay() === 0;
                        return (
                          <th key={d} style={{ 
                            backgroundColor: dom ? '#064E3B' : COLOR_PRIMARIO, 
                            color: '#fff', padding: '1px', fontWeight: 600, 
                            fontSize: '7pt', width: '20px', textAlign: 'center' 
                          }}>
                            {d}<br/><span style={{ fontWeight: 600, fontSize: '5pt' }}>{DIAS_SEMANA.find(ds => ds.id === f.getDay())?.inicial || ''}</span>
                          </th>
                        );
                      })}
                      <th style={{ backgroundColor: COLOR_PRIMARIO, color: '#fff', padding: '2px 1px', fontWeight: 600, fontSize: '4.5pt', width: '24px' }}>HRS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personal.map((emp, i) => {
                      const hrs = calcularHoras(emp.id);
                      return (
                        <tr key={emp.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                          <td style={{ padding: '1.5px 1px', textAlign: 'center', fontSize: '5pt', color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>{i + 1}</td>
                          <td style={{ padding: '1.5px 2px', fontSize: '5.5pt', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>{emp.grado}</td>
                          <td style={{ padding: '1.5px 2px', fontSize: '6pt', fontWeight: 500, textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>{emp.nombre}</td>
                          {DIAS.map(d => {
                            const c = turnos[emp.id]?.[d] || '';
                            const f = new Date(anio, mes-1, d);
                            const dom = f.getDay() === 0;
                            return (
                              <td key={d} style={{ 
                                padding: '1.5px 1px', textAlign: 'center', fontSize: '6pt', fontWeight: 600,
                                borderBottom: '1px solid #f1f5f9',
                                backgroundColor: dom ? '#f1f5f9' : 'transparent',
                                color: c ? '#1e293b' : '#cbd5e1'
                              }}>
                                {c || '·'}
                              </td>
                            );
                          })}
                          <td style={{ padding: '1.5px 1px', textAlign: 'center', fontSize: '5.5pt', fontWeight: 700, borderBottom: '1px solid #f1f5f9', backgroundColor: '#ECFDF5', color: COLOR_PRIMARIO }}>{hrs}h</td>
                        </tr>
                      );
                    })}
                    {filasVacias > 0 && Array.from({ length: filasVacias }).map((_, i) => {
                      const idx = personal.length + i;
                      return (
                        <tr key={`empty-${i}`} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                          <td style={{ padding: '1.5px 1px', textAlign: 'center', fontSize: '5pt', color: '#cbd5e1', borderBottom: '1px solid #f1f5f9' }}>{idx + 1}</td>
                          <td style={{ padding: '1.5px 2px', borderBottom: '1px solid #f1f5f9' }}>&nbsp;</td>
                          <td style={{ padding: '1.5px 2px', borderBottom: '1px solid #f1f5f9' }}>&nbsp;</td>
                          {DIAS.map(d => {
                            const f = new Date(anio, mes-1, d);
                            const dom = f.getDay() === 0;
                            return (
                              <td key={d} style={{ 
                                padding: '1.5px 1px', textAlign: 'center', borderBottom: '1px solid #f1f5f9',
                                backgroundColor: dom ? '#f1f5f9' : 'transparent'
                              }}>&nbsp;</td>
                            );
                          })}
                          <td style={{ padding: '1.5px 1px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#ECFDF5' }}>&nbsp;</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {turnosUsados.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', padding: '3px 6px', border: '1px solid #D1FAE5', marginTop: '4px', fontSize: '5pt', backgroundColor: '#ECFDF5', borderRadius: '3px', alignItems: 'center' }}>
                  <strong style={{ fontSize: '5.5pt', textTransform: 'uppercase', color: COLOR_PRIMARIO }}>Leyenda:</strong>
                  {turnosUsados.map((c, i) => {
                    const t = TURNO_MAP[c];
                    return <span key={c}>{t.codigo}={t.nombre}{i < turnosUsados.length - 1 ? '  |  ' : ''}</span>;
                  })}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '4px', borderTop: '1px solid #e2e8f0', fontSize: '5pt', color: '#94a3b8' }}>
                <span>Vista previa - Este documento no tiene validez oficial</span>
                <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 700, color: COLOR_PRIMARIO, fontSize: '5.5pt' }}>
                  BORRADOR
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
          <p className="text-xs text-gray-400">
            Revise los turnos antes de confirmar. Una vez bloqueado no podra editarse.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="h-9 px-4 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={onConfirmar}
              className="h-9 px-5 text-xs font-semibold text-white rounded-lg transition-all flex items-center gap-1.5"
              style={{ backgroundColor: COLOR_PRIMARIO }}>
              <CheckCircle2 className="w-4 h-4" /> Confirmar y Bloquear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalVistaPrevia;