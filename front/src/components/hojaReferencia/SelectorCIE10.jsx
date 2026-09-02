// src/components/hojaReferencia/SelectorCIE10.jsx
// CARGADO DESDE JSON LOCAL - INSTANTÁNEO - HASTA 10 SELECCIONES
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Plus } from 'lucide-react';
import cie10Data from '../../data/cie10.json';
import { COLOR_PRIMARIO_REF } from './constantes';

const SelectorCIE10 = ({ onSelect, seleccionados = [], maxSelecciones = 10 }) => {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const totalRegistros = cie10Data.length;

  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMostrarDropdown(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleBusqueda = (valor) => {
    setBusqueda(valor);
    
    if (!valor.trim()) {
      setResultados([]);
      setMostrarDropdown(false);
      return;
    }
    
    const q = valor.toLowerCase().trim();
    const filtrados = cie10Data.filter(([codigo, descripcion]) => 
      codigo.toLowerCase().includes(q) || 
      descripcion.toLowerCase().includes(q)
    ).slice(0, 30);
    
    setResultados(filtrados);
    setMostrarDropdown(filtrados.length > 0);
  };

  const handleSelect = ([codigo, descripcion]) => {
    if (seleccionados.length < maxSelecciones && !seleccionados.find(s => s.codigo === codigo)) {
      onSelect([...seleccionados, { codigo, descripcion }]);
    }
    setBusqueda('');
    setResultados([]);
    setMostrarDropdown(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleRemove = (codigo) => {
    onSelect(seleccionados.filter(s => s.codigo !== codigo));
  };

  return (
    <div className="space-y-1.5">
      {/* Items seleccionados */}
      {seleccionados.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
          {seleccionados.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded flex-shrink-0">{item.codigo}</span>
                <span className="text-[10px] text-emerald-700 truncate">{item.descripcion}</span>
              </div>
              <button onClick={() => handleRemove(item.codigo)} className="text-red-400 hover:text-red-600 ml-1 flex-shrink-0 p-0.5 hover:bg-red-50 rounded">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Buscador */}
      {seleccionados.length < maxSelecciones && (
        <div ref={dropdownRef} className="relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={(e) => handleBusqueda(e.target.value)}
              onFocus={() => { if (resultados.length > 0) setMostrarDropdown(true); }}
              placeholder={`Buscar diagnóstico CIE-10 (${seleccionados.length}/${maxSelecciones})`}
              className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 bg-white transition-all placeholder:text-gray-400"
              autoComplete="off"
            />
            {busqueda && (
              <button onClick={() => { setBusqueda(''); setResultados([]); setMostrarDropdown(false); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 hover:bg-gray-100 rounded">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown - AHORA CON PORTAL RELATIVO Y Z-INDEX ALTO */}
          {mostrarDropdown && resultados.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-2xl z-[9999] max-h-56 overflow-hidden">
              <div className="px-2.5 py-1.5 bg-gray-50 border-b text-[10px] text-gray-400 flex items-center justify-between sticky top-0">
                <span>{resultados.length} de {totalRegistros} resultados</span>
                <span className="text-gray-300">{seleccionados.length}/{maxSelecciones}</span>
              </div>
              <div className="overflow-y-auto max-h-44">
                {resultados.map(([codigo, descripcion], idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect([codigo, descripcion])}
                    disabled={seleccionados.find(s => s.codigo === codigo)}
                    className={`w-full text-left px-3 py-2 hover:bg-emerald-50 border-b last:border-b-0 flex items-center gap-2 transition-colors ${
                      seleccionados.find(s => s.codigo === codigo) ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                    }`}
                  >
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded w-16 flex-shrink-0 text-center">{codigo}</span>
                    <span className="text-[10px] text-gray-600 flex-1 line-clamp-1">{descripcion}</span>
                    <Plus className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {seleccionados.length >= maxSelecciones && (
        <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 text-center">
          Máximo {maxSelecciones} diagnósticos alcanzados
        </p>
      )}
    </div>
  );
};

export default SelectorCIE10;