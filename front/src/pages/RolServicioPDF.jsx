// src/pages/RolServicioPDF.jsx
// Documento PDF REAL (A4 vertical / portrait) del ROL DE SERVICIO.
// Generado con @react-pdf/renderer para descarga directa.
// El bloque EFECTIVOS POR CODIGO / SITUACIONES / SEXO / VACACIONES
// es manejo interno del hospital y NO se imprime.
//
// Notas:
//  - Helvetica no mapea emojis: todo el texto se sanea con limpiar().
//  - Los anchos de columna SUMAN 100% para no dejar hueco a la derecha.
//  - Vehiculos van lado a lado (lista | disponibilidad) para no ocupar tanto.

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const TURNOS_DESCANSO = [
  'FRANCO', 'VACACIONES', 'DESCANSO MEDICO', 'PERMISO A CUENTA DE VACACIONES',
  'REFERIDO A LIMA', 'ADAPTACION A LA VIDA CIVIL', 'LICENCIA DE GRAVIDEZ',
  'SOMETIDO A LEY', 'EXTERNO', 'RETEN',
];

// Helvetica no mapea emojis ni simbolos exoticos: al quitarlos evitas
// cajas raras (□) en el PDF.
function limpiar(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/[\u{1F000}-\u{1FAFF}]/gu, '')  // Emoji / pictograficos
    .replace(/[\u{2600}-\u{27BF}]/gu, '')    // Simbolos miscelaneos
    .replace(/[\u{2B00}-\u{2BFF}]/gu, '')    // Flechas / simbolos varios
    .replace(/[\u{FE0F}\u{200D}\u{20E3}]/gu, '') // Variacion selecc. / joiners
    .replace(/[\u{00A9}\u{00AE}\u{2122}]/gu, '') // (c) (r) (tm)
    .replace(/\s+/g, ' ')
    .trim();
}

const pdfStyles = StyleSheet.create({
  page: { padding: 22, paddingTop: 15, fontSize: 6, fontFamily: 'Helvetica' },
  header: { textAlign: 'center', marginBottom: 6 },
  headerLogo: { width: 36, height: 36, alignSelf: 'center', marginBottom: 3 },
  title: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  subtitle: { fontSize: 8, fontWeight: 'bold', marginTop: 2 },
  infoRow: { fontSize: 5, color: '#555', marginTop: 1 },

  resumenSection: { marginBottom: 5, borderWidth: 0.5, borderColor: '#999', padding: 4 },
  resumenTitle: { fontSize: 6.5, fontWeight: 'bold', textAlign: 'center', marginBottom: 3 },
  resumenRow: { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: '#ccc' },
  resumenHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: 0.5, borderBottomColor: '#999' },
  resumenCellLabel: { width: '16%', padding: 1.5, fontSize: 5.2, fontWeight: 'bold', borderRightWidth: 0.3, borderRightColor: '#ccc' },
  resumenCell: { width: '14%', padding: 1.5, textAlign: 'center', fontSize: 5.2, borderRightWidth: 0.3, borderRightColor: '#ccc' },
  resumenCellTotal: { width: '14%', padding: 1.5, textAlign: 'center', fontSize: 5.2, fontWeight: 'bold', backgroundColor: '#f9fafb' },

  // Vehiculos: seccion compacta, lista y disponibilidad lado a lado
  vehiculosSection: { marginBottom: 5, borderWidth: 0.5, borderColor: '#999', padding: 4 },
  vehiculosTitle: { fontSize: 6.5, fontWeight: 'bold', textAlign: 'center', marginBottom: 3 },
  vehiculosRow: { flexDirection: 'row', gap: 4 },
  vehiculosCol: { flex: 1 },
  vRow: { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: '#ccc' },
  vHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: 0.5, borderBottomColor: '#999' },
  vCellNum: { width: '14%', padding: 1.5, fontSize: 5.2, textAlign: 'center', borderRightWidth: 0.3, borderRightColor: '#ccc' },
  vCellTipo: { width: '46%', padding: 1.5, fontSize: 5.2, borderRightWidth: 0.3, borderRightColor: '#ccc' },
  vCellPlaca: { width: '40%', padding: 1.5, fontSize: 5.2, borderRightWidth: 0.3, borderRightColor: '#ccc' },
  vCellCond: { width: '44%', padding: 1.5, fontSize: 5.2, borderRightWidth: 0.3, borderRightColor: '#ccc' },
  vCellVal: { width: '16%', padding: 1.5, textAlign: 'center', fontSize: 5.2, borderRightWidth: 0.3, borderRightColor: '#ccc' },
  vCellValLast: { width: '24%', padding: 1.5, textAlign: 'center', fontSize: 5.2 },

  table: { width: '100%', borderStyle: 'solid', borderWidth: 0.3, borderColor: '#999', marginTop: 2 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderBottomWidth: 0.5, borderBottomColor: '#999' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.2, borderBottomColor: '#ddd' },
  // Anchos: N° CODIGO GRADO APELLIDOS AREA TURNO ENT SAL CELULAR = 100%
  cellNum: { width: '4%', padding: 1.5, textAlign: 'center', fontSize: 5.2, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellCodigo: { width: '7%', padding: 1.5, textAlign: 'center', fontSize: 5.2, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellGrado: { width: '10%', padding: 1.5, fontSize: 5.2, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellNombre: { width: '24%', padding: 1.5, fontSize: 5.2, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellArea: { width: '17%', padding: 1.5, fontSize: 5, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellTurno: { width: '13%', padding: 1.5, textAlign: 'center', fontSize: 5, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellEntrada: { width: '7%', padding: 1.5, textAlign: 'center', fontSize: 5.2, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellSalida: { width: '7%', padding: 1.5, textAlign: 'center', fontSize: 5.2, borderRightWidth: 0.2, borderRightColor: '#ddd' },
  cellCelular: { width: '11%', padding: 1.5, textAlign: 'center', fontSize: 5.2 },
  headerCell: { fontWeight: 'bold', fontSize: 5.2, color: '#374151' },
  descanso: { color: '#DC2626' },
});

const COLUMNAS = ['N°', 'CODIGO', 'GRADO', 'APELLIDOS Y NOMBRES', 'AREA', 'TURNO', 'ENT.', 'SAL.', 'CELULAR'];
const ESTILOS_COLUMNA = [pdfStyles.cellNum, pdfStyles.cellCodigo, pdfStyles.cellGrado, pdfStyles.cellNombre, pdfStyles.cellArea, pdfStyles.cellTurno, pdfStyles.cellEntrada, pdfStyles.cellSalida, pdfStyles.cellCelular];

const RolServicioPDF = ({ data }) => {
  const resumen = data.resumen;
  const etiquetas = ['OFC. ARMAS', 'OFC. SERVICIOS', 'SUB. ARMAS', 'SUB. SERVICIOS', 'CIVIL'];

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Encabezado */}
        <View style={pdfStyles.header}>
          <Image src="/images/escudo-sanidad.png" style={pdfStyles.headerLogo} />
          <Text style={pdfStyles.title}>ROL DE SERVICIO</Text>
          <Text style={pdfStyles.subtitle}>{limpiar(data.titulo)}</Text>
          <View style={pdfStyles.infoRow}>
            <Text>
              {(data.contactos || []).map((c, i) => `${limpiar(c.label)}: ${limpiar(c.valor)}${i < data.contactos.length - 1 ? ' | ' : ''}`).join('')}
            </Text>
          </View>
        </View>

        {/* Resumen PERSONAL */}
        <View style={pdfStyles.resumenSection}>
          <Text style={pdfStyles.resumenTitle}>PERSONAL DEL HOSPITAL REGIONAL POLICIAL AREQUIPA - DÍA {data.dia}</Text>
          <View style={pdfStyles.resumenHeader}>
            <View style={pdfStyles.resumenCellLabel}><Text>PERSONAL</Text></View>
            {etiquetas.map((e, i) => <View key={i} style={pdfStyles.resumenCell}><Text>{e}</Text></View>)}
            <View style={pdfStyles.resumenCellTotal}><Text>TOTAL</Text></View>
          </View>
          <View style={pdfStyles.resumenRow}>
            <View style={pdfStyles.resumenCellLabel}><Text>EFECTIVOS</Text></View>
            {resumen.efectivos.por_grupo.map((v, i) => <View key={i} style={pdfStyles.resumenCell}><Text>{v}</Text></View>)}
            <View style={pdfStyles.resumenCellTotal}><Text>{resumen.efectivos.total}</Text></View>
          </View>
          <View style={pdfStyles.resumenRow}>
            <View style={pdfStyles.resumenCellLabel}><Text>DESCUENTOS</Text></View>
            {resumen.descuentos.por_grupo.map((v, i) => <View key={i} style={pdfStyles.resumenCell}><Text>{v}</Text></View>)}
            <View style={pdfStyles.resumenCellTotal}><Text>{resumen.descuentos.total}</Text></View>
          </View>
          <View style={pdfStyles.resumenRow}>
            <View style={pdfStyles.resumenCellLabel}><Text>DISPONIBLES</Text></View>
            {resumen.disponibles.por_grupo.map((v, i) => <View key={i} style={pdfStyles.resumenCell}><Text>{v}</Text></View>)}
            <View style={pdfStyles.resumenCellTotal}><Text>{resumen.disponibles.total}</Text></View>
          </View>
        </View>

        {/* Vehiculos — compacto: lista y disponibilidad lado a lado */}
        {(data.vehiculos.lista || []).length > 0 || (data.vehiculos.matriz || []).length > 0 ? (
          <View style={pdfStyles.vehiculosSection}>
            <Text style={pdfStyles.vehiculosTitle}>VEHICULOS</Text>
            <View style={pdfStyles.vehiculosRow}>
              {(data.vehiculos.lista || []).length > 0 && (
                <View style={pdfStyles.vehiculosCol}>
                  <View style={pdfStyles.vHeader}>
                    <View style={pdfStyles.vCellNum}><Text style={pdfStyles.headerCell}>N°</Text></View>
                    <View style={pdfStyles.vCellTipo}><Text style={pdfStyles.headerCell}>TIPO</Text></View>
                    <View style={pdfStyles.vCellPlaca}><Text style={pdfStyles.headerCell}>PLACA</Text></View>
                  </View>
                  {data.vehiculos.lista.map((v) => (
                    <View key={v.n} style={pdfStyles.vRow}>
                      <View style={pdfStyles.vCellNum}><Text>{limpiar(v.n)}</Text></View>
                      <View style={pdfStyles.vCellTipo}><Text>{limpiar(v.tipo)}</Text></View>
                      <View style={pdfStyles.vCellPlaca}><Text>{limpiar(v.placa)}</Text></View>
                    </View>
                  ))}
                </View>
              )}
              {(data.vehiculos.matriz || []).length > 0 && (
                <View style={pdfStyles.vehiculosCol}>
                  <Text style={{ fontSize: 5.5, fontWeight: 'bold', marginBottom: 1 }}>DISPONIBILIDAD</Text>
                  <View style={pdfStyles.vHeader}>
                    <View style={pdfStyles.vCellCond}><Text style={pdfStyles.headerCell}>CONDICION</Text></View>
                    <View style={pdfStyles.vCellVal}><Text style={pdfStyles.headerCell}>AMB.</Text></View>
                    <View style={pdfStyles.vCellVal}><Text style={pdfStyles.headerCell}>V.COM.</Text></View>
                    <View style={pdfStyles.vCellValLast}><Text style={pdfStyles.headerCell}>TOTAL</Text></View>
                  </View>
                  {data.vehiculos.matriz.map((m, i) => (
                    <View key={`m${i}`} style={pdfStyles.vRow}>
                      <View style={pdfStyles.vCellCond}><Text>{limpiar(m.etiqueta)}</Text></View>
                      <View style={pdfStyles.vCellVal}><Text>{m.ambulancia}</Text></View>
                      <View style={pdfStyles.vCellVal}><Text>{m.vcomando}</Text></View>
                      <View style={pdfStyles.vCellValLast}><Text style={{ fontWeight: 'bold' }}>{m.total}</Text></View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* Tabla principal */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            {COLUMNAS.map((c, i) => (
              <View key={i} style={ESTILOS_COLUMNA[i]} wrap={false}>
                <Text style={pdfStyles.headerCell}>{c}</Text>
              </View>
            ))}
          </View>
          {data.filas.map((f) => {
            const ed = TURNOS_DESCANSO.includes(f.turno);
            return (
              <View style={pdfStyles.tableRow} key={f.n}>
                <View style={pdfStyles.cellNum}><Text>{limpiar(f.n)}</Text></View>
                <View style={pdfStyles.cellCodigo}><Text>{limpiar(f.codigo)}</Text></View>
                <View style={pdfStyles.cellGrado}><Text style={ed ? pdfStyles.descanso : {}}>{limpiar(f.grado)}</Text></View>
                <View style={pdfStyles.cellNombre}><Text style={ed ? pdfStyles.descanso : {}}>{limpiar(f.apellidos)}</Text></View>
                <View style={pdfStyles.cellArea}><Text>{limpiar(f.area)}</Text></View>
                <View style={pdfStyles.cellTurno}>
                  <Text style={{ fontSize: 5 }}>{limpiar(f.turno)}</Text>
                </View>
                <View style={pdfStyles.cellEntrada}><Text>{limpiar(f.entrada)}</Text></View>
                <View style={pdfStyles.cellSalida}><Text>{limpiar(f.salida)}</Text></View>
                <View style={pdfStyles.cellCelular}><Text>{limpiar(f.celular)}</Text></View>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
};

export default RolServicioPDF;