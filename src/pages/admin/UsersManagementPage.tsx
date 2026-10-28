import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { getPasswordRequirementsMessage } from '../../utils/passwordValidation';

interface User {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: 'USUARIO' | 'ADMINISTRADOR';
  activo: boolean;
  fecha_registro: string;
  ultimo_acceso: string | null;
}

interface AdminFormData {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
  passwordConfirm: string;
}

type UserCategory = 'ADMINISTRADOR' | 'USUARIO';

const emptyAdminForm: AdminFormData = {
  nombre: '',
  apellido: '',
  correo: '',
  password: '',
  passwordConfirm: '',
};

export default function UsersManagementPage(): JSX.Element {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<UserCategory>('ADMINISTRADOR');
  const [adminForm, setAdminForm] = useState<AdminFormData>(emptyAdminForm);

  useEffect(() => {
    const fetchUsers = async (): Promise<void> => {
      const token = localStorage.getItem('clb_token');
      try {
        const response = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await response.json() as { message?: string; data?: User[] };

        if (!response.ok) {
          throw new Error(body.message || 'Error al cargar usuarios');
        }
        if (!Array.isArray(body.data)) {
          throw new Error('El servidor devolvió una lista de usuarios inválida');
        }

        setUsers(body.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    return users.filter((user) =>
      user.rol === category &&
      [user.nombre, user.apellido, user.correo]
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [category, searchTerm, users]);

  const handleCreateAdmin = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (adminForm.password !== adminForm.passwordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    const passwordError = getPasswordRequirementsMessage(adminForm.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem('clb_token');
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: adminForm.nombre,
          apellido: adminForm.apellido,
          correo: adminForm.correo,
          password: adminForm.password,
          passwordConfirm: adminForm.passwordConfirm,
        }),
      });
      const body = await response.json() as { message?: string; data?: User };

      if (!response.ok || !body.data) {
        throw new Error(body.message || 'No se pudo crear la cuenta administrativa');
      }

      const createdUser = body.data;
      setUsers((currentUsers) => [
        createdUser,
        ...currentUsers.filter((user) => user.id_usuario !== createdUser.id_usuario),
      ]);
      setAdminForm(emptyAdminForm);
      setCategory('ADMINISTRADOR');
      setSuccess('La cuenta administrativa se creó correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivate = async (userId: number): Promise<void> => {
    if (!window.confirm('¿Desactivar este usuario?')) return;

    setError('');
    setSuccess('');
    const token = localStorage.getItem('clb_token');
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json() as { message?: string };

      if (!response.ok) {
        throw new Error(body.message || 'Error al desactivar usuario');
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id_usuario === userId ? { ...user, activo: false } : user
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1F4E34]">Gestión de Usuarios</h1>
          <p className="mt-2 text-slate-600">Administra usuarios y cuentas administrativas</p>
        </div>

        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-slate-900">Crear administrador</h2>
          <p className="mt-1 text-sm text-slate-600">
            La cuenta se registrará con permisos administrativos.
          </p>
          <form onSubmit={handleCreateAdmin} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Nombre
              <input
                required
                maxLength={100}
                value={adminForm.nombre}
                onChange={(event) => setAdminForm({ ...adminForm, nombre: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                autoComplete="given-name"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Apellido
              <input
                required
                maxLength={100}
                value={adminForm.apellido}
                onChange={(event) => setAdminForm({ ...adminForm, apellido: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                autoComplete="family-name"
              />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Correo electrónico
              <input
                required
                type="email"
                maxLength={255}
                value={adminForm.correo}
                onChange={(event) => setAdminForm({ ...adminForm, correo: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                autoComplete="email"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Contraseña
              <input
                required
                type="password"
                value={adminForm.password}
                onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                autoComplete="new-password"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Mínimo 8 caracteres, una mayúscula, un número y un carácter especial.
              </span>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Confirmar contraseña
              <input
                required
                type="password"
                value={adminForm.passwordConfirm}
                onChange={(event) => setAdminForm({ ...adminForm, passwordConfirm: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                autoComplete="new-password"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-lg bg-[#1F4E34] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163c2b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? 'Creando cuenta...' : 'Crear administrador'}
              </button>
            </div>
          </form>
        </section>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Categoría de cuentas">
          {([
            ['ADMINISTRADOR', 'Administradores'],
            ['USUARIO', 'Usuarios generales'],
          ] as const).map(([role, label]) => (
            <button
              key={role}
              type="button"
              role="tab"
              aria-selected={category === role}
              onClick={() => setCategory(role)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                category === role
                  ? 'bg-[#1F4E34] text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {label} ({users.filter((user) => user.rol === role).length})
            </button>
          ))}
        </div>

        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
          <input
            type="search"
            aria-label="Buscar cuentas"
            placeholder="Buscar por nombre, apellido o correo..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm placeholder-slate-500 focus:border-[#1F4E34] focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-soft">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-600">Cargando usuarios...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-600">
              No se encontraron {category === 'ADMINISTRADOR' ? 'administradores' : 'usuarios'}.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8F9FA]">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Nombre</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Correo</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Rol</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Estado</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Último Acceso</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id_usuario} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-900">{user.nombre} {user.apellido}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{user.correo}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        user.rol === 'ADMINISTRADOR' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Usuario'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        user.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {user.ultimo_acceso ? new Date(user.ultimo_acceso).toLocaleDateString('es-BO') : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.activo && (
                        <button
                          type="button"
                          onClick={() => void handleDeactivate(user.id_usuario)}
                          className="text-xs font-medium text-red-600 transition hover:text-red-800"
                        >
                          Desactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-sm text-slate-600">Total en esta categoría</p>
            <p className="mt-2 text-3xl font-bold text-[#1F4E34]">{filteredUsers.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-sm text-slate-600">Cuentas activas en esta categoría</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {filteredUsers.filter((user) => user.activo).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
