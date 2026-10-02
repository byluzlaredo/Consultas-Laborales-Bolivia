import { type ChangeEvent, type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

interface ForgotPasswordForm {
  correo: string;
}

interface FormErrors {
  correo?: string;
  general?: string;
  success?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage(): JSX.Element {
  const [form, setForm] = useState<ForgotPasswordForm>({ correo: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.correo.trim()) {
      newErrors.correo = 'El correo es requerido';
    } else if (!EMAIL_PATTERN.test(form.correo)) {
      newErrors.correo = 'Ingresa un correo válido';
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

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo: form.correo,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        let data: { message?: string } = {};

        try {
          data = body ? (JSON.parse(body) as { message?: string }) : {};
        } catch {
          data = {};
        }

        setErrors({
          general:
            data.message ||
            `El servidor no devolvió una respuesta válida (${response.status}). Por favor, intenta de nuevo.`,
        });
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
      setErrors({ success: 'Si el correo existe en nuestro sistema, recibirás un enlace de recuperación.' });
      setIsLoading(false);
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
              <h1 className="max-w-md text-4xl font-bold leading-tight">Recupera tu acceso fácilmente.</h1>
              <p className="max-w-md text-base text-slate-100/90">
                Ingresa tu correo electrónico y te enviaremos un enlace para resetear tu contraseña.
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-3 text-sm text-slate-100/90">
              <span className="h-2 w-2 rounded-full bg-[#C49A45] shadow-[0_0_18px_rgba(196,154,69,0.8)]" />
              Seguro y rápido.
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
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C49A45]">Ayuda</p>
                <h2 className="mt-3 text-3xl font-bold text-[#1F4E34]">¿Olvidaste tu contraseña?</h2>
              </div>

              {isSubmitted ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#1F4E34]/20 bg-[#1F4E34]/5 px-4 py-3 text-sm text-[#1F4E34]">
                    {errors.success || 'Solicitud procesada correctamente.'}
                  </div>
                  <p className="text-sm text-slate-600">
                    Si la dirección de correo está registrada en nuestro sistema, recibirás un enlace de recuperación en los próximos minutos.
                  </p>
                  <p className="text-sm text-slate-600">
                    Revisa tu carpeta de spam si no ves el correo en tu bandeja de entrada.
                  </p>
                  <Link to="/login" className="btn-primary block w-full py-3.5 text-center text-base">
                    Volver a Iniciar Sesión
                  </Link>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                  <div>
                    <label htmlFor="correo" className="mb-2 block text-sm font-medium text-slate-700">
                      Correo Electrónico
                    </label>
                    <input
                      id="correo"
                      name="correo"
                      type="email"
                      value={form.correo}
                      onChange={handleChange}
                      className={`input-field ${errors.correo ? 'border-red-500 bg-red-50' : ''}`}
                      placeholder="correo@ejemplo.com"
                      disabled={isLoading}
                    />
                    {errors.correo && (
                      <p className="mt-1 text-xs text-red-600">{errors.correo}</p>
                    )}
                  </div>

                  {errors.general && (
                    <div className="rounded-xl border border-[#8B0000]/20 bg-[#8B0000]/5 px-4 py-3 text-sm text-[#8B0000]">
                      {errors.general}
                    </div>
                  )}

                  <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={isLoading}>
                    {isLoading ? 'Procesando...' : 'Enviar Enlace de Recuperación'}
                  </button>
                </form>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-600">
                  ¿Ya tienes una cuenta?{' '}
                  <Link to="/login" className="font-semibold text-[#1F4E34] transition hover:text-[#C49A45]">
                    Inicia sesión
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
