import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProfileForm {
  nombre: string;
  apellido: string;
  correo: string;
}

interface ChangePasswordForm {
  passwordActual: string;
  passwordNueva: string;
  passwordConfirm: string;
}

interface FormErrors {
  [key: string]: string;
}

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/;

export default function ProfilePage(): JSX.Element {
  const navigate = useNavigate();
  const { user, logout, updateUser, token } = useAuth();
  const [profileForm, setProfileForm] = useState<ProfileForm>({ nombre: '', apellido: '', correo: '' });
  const [passwordForm, setPasswordForm] = useState<ChangePasswordForm>({
    passwordActual: '',
    passwordNueva: '',
    passwordConfirm: '',
  });

  const [profileErrors, setProfileErrors] = useState<FormErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<FormErrors>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  useEffect(() => {
    if (!token) return;
    fetch('/api/users/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'No se pudo cargar el perfil');
        updateUser(data.data);
        setProfileForm({ nombre: data.data.nombre || '', apellido: data.data.apellido || '', correo: data.data.correo || '' });
      })
      .catch((error: unknown) => setProfileErrors({ general: error instanceof Error ? error.message : 'No se pudo cargar el perfil' }));
  }, [token]);

  const validateProfileForm = (): boolean => {
    const errors: FormErrors = {};

    if (!profileForm.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    }
    if (!profileForm.apellido.trim()) {
      errors.apellido = 'El apellido es requerido';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const errors: FormErrors = {};

    if (!passwordForm.passwordActual.trim()) {
      errors.passwordActual = 'Ingresa tu contraseña actual';
    }
    if (!passwordForm.passwordNueva.trim()) {
      errors.passwordNueva = 'Ingresa una nueva contraseña';
    } else if (passwordForm.passwordNueva.length < PASSWORD_MIN_LENGTH) {
      errors.passwordNueva = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`;
    } else if (!PASSWORD_PATTERN.test(passwordForm.passwordNueva)) {
      errors.passwordNueva = 'Debe incluir mayúscula, número y carácter especial (!@#$%^&*)';
    }
    if (!passwordForm.passwordConfirm.trim()) {
      errors.passwordConfirm = 'Confirma tu nueva contraseña';
    } else if (passwordForm.passwordNueva !== passwordForm.passwordConfirm) {
      errors.passwordConfirm = 'Las contraseñas no coinciden';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
    if (profileErrors[name]) {
      setProfileErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!validateProfileForm()) return;

    setIsLoadingProfile(true);
    const token = localStorage.getItem('clb_token');

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: profileForm.nombre,
          apellido: profileForm.apellido,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setProfileErrors({ general: data.message || 'Error al actualizar el perfil' });
        setIsLoadingProfile(false);
        return;
      }

      const data = await response.json();
      if (data.data) updateUser(data.data);
      setSuccessMessage('Perfil actualizado con éxito');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setProfileErrors({
        general: error instanceof Error ? error.message : 'Error de conexión',
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!validatePasswordForm()) return;

    setIsLoadingPassword(true);
    const token = localStorage.getItem('clb_token');

    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          passwordActual: passwordForm.passwordActual,
          passwordNueva: passwordForm.passwordNueva,
          passwordConfirm: passwordForm.passwordConfirm,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setPasswordErrors({ general: data.message || 'Error al cambiar la contraseña' });
        setIsLoadingPassword(false);
        return;
      }

      setSuccessMessage('Contraseña cambiada correctamente');
      setPasswordForm({ passwordActual: '', passwordNueva: '', passwordConfirm: '' });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setPasswordErrors({
        general: error instanceof Error ? error.message : 'Error de conexión',
      });
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#1F4E34]">Mi Perfil</h1>
              <p className="mt-1 text-sm text-slate-600">
                Gestiona tu información personal y seguridad
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 text-sm font-medium transition ${
              activeTab === 'profile'
                ? 'border-b-2 border-[#1F4E34] text-[#1F4E34]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Información Personal
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-4 py-3 text-sm font-medium transition ${
              activeTab === 'password'
                ? 'border-b-2 border-[#1F4E34] text-[#1F4E34]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cambiar Contraseña
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 rounded-lg border border-[#1F4E34]/20 bg-[#1F4E34]/5 px-4 py-3 text-sm text-[#1F4E34]">
            {successMessage}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="nombre" className="mb-2 block text-sm font-medium text-slate-700">
                    Nombre
                  </label>
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    value={profileForm.nombre}
                    onChange={handleProfileChange}
                    className={`input-field ${profileErrors.nombre ? 'border-red-500 bg-red-50' : ''}`}
                    disabled={isLoadingProfile}
                  />
                  {profileErrors.nombre && (
                    <p className="mt-1 text-xs text-red-600">{profileErrors.nombre}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="apellido" className="mb-2 block text-sm font-medium text-slate-700">
                    Apellido
                  </label>
                  <input
                    id="apellido"
                    name="apellido"
                    type="text"
                    value={profileForm.apellido}
                    onChange={handleProfileChange}
                    className={`input-field ${profileErrors.apellido ? 'border-red-500 bg-red-50' : ''}`}
                    disabled={isLoadingProfile}
                  />
                  {profileErrors.apellido && (
                    <p className="mt-1 text-xs text-red-600">{profileErrors.apellido}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="correo" className="mb-2 block text-sm font-medium text-slate-700">
                  Correo Electrónico
                </label>
                <input
                  id="correo"
                  name="correo"
                  type="email"
                  value={profileForm.correo}
                  className="input-field"
                  disabled
                />
                <p className="mt-1 text-xs text-slate-500">El correo no puede ser modificado</p>
              </div>

              {profileErrors.general && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {profileErrors.general}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full py-3 text-base md:w-auto"
                disabled={isLoadingProfile}
              >
                {isLoadingProfile ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-5">
              <div>
                <label htmlFor="passwordActual" className="mb-2 block text-sm font-medium text-slate-700">
                  Contraseña Actual
                </label>
                <input
                  id="passwordActual"
                  name="passwordActual"
                  type="password"
                  value={passwordForm.passwordActual}
                  onChange={handlePasswordChange}
                  className={`input-field ${passwordErrors.passwordActual ? 'border-red-500 bg-red-50' : ''}`}
                  placeholder="Ingresa tu contraseña actual"
                  disabled={isLoadingPassword}
                />
                {passwordErrors.passwordActual && (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.passwordActual}</p>
                )}
              </div>

              <div>
                <label htmlFor="passwordNueva" className="mb-2 block text-sm font-medium text-slate-700">
                  Nueva Contraseña
                </label>
                <input
                  id="passwordNueva"
                  name="passwordNueva"
                  type="password"
                  value={passwordForm.passwordNueva}
                  onChange={handlePasswordChange}
                  className={`input-field ${passwordErrors.passwordNueva ? 'border-red-500 bg-red-50' : ''}`}
                  placeholder="Mínimo 8 caracteres"
                  disabled={isLoadingPassword}
                />
                {passwordErrors.passwordNueva && (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.passwordNueva}</p>
                )}
              </div>

              <div>
                <label htmlFor="passwordConfirm" className="mb-2 block text-sm font-medium text-slate-700">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  value={passwordForm.passwordConfirm}
                  onChange={handlePasswordChange}
                  className={`input-field ${passwordErrors.passwordConfirm ? 'border-red-500 bg-red-50' : ''}`}
                  placeholder="Repite tu nueva contraseña"
                  disabled={isLoadingPassword}
                />
                {passwordErrors.passwordConfirm && (
                  <p className="mt-1 text-xs text-red-600">{passwordErrors.passwordConfirm}</p>
                )}
              </div>

              {passwordErrors.general && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {passwordErrors.general}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary py-3 text-base"
                disabled={isLoadingPassword}
              >
                {isLoadingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
