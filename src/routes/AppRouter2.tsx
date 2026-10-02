import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from '../components/Navbar';
import NavbarUser from '../components/layout/NavbarUser';
import SidebarAdmin from '../components/layout/SidebarAdmin';
import DocumentUploader from '../components/admin/DocumentUploader';
import AISettingsPage from '../pages/admin/AISettingsPage';
import ChatPage from '../pages/user/ChatPage';
import DocumentGeneratorPage from '../pages/user/DocumentGeneratorPage';
import BenefitsCalculatorPage from '../pages/user/BenefitsCalculatorPage';
import HistoryPage from '../pages/user/HistoryPage';
import LoginPage from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import { ProtectedRoute, AdminRoute } from '../components/ProtectedRoute';

function HomePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Navbar />
      <section className="relative overflow-hidden bg-hero">
        <div className="absolute inset-0 bg-[#1F4E34]/45" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 py-20 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-xl text-white">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-[#E8D6A0]">Consulta Laboral Bolivia</p>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">Asesoría laboral confiable y moderna.</h1>
            <p className="mt-5 text-lg text-slate-100/90">
              Soluciones legales, consultas inteligentes, cálculos y soporte especializado para trabajadores y organizaciones.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="/register" className="rounded-xl bg-[#1F4E34] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#163c2b]">
                Crear cuenta
              </a>
              <a href="/login" className="rounded-xl border border-white/60 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20">
                Iniciar sesión
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function AdminPage(): JSX.Element {
  return <div className="flex min-h-screen flex-col bg-[#F8F9FA] lg:flex-row"><SidebarAdmin /><main className="min-w-0 flex-1"><DocumentUploader /></main></div>;
}

function AdminSettingsPage(): JSX.Element {
  return <div className="flex min-h-screen flex-col bg-[#F8F9FA] lg:flex-row"><SidebarAdmin /><main className="min-w-0 flex-1"><AISettingsPage /></main></div>;
}

function UserLayout({ children }: { children: JSX.Element }): JSX.Element {
  return <div className="min-h-screen bg-[#F8F9FA]"><NavbarUser />{children}</div>;
}

export function AppRouter(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <UserLayout><ChatPage /></UserLayout>
          </ProtectedRoute>
        }
      />

      <Route 
        path="/documents" 
        element={
          <ProtectedRoute>
            <UserLayout><DocumentGeneratorPage /></UserLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/calculator" 
        element={
          <ProtectedRoute>
            <UserLayout><BenefitsCalculatorPage /></UserLayout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/history" 
        element={
          <ProtectedRoute>
            <UserLayout><HistoryPage /></UserLayout>
          </ProtectedRoute>
        } 
      />

      <Route
        path="/admin/normativa"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/configuracion"
        element={
          <AdminRoute>
            <AdminSettingsPage />
          </AdminRoute>
        }
      />

      <Route path="/admin" element={<Navigate to="/admin/normativa" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
