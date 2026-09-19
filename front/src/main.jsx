import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from 'buffer';
import App from './App';
import './index.css';

// Polyfill global de Buffer: @react-pdf/renderer lo necesita en el navegador
// para procesar imagenes (escudo). Sin esto lanza "Buffer is not defined"
// en cada render del PDF.
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
