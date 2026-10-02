import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEPARTAMENTOS_BOLIVIA, type RegistroUsuarioInput } from '../types/auth';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState<RegistroUsuarioInput & { passwordConfirm?: string }>({
    nombre: '',
    apellido: '',
    correo: '',
    password: '',
    passwordConfirm: '',
    departamento: '' as RegistroUsuarioInput['departamento'],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nombre?.trim()) {
      errors.nombre = 'El nombre es requerido';
    }

    if (!formData.apellido?.trim()) {
      errors.apellido = 'El apellido es requerido';
    }

    if (!formData.departamento) {
      errors.departamento = 'Selecciona tu departamento';
    }

    if (!formData.correo?.trim()) {
      errors.correo = 'El correo es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      errors.correo = 'El correo electrónico no es válido';
    }

    if (!formData.password) {
      errors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    } else if (!/[A-Z]/.test(formData.password)) {
      errors.password = 'La contraseña debe contener al menos una mayúscula';
    } else if (!/[0-9]/.test(formData.password)) {
      errors.password = 'La contraseña debe contener al menos un número';
    } else if (!/[!@#$%^&*]/.test(formData.password)) {
      errors.password = 'La contraseña debe contener al menos un carácter especial (!@#$%^&*)';
    }

    if (!formData.passwordConfirm) {
      errors.passwordConfirm = 'Debe confirmar la contraseña';
    } else if (formData.password !== formData.passwordConfirm) {
      errors.passwordConfirm = 'Las contraseñas no coinciden';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Limpiar error al editar
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      const { passwordConfirm, ...registerData } = formData;
      await register(registerData as RegistroUsuarioInput);
      // Redirigir a login con mensaje de éxito
      navigate('/login', { state: { message: 'Cuenta registrada. Por favor inicia sesión.' } });
    } catch {
      // El error ya se maneja en el contexto
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">JusticIA</h1>
          <p className="text-sm text-gray-600 mt-2">Consulta Laboral Bolivia</p>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">Crear Cuenta</h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                Nombre
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={formData.nombre}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-lg border ${
                  formErrors.nombre ? 'border-red-300' : 'border-gray-300'
                } px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                placeholder="Juan"
              />
              {formErrors.nombre && <p className="mt-1 text-sm text-red-600">{formErrors.nombre}</p>}
            </div>

            <div>
              <label htmlFor="apellido" className="block text-sm font-medium text-gray-700">
                Apellido
              </label>
              <input
                id="apellido"
                name="apellido"
                type="text"
                value={formData.apellido}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-lg border ${
                  formErrors.apellido ? 'border-red-300' : 'border-gray-300'
                } px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                placeholder="Pérez"
              />
              {formErrors.apellido && <p className="mt-1 text-sm text-red-600">{formErrors.apellido}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="correo" className="block text-sm font-medium text-gray-700">
              Correo Electrónico
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              value={formData.correo}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-lg border ${
                formErrors.correo ? 'border-red-300' : 'border-gray-300'
              } px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              placeholder="tu@email.com"
            />
            {formErrors.correo && <p className="mt-1 text-sm text-red-600">{formErrors.correo}</p>}
          </div>

          <div className="col-span-2">
            <label htmlFor="departamento" className="block text-sm font-medium text-gray-700">
              Departamento de Bolivia
            </label>
            <select
              id="departamento"
              name="departamento"
              value={formData.departamento}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-lg border ${
                formErrors.departamento ? 'border-red-300' : 'border-gray-300'
              } px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
            >
              <option value="">Selecciona tu departamento</option>
              {DEPARTAMENTOS_BOLIVIA.map((departamento) => (
                <option key={departamento} value={departamento}>{departamento}</option>
              ))}
            </select>
            {formErrors.departamento && <p className="mt-1 text-sm text-red-600">{formErrors.departamento}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-lg border ${
                formErrors.password ? 'border-red-300' : 'border-gray-300'
              } px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              placeholder="••••••••"
            />
            {formErrors.password && <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>}
            <p className="mt-2 text-xs text-gray-600">
              Mínimo 8 caracteres, con mayúscula, número y carácter especial
            </p>
          </div>

          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700">
              Confirmar Contraseña
            </label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              value={formData.passwordConfirm}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-lg border ${
                formErrors.passwordConfirm ? 'border-red-300' : 'border-gray-300'
              } px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              placeholder="••••••••"
            />
            {formErrors.passwordConfirm && (
              <p className="mt-1 text-sm text-red-600">{formErrors.passwordConfirm}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
