// src/components/ocr/hooks/useAuth.js
// Hook para usar el contexto de autenticacion OCR

import { useAuth as useAuthContext } from '../auth/AuthContext';

export const useAuth = () => {
  return useAuthContext();
};