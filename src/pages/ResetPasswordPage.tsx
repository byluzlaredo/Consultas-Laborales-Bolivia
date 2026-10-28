import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPasswordRequirementsMessage } from '../utils/passwordValidation';

interface ResetPasswordForm {
  passwordNueva: string;
  passwordConfirm: string;
}

interface FormErrors {
  passwordNueva?: string;
  passwordConfirm?: string;
  general?: string;
  success?: string;
}

export default function ResetPasswordPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [form, setForm] = useState<ResetPasswordForm>({ passwordNueva: '', passwordConfirm: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);

  useEffect(() => {
    if (!token) {
      setErrors({ general: 'Token no proporcionado. Por favor, solicita un nuevo enlace de recuperación.' });
      setIsTokenValid(false);
      return;
    }

    fetch(`/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({} as { message?: string }));
          throw new Error(data.message || 'El enlace de recuperación no es válido.');
        }
        setIsTokenValid(true);
      })
      .catch((error: unknown) => {
        setErrors({ general: error instanceof Error ? error.message : 'El enlace de recuperación no es válido.' });
        setIsTokenValid(false);
      });
  }, [token]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.passwordNueva.trim()) {
      newErrors.passwordNueva = 'La contraseña es requerida';
    } else {
      const passwordError = getPasswordRequirementsMessage(form.passwordNueva);
      if (passwordError) newErrors.passwordNueva = passwordError;
    }

    if (!form.passwordConfirm.trim()) {
      newErrors.passwordConfirm = 'Confirma tu contraseña';
    } else if (form.passwordNueva !== form.passwordConfirm) {
      newErrors.passwordConfirm = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!validateForm() || !token) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          passwordNueva: form.passwordNueva,
          passwordConfirm: form.passwordConfirm,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrors({
          general: data.message || 'Error al resetear la contraseña. Por favor, intenta de nuevo.',
        });
        setIsLoading(false);
        return;
      }

      setErrors({ success: 'Contraseña actualizada exitosamente. Redirigiendo a inicio de sesión...' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Error de conexión. Por favor, intenta de nuevo.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
        <div className="grid lg:grid-cols-2">
          {/* Left side - Hero section */}
          <div className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-hero p-8 text-white lg:flex">
            <div className="absolute inset-0 bg-[#1F4E34]/20" />
            <div className="relative z-10 flex w-full justify-center items-center">
              <img
                src="/Imagenes/LogoSinFondo.png"
                alt="Logo"
                className="h-32 w-auto object-contain mx-auto"
              />
            </div>

            <div className="relative z-10 space-y-1">
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#E8D6A0]">Recuperación</p>
              <h1 className="max-w-md text-4xl font-bold leading-tight">Recupera tu acceso.</h1>
              <p className="max-w-md text-base text-slate-100/90">
                Establece una nueva contraseña segura para continuar utilizando tu cuenta.
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-3 text-sm text-slate-100/90">
              <span className="h-2 w-2 rounded-full bg-[#C49A45] shadow-[0_0_18px_rgba(196,154,69,0.8)]" />
              Tu contraseña estará protegida.
            </div>

            <span className="glow-node left-[12%] top-[22%]" />
            <span className="glow-node right-[22%] top-[18%]" />
            <span className="glow-node left-[60%] bottom-[20%]" />
            <span className="glow-node right-[18%] top-[52%]" />
          </div>

          {/* Right side - Form */}
          <div className="flex items-center justify-center bg-white p-6 sm:p-10">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center lg:text-left">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C49A45]">Contraseña Nueva</p>
                <h2 className="mt-3 text-3xl font-bold text-[#1F4E34]">Resetear Contraseña</h2>
              </div>

              {!isTokenValid ? (
                <div className="rounded-xl border border-[#8B0000]/20 bg-[#8B0000]/5 px-4 py-3 text-sm text-[#8B0000]">
                  {errors.general || 'Token inválido o expirado.'}
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                  <div>
                    <label htmlFor="passwordNueva" className="mb-2 block text-sm font-medium text-slate-700">
                      Nueva Contraseña
                    </label>
                    <input
                      id="passwordNueva"
                      name="passwordNueva"
                      type="password"
                      value={form.passwordNueva}
                      onChange={handleChange}
                      className={`input-field ${errors.passwordNueva ? 'border-red-500 bg-red-50' : ''}`}
                      placeholder="Mínimo 8 caracteres"
                      disabled={isLoading}
                    />
                    {errors.passwordNueva && (
                      <p className="mt-1 text-xs text-red-600">{errors.passwordNueva}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="passwordConfirm" className="mb-2 block text-sm font-medium text-slate-700">
                      Confirmar Contraseña
                    </label>
                    <input
                      id="passwordConfirm"
                      name="passwordConfirm"
                      type="password"
                      value={form.passwordConfirm}
                      onChange={handleChange}
                      className={`input-field ${errors.passwordConfirm ? 'border-red-500 bg-red-50' : ''}`}
                      placeholder="Repite tu contraseña"
                      disabled={isLoading}
                    />
                    {errors.passwordConfirm && (
                      <p className="mt-1 text-xs text-red-600">{errors.passwordConfirm}</p>
                    )}
                  </div>

                  {errors.general && (
                    <div className="rounded-xl border border-[#8B0000]/20 bg-[#8B0000]/5 px-4 py-3 text-sm text-[#8B0000]">
                      {errors.general}
                    </div>
                  )}

                  {errors.success && (
                    <div className="rounded-xl border border-[#1F4E34]/20 bg-[#1F4E34]/5 px-4 py-3 text-sm text-[#1F4E34]">
                      {errors.success}
                    </div>
                  )}

                  <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={isLoading}>
                    {isLoading ? 'Procesando...' : 'Actualizar Contraseña'}
                  </button>
                </form>
              )}

              {isTokenValid && (
                <p className="mt-6 text-center text-sm text-slate-600">
                  Recuerda usar una contraseña fuerte con mayúsculas, números y caracteres especiales.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
