// src/components/ocr/tour/GuidedTour.jsx
// Tour guiado 100% custom — spotlight + tooltip sin librerias externas

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, CheckCircle2 } from 'lucide-react';
import { getTourSteps, markTourCompleted } from './TourSteps';
import { COLOR_PRIMARIO } from '../constantes';

const GuidedTour = ({ user, run = false, onComplete }) => {
  const [steps, setSteps] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);
  const overlayRef = useRef(null);

  // Iniciar tour
  useEffect(() => {
    if (run && user) {
      const tourSteps = getTourSteps(user);
      setSteps(tourSteps);
      setCurrentIdx(0);
      setIsVisible(true);
    }
    if (!run) {
      setIsVisible(false);
    }
  }, [run, user]);

  // Buscar el elemento target y posicionar tooltip
  const locateTarget = useCallback((idx) => {
    if (!steps[idx]) return false;
    const target = document.querySelector(steps[idx].target);
    if (!target) {
      console.warn('[Tour] Target no encontrado:', steps[idx].target);
      return false;
    }
    const rect = target.getBoundingClientRect();
    setTargetRect(rect);

    // Posicionar tooltip debajo del target (o arriba si no cabe)
    const tooltipHeight = 200;
    const tooltipWidth = 380;
    const gap = 12;

    let top = rect.bottom + gap;
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);

    // Si no cabe abajo, poner arriba
    if (top + tooltipHeight > window.innerHeight) {
      top = rect.top - tooltipHeight - gap;
    }

    // Si se sale por la izquierda
    if (left < 10) left = 10;
    // Si se sale por la derecha
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    setTooltipPos({ top: Math.max(10, top), left });
    return true;
  }, [steps]);

  // Cuando cambia el paso, ubicar el target
  useEffect(() => {
    if (!isVisible || steps.length === 0) return;

    // Si el target no existe, saltar al siguiente
    let attempts = 0;
    const tryLocate = () => {
      if (locateTarget(currentIdx)) return;
      attempts++;
      if (attempts > steps.length) {
        // Todos fallaron, terminar tour
        handleFinish();
        return;
      }
      // Saltar al siguiente paso
      setCurrentIdx(prev => prev + 1);
    };

    // Delay para asegurar que el DOM esta listo
    const timer = setTimeout(tryLocate, 100);
    return () => clearTimeout(timer);
  }, [currentIdx, isVisible, steps, locateTarget]);

  // Scroll al target si esta fuera de viewport
  useEffect(() => {
    if (targetRect) {
      const target = steps[currentIdx] ? document.querySelector(steps[currentIdx].target) : null;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [targetRect, currentIdx, steps]);

  const handleNext = () => {
    if (currentIdx < steps.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleFinish = () => {
    markTourCompleted(user);
    setIsVisible(false);
    setSteps([]);
    setCurrentIdx(0);
    setTargetRect(null);
    if (onComplete) onComplete();
  };

  const handleSkip = () => {
    markTourCompleted(user);
    setIsVisible(false);
    setSteps([]);
    setCurrentIdx(0);
    setTargetRect(null);
    if (onComplete) onComplete();
  };

  if (!isVisible || steps.length === 0 || !steps[currentIdx]) return null;

  const step = steps[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === steps.length - 1;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[10000]">
      {/* Overlay oscuro con hueco para el target */}
      <div className="absolute inset-0" style={{ pointerEvents: 'auto' }}>
        {/* Cuatro sombras para crear el "hueco" */}
        {targetRect && (
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect 
                  x={targetRect.left - 6} 
                  y={targetRect.top - 6} 
                  width={targetRect.width + 12} 
                  height={targetRect.height + 12} 
                  rx="8" 
                  fill="black" 
                />
              </mask>
            </defs>
            <rect 
              width="100%" 
              height="100%" 
              fill="rgba(0,0,0,0.5)" 
              mask="url(#tour-mask)"
              onClick={handleSkip}
            />
          </svg>
        )}

        {/* Borde brillante alrededor del target */}
        {targetRect && (
          <div 
            className="absolute border-2 rounded-lg animate-pulse"
            style={{
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
              borderColor: COLOR_PRIMARIO,
              boxShadow: `0 0 20px ${COLOR_PRIMARIO}40`,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div 
        ref={tooltipRef}
        className="absolute bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
        style={{ 
          top: tooltipPos.top, 
          left: tooltipPos.left, 
          width: '380px',
          maxWidth: 'calc(100vw - 20px)',
          pointerEvents: 'auto',
        }}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-gray-800">{step.title}</h3>
            <button 
              onClick={handleSkip}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Barra de progreso */}
          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                backgroundColor: COLOR_PRIMARIO,
                width: `${((currentIdx + 1) / steps.length) * 100}%`
              }}
            />
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            Paso {currentIdx + 1} de {steps.length}
          </div>
        </div>

        {/* Contenido */}
        <div className="px-5 pb-4">
          <p className="text-sm text-gray-600 leading-relaxed">{step.content}</p>
        </div>

        {/* Botones */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <div>
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Atras
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSkip}
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Saltar
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-all flex items-center gap-1"
              style={{ backgroundColor: COLOR_PRIMARIO }}
            >
              {isLast ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Entendido</>
              ) : (
                <>Siguiente <ChevronRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>
        </div>

        {/* Indicadores */}
        <div className="px-5 pb-3 flex justify-center gap-1">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === currentIdx ? 'w-5' : 'w-1.5 hover:w-3'
              }`}
              style={{
                backgroundColor: i === currentIdx 
                  ? COLOR_PRIMARIO 
                  : i < currentIdx 
                    ? '#6ee7b7' 
                    : '#e5e7eb'
              }}
              title={s.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
