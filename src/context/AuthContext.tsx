import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CredencialesLogin, RegistroUsuarioInput, Usuario, AuthResponse } from '../types/auth';

interface AuthContextValue {
  user: Usuario | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: CredencialesLogin) => Promise<Usuario>;
  register: (input: RegistroUsuarioInput) => Promise<void>;
  updateUser: (user: Usuario) => void;
  logout: () => void;
  clearError: () => void;
}

const STORAGE_KEY = 'clb_auth';
const TOKEN_STORAGE_KEY = 'clb_token';
const AuthContext = createContext<AuthContextValue | null>(null);

const readAuthResponse = async (response: Response): Promise<AuthResponse> => {
  const body = await response.text();

  if (!body.trim()) {
    return {
      success: false,
      message: `El servidor no devolvió una respuesta válida (${response.status}).`,
    };
  }

  try {
    return JSON.parse(body) as AuthResponse;
  } catch {
    return {
      success: false,
      message: `El servidor devolvió una respuesta inválida (${response.status}).`,
    };
  }
};

interface StoredSession {
  user: Usuario;
  token: string;
}

const readSession = (): StoredSession | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored && token) {
      return { user: JSON.parse(stored), token };
    }
    return null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [session, setSession] = useState<StoredSession | null>(readSession);
  const [isLoading, setIsLoading] = useState(() => Boolean(readSession()));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session.user));
      localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const validateSession = async (): Promise<void> => {
      try {
        const response = await fetch('/api/users/profile', {
          headers: { Authorization: `Bearer ${session.token}` },
        });

        if (response.status === 401 && isActive) {
          setSession(null);
          setError('Tu sesión expiró. Inicia sesión nuevamente.');
        }
      } catch {
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void validateSession();
    return () => {
      isActive = false;
    };
  }, []);

  const login = async (credentials: CredencialesLogin): Promise<Usuario> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await readAuthResponse(response);

      if (!response.ok || !data.user || !data.token) {
        throw new Error(data.message || 'Correo electrónico o contraseña incorrectos');
      }

      const newSession = { user: data.user, token: data.token };
      setSession(newSession);
      return data.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (input: RegistroUsuarioInput): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: input.nombre,
          apellido: input.apellido,
          correo: input.correo,
          password: input.password,
          passwordConfirm: input.passwordConfirm ?? input.password,
          departamento: input.departamento,
        }),
      });

      const data = await readAuthResponse(response);

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo registrar la cuenta');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      void fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    setSession(null);
    setError(null);
  };

  const updateUser = (user: Usuario): void => {
    setSession((current) => current ? { ...current, user } : current);
  };

  const clearError = (): void => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user || null,
        token: session?.token || null,
        isLoading,
        error,
        isAuthenticated: !!session,
        login,
        register,
        updateUser,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};
