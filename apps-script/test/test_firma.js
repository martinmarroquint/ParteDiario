// Prueba de la firma HMAC entre backend (Python) y Apps Script (doPost real).
// Uso: node apps-script/test/test_firma.js <firmas.json>
// firmas.json lo genera el backend (ver backend/tests/generar_firmas.py).
// Simula el peor caso: que Google NO use UTF-8 si no se le indica.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SECRETO = 'clave-de-prueba-123';
const casos = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

function cargarScript(secreto) {
  const mocks = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => null, insertSheet: () => ({ getRange: () => ({ setValues() { return this; }, setValue() { return this; }, getValue: () => '' }) }) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() { } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => secreto }) },
    ContentService: { createTextOutput: (t) => ({ setMimeType() { }, getContent: () => t }), MimeType: { JSON: 'json', TEXT: 'text' } },
    Utilities: {
      Charset: { UTF_8: 'UTF_8' },
      // Sin charset se simula una codificacion distinta de UTF-8 (el riesgo real).
      computeHmacSha256Signature: (valor, clave, charset) => {
        const buf = Buffer.from(valor, charset === 'UTF_8' ? 'utf8' : 'latin1');
        return Array.from(crypto.createHmac('sha256', clave).update(buf).digest()).map(b => (b > 127 ? b - 256 : b));
      },
    },
    console: { log() { }, warn() { }, error() { } },
  };
  const code = fs.readFileSync(path.join(__dirname, '..', 'apps_script_solicitudes_cambios.gs'), 'utf8');
  return new Function(...Object.keys(mocks), code + '\nreturn { doPost };')(...Object.values(mocks));
}

let fallas = 0, total = 0;
function check(nombre, ok) { total++; if (!ok) fallas++; console.info(`[${ok ? 'OK ' : 'FALLA'}] ${nombre}`); }
const resp = (api, body) => JSON.parse(api.doPost({ postData: { contents: body } }).getContent());
const rechazada = (r) => r.success === false && /Firma/.test(r.error || '');

const conFirma = cargarScript(SECRETO);
casos.forEach((c) => {
  const accion = JSON.parse(c.enviado).accion;
  check(`firma del backend aceptada (con tildes/Ñ): ${accion}`, !rechazada(resp(conFirma, c.enviado)));
});
const sinFirma = JSON.parse(casos[0].enviado); delete sinFirma._signature;
check('peticion SIN firma rechazada', rechazada(resp(conFirma, JSON.stringify(sinFirma))));
const alterada = JSON.parse(casos[0].enviado); alterada.valor = 'TARDE';
check('peticion ALTERADA rechazada', rechazada(resp(conFirma, JSON.stringify(alterada))));
const otraClave = cargarScript('otra-clave');
check('firma con clave distinta rechazada', rechazada(resp(otraClave, casos[0].enviado)));
const ping = resp(conFirma, casos[casos.length - 1].enviado.replace(/"accion":"[^"]+"/, '"accion":"ping"'));
check('ping informa firma activa (o la rechaza si se altero)', ping.firma === 'activa' || rechazada(ping));
const sinSecreto = cargarScript('');
check('sin HMAC_SECRET en el script: acepta (modo transicion)', !rechazada(resp(sinSecreto, JSON.stringify(sinFirma))));
check('sin HMAC_SECRET: ping dice "inactiva"', resp(sinSecreto, '{"accion":"ping"}').firma === 'inactiva');

console.info(`\nRESULTADO: ${total - fallas}/${total} pruebas OK`);
process.exit(fallas ? 1 : 0);
