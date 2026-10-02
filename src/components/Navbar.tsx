import { LogIn, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

const navItems = [
  { label: 'Inicio', href: '#' },
  { label: 'Funcionalidades', href: '#funcionalidades' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contacto', href: '#contacto' },
];

export default function Navbar(): JSX.Element {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="Consulta Laboral Bolivia">
          <img
            src="/Imagenes/LogoSinFondo.png"
            alt="Logo de Consulta Laboral Bolivia"
            className="h-12 w-12 object-contain"
          />
          <div>
            <p className="text-lg font-bold tracking-tight text-[#1F4E34]">Consulta Laboral</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C49A45]">Bolivia</p>
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-slate-700 transition hover:text-[#1F4E34]"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-[#C49A45]/60 bg-white px-4 py-2 text-sm font-semibold text-[#1F4E34] transition hover:border-[#C49A45] hover:text-[#C49A45]">
            <LogIn size={16} />
            Iniciar sesión
          </Link>
          <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-[#1F4E34] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163c2b] hover:shadow-lg hover:shadow-[#1F4E34]/20">
            <UserPlus size={16} />
            Registrarse
          </Link>
        </div>
      </nav>
    </header>
  );
}
