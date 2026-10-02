import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface DashboardStats {
  totalUsuarios: number;
  administradores: number;
  usuariosActivos: number;
  totalNormativas: number;
  normativasActivas: number;
  normativasInactivas: number;
  pendienteProcesamiento: number;
  procesando: number;
  conError: number;
}

export default function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsuarios: 0,
    administradores: 0,
    usuariosActivos: 0,
    totalNormativas: 0,
    normativasActivas: 0,
    normativasInactivas: 0,
    pendienteProcesamiento: 0,
    procesando: 0,
    conError: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchStats = async (): Promise<void> => {
      const token = localStorage.getItem('clb_token');
      try {
        // Fetch user statistics
        const usersRes = await fetch('/api/admin/users/estadisticas', {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Fetch normativa statistics
        const normsRes = await fetch('/api/admin/normativa/estadisticas', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!usersRes.ok || !normsRes.ok) {
          throw new Error('Error al cargar estadísticas');
        }

        const usersData = await usersRes.json();
        const normsData = await normsRes.json();

        setStats({
          ...usersData,
          ...normsData,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Usuarios Totales',
      value: stats.totalUsuarios,
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-700',
    },
    {
      title: 'Administradores',
      value: stats.administradores,
      color: 'bg-purple-50 border-purple-200',
      textColor: 'text-purple-700',
    },
    {
      title: 'Usuarios Activos',
      value: stats.usuariosActivos,
      color: 'bg-green-50 border-green-200',
      textColor: 'text-green-700',
    },
    {
      title: 'Normativas Totales',
      value: stats.totalNormativas,
      color: 'bg-yellow-50 border-yellow-200',
      textColor: 'text-yellow-700',
    },
    {
      title: 'Normativas Activas',
      value: stats.normativasActivas,
      color: 'bg-emerald-50 border-emerald-200',
      textColor: 'text-emerald-700',
    },
    {
      title: 'Normativas Inactivas',
      value: stats.normativasInactivas,
      color: 'bg-slate-50 border-slate-200',
      textColor: 'text-slate-700',
    },
    {
      title: 'Pendiente de Procesamiento',
      value: stats.pendienteProcesamiento,
      color: 'bg-orange-50 border-orange-200',
      textColor: 'text-orange-700',
    },
    {
      title: 'Procesando',
      value: stats.procesando,
      color: 'bg-cyan-50 border-cyan-200',
      textColor: 'text-cyan-700',
    },
    {
      title: 'Con Error',
      value: stats.conError,
      color: 'bg-red-50 border-red-200',
      textColor: 'text-red-700',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1F4E34]">Dashboard</h1>
          <p className="mt-2 text-slate-600">Bienvenido, {user?.nombre}. Aquí está el resumen de tu sistema.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-600">Cargando estadísticas...</div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card) => (
              <div
                key={card.title}
                className={`rounded-2xl border ${card.color} p-6 shadow-soft`}
              >
                <p className="text-sm font-medium text-slate-600">{card.title}</p>
                <p className={`mt-3 text-4xl font-bold ${card.textColor}`}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {/* Users Management Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                <span className="text-xl">👥</span>
              </div>
              <h3 className="text-lg font-bold text-[#1F4E34]">Gestión de Usuarios</h3>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              Administra usuarios, asigna roles y controla permisos del sistema.
            </p>
            <a href="/admin/usuarios" className="btn-primary text-sm">
              Ir a Usuarios
            </a>
          </div>

          {/* Normativa Management Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
                <span className="text-xl">📄</span>
              </div>
              <h3 className="text-lg font-bold text-[#1F4E34]">Gestión de Normativa</h3>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              Carga, gestiona y procesa documentos legales normativas.
            </p>
            <a href="/admin/normativa" className="btn-primary text-sm">
              Ir a Normativa
            </a>
          </div>
        </div>

        {/* System Info */}
        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h3 className="mb-4 text-lg font-bold text-[#1F4E34]">Información del Sistema</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-600">Rol del Usuario</p>
              <p className="mt-1 text-base font-semibold text-[#1F4E34]">
                {user?.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Usuario'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Estado</p>
              <p className="mt-1 text-base font-semibold text-green-600">
                {user?.activo ? 'Activo' : 'Inactivo'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Correo</p>
              <p className="mt-1 text-base font-semibold text-[#1F4E34]">{user?.correo}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Último Acceso</p>
              <p className="mt-1 text-base font-semibold text-[#1F4E34]">
                {user?.ultimo_acceso
                  ? new Date(user.ultimo_acceso).toLocaleDateString('es-BO')
                  : 'Primer acceso'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
