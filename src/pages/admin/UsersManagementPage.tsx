import { useEffect, useState } from 'react';

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

export default function UsersManagementPage(): JSX.Element {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchUsers = async (): Promise<void> => {
      const token = localStorage.getItem('clb_token');
      try {
        const response = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Error al cargar usuarios');
        }

        const data = await response.json();
        setUsers(data.usuarios || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.correo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeactivate = async (userId: number): Promise<void> => {
    if (!window.confirm('¿Desactivar este usuario?')) return;

    const token = localStorage.getItem('clb_token');
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Error al deactivar usuario');
      }

      setUsers(users.map((u) => (u.id_usuario === userId ? { ...u, activo: false } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1F4E34]">Gestión de Usuarios</h1>
          <p className="mt-2 text-slate-600">Administra los usuarios del sistema</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm placeholder-slate-500 focus:border-[#1F4E34] focus:outline-none"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-600">Cargando usuarios...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-600">No se encontraron usuarios</div>
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
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {user.nombre} {user.apellido}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{user.correo}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          user.rol === 'ADMINISTRADOR'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {user.rol === 'ADMINISTRADOR' ? 'Admin' : 'Usuario'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          user.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {user.ultimo_acceso
                        ? new Date(user.ultimo_acceso).toLocaleDateString('es-BO')
                        : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.activo && (
                        <button
                          onClick={() => handleDeactivate(user.id_usuario)}
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

        {/* Summary */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-sm text-slate-600">Total de Usuarios</p>
            <p className="mt-2 text-3xl font-bold text-[#1F4E34]">{filteredUsers.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-sm text-slate-600">Usuarios Activos</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {filteredUsers.filter((u) => u.activo).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
