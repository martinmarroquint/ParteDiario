/**
 * Custom hook: Calcula francos invalidos (descansos de 3+ dias seguidos).
 * Compartido entre PanelTrabajo y MobileRolView para eliminar duplicacion.
 */
import { useMemo } from 'react';

// Costantes de turnos
const TURNO_FRANCO = 'F';
const FRANCOS_MINIMOS = 3;

/**
 * Calcula francos invalidos para todo el personal.
 * @param {Array} personal - Lista de empleados
 * @param {Object} turnos - Mapa de turnos {personId: {dia: turno}}
 * @param {number} totalDiasMes - Total de dias del mes
 * @param {Function} esPersonalCivil - Funcion para verificar si es personal civil
 * @returns {Object} Mapa de {personId: [{inicio, fin, cantidad, dias}]}
 */
export function useFrancosInvalidos(personal, turnos, totalDiasMes, esPersonalCivil) {
  return useMemo(() => {
    const invalidaciones = {};
    
    personal.forEach(emp => {
      if (esPersonalCivil(emp.grado)) return;
      
      let contadorFrancos = 0;
      let inicioFrancos = null;
      let diasFrancos = [];
      
      for (let d = 1; d <= totalDiasMes; d++) {
        const turno = turnos[emp.id]?.[d] || '';
        
        if (turno === TURNO_FRANCO) {
          if (contadorFrancos === 0) inicioFrancos = d;
          contadorFrancos++;
          diasFrancos.push(d);
        } else {
          if (contadorFrancos >= FRANCOS_MINIMOS) {
            if (!invalidaciones[emp.id]) invalidaciones[emp.id] = [];
            invalidaciones[emp.id].push({
              inicio: inicioFrancos,
              fin: d - 1,
              cantidad: contadorFrancos,
              dias: [...diasFrancos]
            });
          }
          contadorFrancos = 0;
          inicioFrancos = null;
          diasFrancos = [];
        }
      }
      
      // Verificar franco al final del mes
      if (contadorFrancos >= FRANCOS_MINIMOS) {
        if (!invalidaciones[emp.id]) invalidaciones[emp.id] = [];
        invalidaciones[emp.id].push({
          inicio: inicioFrancos,
          fin: totalDiasMes,
          cantidad: contadorFrancos,
          dias: [...diasFrancos]
        });
      }
    });
    
    return invalidaciones;
  }, [personal, turnos, totalDiasMes, esPersonalCivil]);
}

/**
 * Helper: Obtiene estadisticas de francos invalidos.
 */
export function useFrancosStats(francosInvalidos) {
  const totalFrancosInvalidos = useMemo(
    () => Object.keys(francosInvalidos).length,
    [francosInvalidos]
  );
  
  const totalInfraccionesFrancos = useMemo(
    () => Object.values(francosInvalidos).reduce((s, i) => s + i.length, 0),
    [francosInvalidos]
  );
  
  const idsConFrancosInvalidos = useMemo(
    () => new Set(Object.keys(francosInvalidos).map(Number)),
    [francosInvalidos]
  );
  
  return { totalFrancosInvalidos, totalInfraccionesFrancos, idsConFrancosInvalidos };
}
