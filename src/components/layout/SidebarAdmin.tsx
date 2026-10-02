import { BarChart3, FileText, LogOut, Settings, Users } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SidebarAdmin(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const signOut = (): void => { logout(); navigate('/login'); };
  const linkClass = ({ isActive }: { isActive: boolean }): string => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-[#1F4E34] text-white' : 'text-slate-600 hover:bg-[#1F4E34]/10 hover:text-[#1F4E34]'}`;
  return (
    <aside className="flex w-full flex-col border-b border-slate-200 bg-white p-4 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-3 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F4E34] text-lg font-bold text-white">
          ⚖️
        </div>
        <div>
          <p className="font-bold text-[#1F4E34]">Panel Admin</p>
          <p className="text-xs text-slate-500">{user?.correo}</p>
        </div>
      </div>
      <nav className="grid gap-2 lg:mt-8">
        <NavLink to="/admin/dashboard" className={linkClass}>
          <BarChart3 size={18} />
          Dashboard
        </NavLink>
        <NavLink to="/admin/usuarios" className={linkClass}>
          <Users size={18} />
          Usuarios
        </NavLink>
        <NavLink to="/admin/normativa" className={linkClass}>
          <FileText size={18} />
          Normativa Legal
        </NavLink>
        <NavLink to="/admin/configuracion" className={linkClass}>
          <Settings size={18} />
          Configuración IA
        </NavLink>
      </nav>
      <button
        type="button"
        onClick={signOut}
        className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700 transition"
      >
        <LogOut size={18} />
        Cerrar sesión
      </button>
    </aside>
  );
}
