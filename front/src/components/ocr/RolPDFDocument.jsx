// src/components/ocr/RolPDFDocument.jsx
// DOCUMENTO PDF PROFESIONAL - VERSIÓN CORREGIDA
// ✅ Usa TURNO_MAP desde constantes.js (misma fuente que el sistema)
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { TURNO_MAP, MESES, COLOR_PRIMARIO } from './constantes';

const COLOR_PRIMARIO_CLARO = '#ECFDF5';
const COLOR_BARRA = '#064E3B';
const ANIO_ACTUAL = new Date().getFullYear();

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const COL_NUM = 20;
const COL_GRADO = 50;
const COL_NOMBRE = 130;
const COL_HORAS = 35;

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 6.5,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLOR_PRIMARIO,
    paddingBottom: 6,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: 800,
    color: COLOR_PRIMARIO,
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 6.5,
    color: '#64748b',
    fontWeight: 500,
    marginTop: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  codigoArea: {
    fontSize: 9,
    fontWeight: 300,
    color: '#94a3b8',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  fecha: {
    fontSize: 5.5,
    color: '#94a3b8',
  },
  fechaBold: {
    color: '#64748b',
    fontSize: 6,
    fontWeight: 500,
  },
  titleArea: {
    textAlign: 'center',
    marginVertical: 8,
  },
  titleText: {
    fontSize: 11,
    fontWeight: 800,
    color: COLOR_PRIMARIO,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
    backgroundColor: COLOR_PRIMARIO_CLARO,
  },
  infoText: {
    fontSize: 6,
    color: '#334155',
  },
  infoBold: {
    color: COLOR_PRIMARIO,
    fontWeight: 700,
    fontSize: 6.5,
  },
  dot: {
    width: 2.5,
    height: 2.5,
    backgroundColor: '#86B7A0',
    borderRadius: 99,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: 18,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: COLOR_PRIMARIO,
  },
  cellBase: {
    paddingVertical: 2,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  colNum: { 
    width: COL_NUM, 
    alignItems: 'center',
  },
  colGrado: { 
    width: COL_GRADO, 
    paddingLeft: 3,
  },
  colNombre: { 
    width: COL_NOMBRE, 
    paddingLeft: 3,
  },
  colDia: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colHoras: { 
    width: COL_HORAS, 
    alignItems: 'center',
  },
  headerText: {
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 5,
    textTransform: 'uppercase',
  },
  cellTextSmall: { 
    fontSize: 5, 
    color: '#94a3b8',
  },
  cellTextGrado: { 
    fontSize: 5, 
    fontWeight: 600, 
    color: '#475569',
  },
  cellTextNombre: { 
    fontSize: 5.5, 
    fontWeight: 500, 
    color: '#1e293b',
  },
  turnoText: { 
    fontSize: 7, 
    fontWeight: 700,
  },
  horasText: { 
    fontSize: 6, 
    fontWeight: 700, 
    color: '#334155',
  },
  leyenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    padding: 5,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginTop: 6,
    backgroundColor: COLOR_PRIMARIO_CLARO,
    borderRadius: 3,
  },
  leyendaTitle: { 
    fontSize: 5.5, 
    textTransform: 'uppercase', 
    color: COLOR_PRIMARIO, 
    fontWeight: 700,
  },
  leyendaItem: { 
    fontSize: 5, 
    color: '#334155',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    fontSize: 4.5,
    color: '#94a3b8',
  },
  footerSmall: { 
    fontSize: 4,
  },
  codigoVerificacion: {
    fontFamily: 'Courier',
    fontSize: 6,
    color: '#475569',
    letterSpacing: 1.5,
    fontWeight: 700,
    backgroundColor: '#f8fafc',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
});

const FILAS_POR_PAGINA = 20;

const RolPDFDocument = ({ 
  area, mes, anio, personal, turnos, DIAS, 
  codigoArea, responsable, codigoVerificacion, 
  mostrarLeyenda, turnosUsados, 
  fechaStr, horaStr 
}) => {
  // Calcular filas vacías para completar la tabla cuando hay más de 15 personas
  const filasVacias = personal.length > 15 && personal.length < FILAS_POR_PAGINA
    ? FILAS_POR_PAGINA - personal.length
    : 0;

  const calcHoras = (empId) => {
    let horas = 0;
    DIAS.forEach(dia => {
      const codigoTurno = turnos[empId]?.[dia] || '';
      const t = TURNO_MAP[codigoTurno];
      if (t && t.horas) horas += t.horas;
    });
    return horas;
  };

  const getTurnoColor = (codigo) => {
    const t = TURNO_MAP[codigo];
    if (!t) return '#cbd5e1';
    
    if (t.horas === 0) return '#94a3b8';
    if (t.horas === 6) return '#1e293b';
    if (t.horas === 8) return '#2563eb';
    if (t.horas === 12) return '#7c3aed';
    if (t.horas === 24) return '#dc2626';
    return '#1e293b';
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src="/images/escudo-sanidad.png" style={styles.logo} />
            <View>
              <Text style={styles.headerTitle}>Policía Nacional del Perú</Text>
              <Text style={styles.headerSubtitle}>Hospital Regional Policial Arequipa</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {codigoArea ? <Text style={styles.codigoArea}>{codigoArea}</Text> : null}
            <Text style={styles.fecha}>
              <Text style={styles.fechaBold}>{fechaStr}</Text> · {horaStr} hrs
            </Text>
          </View>
        </View>

        <View style={styles.titleArea}>
          <Text style={styles.titleText}>{area}</Text>
        </View>

        <View style={styles.infoBar}>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>{MESES[mes-1].toUpperCase()} {anio}</Text>
          </Text>
          <View style={styles.dot} />
          <Text style={styles.infoText}>
            RESP: <Text style={styles.infoBold}>{responsable.toUpperCase()}</Text>
          </Text>
          <View style={styles.dot} />
          <Text style={styles.infoText}>
            PERSONAL: <Text style={styles.infoBold}>{personal.length}</Text>
          </Text>
          <View style={styles.dot} />
          <Text style={styles.infoText}>
            DÍAS: <Text style={styles.infoBold}>{DIAS.length}</Text>
          </Text>
        </View>

        <View style={styles.tableContainer}>
          
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.cellBase, styles.colNum]}>
              <Text style={styles.headerText}>N°</Text>
            </View>
            <View style={[styles.cellBase, styles.colGrado]}>
              <Text style={styles.headerText}>Grado</Text>
            </View>
            <View style={[styles.cellBase, styles.colNombre]}>
              <Text style={styles.headerText}>Apellidos y Nombres</Text>
            </View>
            {DIAS.map(d => {
              const f = new Date(anio, mes-1, d);
              const dom = f.getDay() === 0;
              return (
                <View key={d} style={[styles.cellBase, styles.colDia, dom ? { backgroundColor: COLOR_BARRA } : {}]}>
                  <Text style={[styles.headerText, { fontSize: 7 }]}>{d}</Text>
                  <Text style={{ color: '#ffffff', fontSize: 5, fontWeight: 600 }}>
                    {DIAS_SEMANA[f.getDay()]?.[0] || ''}
                  </Text>
                </View>
              );
            })}
            <View style={[styles.cellBase, styles.colHoras]}>
              <Text style={[styles.headerText, { fontSize: 5 }]}>HRS</Text>
            </View>
          </View>

          {personal.map((emp, i) => {
            const hrs = calcHoras(emp.id);
            const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
            return (
              <View key={emp.id} style={[styles.tableRow, { backgroundColor: rowBg }]}>
                <View style={[styles.cellBase, styles.colNum]}>
                  <Text style={styles.cellTextSmall}>{i + 1}</Text>
                </View>
                <View style={[styles.cellBase, styles.colGrado]}>
                  <Text style={styles.cellTextGrado}>{emp.grado || ''}</Text>
                </View>
                <View style={[styles.cellBase, styles.colNombre]}>
                  <Text style={styles.cellTextNombre}>{emp.nombre || ''}</Text>
                </View>
                {DIAS.map(d => {
                  const c = turnos[emp.id]?.[d] || '';
                  const f = new Date(anio, mes-1, d);
                  const dom = f.getDay() === 0;
                  const turnoInfo = TURNO_MAP[c];
                  const mostrarCodigo = turnoInfo ? turnoInfo.codigo : (c || '·');
                  
                  return (
                    <View key={d} style={[styles.cellBase, styles.colDia, dom ? { backgroundColor: '#f8fafc' } : {}]}>
                      <Text style={[styles.turnoText, { color: getTurnoColor(c) }]}>
                        {mostrarCodigo}
                      </Text>
                    </View>
                  );
                })}
                <View style={[styles.cellBase, styles.colHoras]}>
                  <Text style={styles.horasText}>{hrs}h</Text>
                </View>
              </View>
            );
          })}

          {filasVacias > 0 && Array.from({ length: filasVacias }).map((_, i) => {
            const idx = personal.length + i;
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            return (
              <View key={`empty-${i}`} style={[styles.tableRow, { backgroundColor: rowBg }]}>
                <View style={[styles.cellBase, styles.colNum]}>
                  <Text style={styles.cellTextSmall}>{idx + 1}</Text>
                </View>
                <View style={[styles.cellBase, styles.colGrado]} />
                <View style={[styles.cellBase, styles.colNombre]} />
                {DIAS.map(d => {
                  const f = new Date(anio, mes-1, d);
                  const dom = f.getDay() === 0;
                  return (
                    <View key={d} style={[styles.cellBase, styles.colDia, dom ? { backgroundColor: '#f8fafc' } : {}]} />
                  );
                })}
                <View style={[styles.cellBase, styles.colHoras]} />
              </View>
            );
          })}
        </View>

        {mostrarLeyenda && turnosUsados && turnosUsados.length > 0 ? (
          <View style={styles.leyenda}>
            <Text style={styles.leyendaTitle}>Leyenda: </Text>
            {turnosUsados.map((c, i) => {
              const t = TURNO_MAP[c];
              if (!t) return null;
              return (
                <Text key={c} style={styles.leyendaItem}>
                  <Text style={{ color: COLOR_PRIMARIO, fontWeight: 700 }}>{t.codigo}</Text>={t.nombre} ({t.horas}h)
                  {i < turnosUsados.length - 1 ? ' | ' : ''}
                </Text>
              );
            })}
          </View>
        ) : null}

        <View style={styles.footer}>
          <View>
            <Text style={{ fontSize: 5 }}>Sistema de Roles PNP v.{ANIO_ACTUAL} · Documento generado automáticamente</Text>
            <Text style={styles.footerSmall}>Este documento es propiedad de la PNP. Su alteración constituye delito.</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.codigoVerificacion}>{codigoVerificacion}</Text>
            <Text style={[styles.footerSmall, { color: '#94a3b8', marginTop: 1 }]}>Código de verificación único</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
};

export default RolPDFDocument;