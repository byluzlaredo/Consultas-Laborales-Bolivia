import { type ChangeEvent, type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CredencialesLogin } from '../types/auth';
import { useAuth } from '../context/AuthContext';

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [form, setForm] = useState<CredencialesLogin>({ correo: '', password: '' });
  const [error, setError] = useState<string>('');

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (!form.correo.trim() || !form.password) {
      setError('Correo electrónico o contraseña incorrectos');
      return;
    }

    void login({ ...form, correo: form.correo.trim().toLowerCase() })
      .then((account) => navigate(account.rol === 'ADMINISTRADOR' ? '/admin/normativa' : '/chat'))
      .catch((loginError: unknown) => setError(loginError instanceof Error ? loginError.message : 'Correo electrónico o contraseña incorrectos'));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
        <div className="grid lg:grid-cols-2">
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
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#E8D6A0]">Acceso</p>
              <h1 className="max-w-md text-4xl font-bold leading-tight">Resuelve tus dudas con confianza.</h1>
              <p className="max-w-md text-base text-slate-100/90">
                Inicia sesión para continuar con tus consultas laborales, asesorías y documentos legales.
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-3 text-sm text-slate-100/90">
              <span className="h-2 w-2 rounded-full bg-[#C49A45] shadow-[0_0_18px_rgba(196,154,69,0.8)]" />
              Acceso seguros según tu perfil.
            </div>

            <span className="glow-node left-[12%] top-[22%]" />
            <span className="glow-node right-[22%] top-[18%]" />
            <span className="glow-node left-[60%] bottom-[20%]" />
            <span className="glow-node right-[18%] top-[52%]" />
          </div>

          <div className="flex items-center justify-center bg-white p-6 sm:p-10">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center lg:text-left">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C49A45]">Bienvenido</p>
                <h2 className="mt-3 text-3xl font-bold text-[#1F4E34]">Iniciar sesión</h2>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <div>
                  <label htmlFor="correo" className="mb-2 block text-sm font-medium text-slate-700">Correo electrónico</label>
                  <input
                    id="correo"
                    name="correo"
                    type="email"
                    value={form.correo}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="correo@ejemplo.com"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Contraseña</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ingrese su contraseña"
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-[#8B0000]/20 bg-[#8B0000]/5 px-4 py-3 text-sm text-[#8B0000]">
                    {error}
                  </div>
                )}

                <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={isLoading}>
                  {isLoading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-between text-sm">
                <Link to="/register" className="font-semibold text-[#1F4E34] transition hover:text-[#C49A45]">
                  Crear cuenta
                </Link>
                <Link to="/forgot-password" className="font-semibold text-[#1F4E34] transition hover:text-[#C49A45]">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
