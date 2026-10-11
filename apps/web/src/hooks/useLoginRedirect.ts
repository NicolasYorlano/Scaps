import { useLocation, useNavigate } from 'react-router';
import { loginState } from '../lib/login-redirect';

/**
 * Para mandar al login desde un botón de una pantalla pública: al ingresar o
 * crear la cuenta, la persona vuelve a esa pantalla, con sus parámetros.
 */
export function useLoginRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  // Sin `replace`: Atrás desde el login vuelve a la pantalla.
  return () => {
    void navigate('/login', { state: loginState(location) });
  };
}
