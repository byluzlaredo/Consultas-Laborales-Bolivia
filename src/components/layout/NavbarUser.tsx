import { Calculator, FileText, History, LogOut, MessageCircle } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function NavbarUser(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const linkClass = ({ isActive }: { isActive: boolean }): string => `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isActive ? 'bg-[#1F4E34] text-white' : 'text-slate-600 hover:bg-[#1F4E34]/10 hover:text-[#1F4E34]'}`;
  return <header className="border-b border-slate-200 bg-white"><nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8"><NavLink to="/chat" className="mr-auto flex items-center gap-2 font-bold text-[#1F4E34]"><MessageCircle size={20} />Consulta Laboral</NavLink><NavLink to="/chat" className={linkClass}><MessageCircle size={16} />Chat</NavLink><NavLink to="/documents" className={linkClass}><FileText size={16} />Documentos</NavLink><NavLink to="/calculator" className={linkClass}><Calculator size={16} />Calculadora</NavLink><NavLink to="/history" className={linkClass}><History size={16} />Historial</NavLink><span className="hidden text-xs text-slate-500 md:block">{user?.nombre}</span><button type="button" onClick={() => { logout(); navigate('/login'); }} className="rounded-xl p-2 text-slate-500 hover:bg-red-50 hover:text-red-700" title="Cerrar sesión"><LogOut size={17} /></button></nav></header>;
}
