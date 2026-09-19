// src/components/ocr/roleservicio/DocumentoRol.jsx
// Contenido del ROL DE SERVICIO (cabecera + resumen + vehiculos + tabla).
// Compartido entre la vista publica (/?documento=rol) y el modal del sistema.

import React from 'react';

// Meses con hoja propia en el libro (backend los valida)
export const MESES_LIBRO = ['JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

// Anchos (%) de las 9 columnas de la tabla principal: N° CODIGO GRADO
// APELLIDOS AREA TURNO ENT SAL CELULAR — suman 100 para no desbordar.
const ANCHOS_COLUMNAS = [4, 7, 11, 24, 16, 12, 8, 8, 10];

// Formatea el header "vie-18sep" como "Vie 18 Sep"
export function formatearDia(header) {
  if (!header) return '';
  const partes = String(header).split('-');
  if (partes.length < 2) return header;
  const dia = partes[1].replace(/[^0-9]/g, '');
  const mes = partes[1].replace(/[0-9]/g, '');
  const semana = partes[0];
  const cortos = { lun: 'Lun', mar: 'Mar', mie: 'Mie', jue: 'Jue', vie: 'Vie', sab: 'Sab', dom: 'Dom' };
  const ms = { ene: 'Ene', feb: 'Feb', mar: 'Mar', abr: 'Abr', may: 'May', jun: 'Jun', jul: 'Jul', ago: 'Ago', sep: 'Sep', oct: 'Oct', nov: 'Nov', dic: 'Dic' };
  return `${cortos[semana] || semana} ${dia} ${ms[mes] || mes}`;
}

const DocumentoRol = ({ data }) => {
  const resumen = data.resumen;

  return (
    <>
      {/* Cabecera */}
      <div className="mb-4 text-center bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-center gap-3 mb-1">
          <img src="/images/escudo-sanidad.png" alt="HRPA" className="w-12 h-12 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 uppercase">ROL DE SERVICIO</h1>
        <p className="text-sm font-semibold text-gray-700 mt-1">{data.titulo}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3 text-left">
          {(data.contactos || []).map((c, i) => (
            <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-[10px] font-semibold text-gray-500 uppercase">{c.label}</p>
              <p className="text-xs text-gray-800 break-words">{c.valor}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen PERSONAL */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th rowSpan="2" className="px-2 py-2 font-semibold">PERSONAL</th>
                <th colSpan="2" className="px-2 py-2 font-semibold">OFICIALES PNP</th>
                <th colSpan="2" className="px-2 py-2 font-semibold">SUBOFICIALES PNP</th>
                <th rowSpan="2" className="px-2 py-2 font-semibold">CIVIL</th>
                <th rowSpan="2" className="px-2 py-2 font-semibold">TOTAL</th>
              </tr>
              <tr className="bg-gray-100 text-gray-500">
                <th className="px-2 py-1 font-medium">ARMAS</th>
                <th className="px-2 py-1 font-medium">SERVICIOS</th>
                <th className="px-2 py-1 font-medium">ARMAS</th>
                <th className="px-2 py-1 font-medium">SERVICIOS</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-2 py-2 font-semibold text-gray-800">EFECTIVOS</td>
                {resumen.efectivos.por_grupo.map((v, i) => <td key={i} className="px-2 py-2 text-center text-gray-700">{v}</td>)}
                <td className="px-2 py-2 text-center font-bold text-gray-900 bg-gray-50">{resumen.efectivos.total}</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-2 py-2 font-semibold text-gray-800">DESCUENTOS</td>
                {resumen.descuentos.por_grupo.map((v, i) => <td key={i} className="px-2 py-2 text-center text-gray-700">{v}</td>)}
                <td className="px-2 py-2 text-center font-bold text-gray-900 bg-gray-50">{resumen.descuentos.total}</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-2 py-2 font-semibold text-gray-800">DISPONIBLES</td>
                {resumen.disponibles.por_grupo.map((v, i) => <td key={i} className="px-2 py-2 text-center text-gray-700">{v}</td>)}
                <td className="px-2 py-2 text-center font-bold text-gray-900 bg-gray-50">{resumen.disponibles.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehiculos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="border-b border-gray-200 px-3 py-2 bg-gray-50">
          <p className="text-[10px] font-semibold text-gray-600 uppercase">Vehiculos</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-2 py-2 font-semibold text-center" style={{ width: '8%' }}>N°</th>
                <th className="px-2 py-2 font-semibold text-left" style={{ width: '52%' }}>TIPO</th>
                <th className="px-2 py-2 font-semibold text-left" style={{ width: '40%' }}>PLACA</th>
              </tr>
            </thead>
            <tbody>
              {(data.vehiculos?.lista || []).map((v) => (
                <tr key={v.n} className="border-t border-gray-200">
                  <td className="px-2 py-2 text-center text-gray-500">{v.n}</td>
                  <td className="px-2 py-2 text-gray-700">{v.tipo}</td>
                  <td className="px-2 py-2 text-gray-700">{v.placa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(data.vehiculos?.matriz || []).length > 0 && (
          <div className="border-t border-gray-200 px-3 py-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Disponibilidad de vehiculos</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="px-3 py-1.5 font-semibold text-left" style={{ width: '55%' }}>CONDICION</th>
                    <th className="px-3 py-1.5 font-semibold text-center" style={{ width: '15%' }}>AMB.</th>
                    <th className="px-3 py-1.5 font-semibold text-center" style={{ width: '15%' }}>V.COM.</th>
                    <th className="px-3 py-1.5 font-semibold text-center" style={{ width: '15%' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.vehiculos.matriz || []).map((m, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-1.5 font-medium text-gray-700">{m.etiqueta}</td>
                      <td className="px-3 py-1.5 text-center text-gray-700">{m.ambulancia}</td>
                      <td className="px-3 py-1.5 text-center text-gray-700">{m.vcomando}</td>
                      <td className="px-3 py-1.5 text-center font-semibold text-gray-800">{m.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Tabla principal — table-fixed con anchos %: se ajusta al 100% del
          ancho disponible SIN scroll horizontal, los textos largos se
          recortan con ellipsis y el tooltip muestra el valor completo */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="rol-table w-full text-xs table-fixed">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                {(data.columnas || []).map((c, i) => (
                  <th
                    key={i}
                    style={{ width: `${ANCHOS_COLUMNAS[i] || 10}%` }}
                    className="px-2 py-2 font-semibold text-left border-b border-gray-200"
                    title={c}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.filas || []).map((f) => (
                <tr key={f.n} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-2 py-1.5 text-gray-500 truncate">{f.n}</td>
                  <td className="px-2 py-1.5 text-gray-500 truncate" title={f.codigo}>{f.codigo}</td>
                  <td className="px-2 py-1.5 text-gray-800 truncate" title={f.grado}>{f.grado}</td>
                  <td className="px-2 py-1.5 text-gray-800 font-medium truncate" title={f.apellidos}>{f.apellidos}</td>
                  <td className="px-2 py-1.5 text-gray-600 truncate" title={f.area}>{f.area}</td>
                  <td className="px-2 py-1.5 text-gray-600 truncate" title={f.turno}>{f.turno}</td>
                  <td className="px-2 py-1.5 text-gray-500 truncate">{f.entrada}</td>
                  <td className="px-2 py-1.5 text-gray-500 truncate">{f.salida}</td>
                  <td className="px-2 py-1.5 text-gray-600 truncate" title={f.celular}>{f.celular}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default DocumentoRol;