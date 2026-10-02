import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, MessageCircle, RefreshCw, Sigma } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ChatSummary {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string | null;
  messageCount: number;
}

interface HistoryData {
  documents: Array<{ id: number; title: string; content: string; created_at: string; formato?: string }>;
  calculations: Array<{ id: number; title: string; content: number; created_at: string }>;
  chats: ChatSummary[];
}

const EMPTY_MESSAGE = 'No hay información disponible para mostrar';

const downloadText = (name: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function HistoryPage(): JSX.Element {
  const { token } = useAuth();
  const [history, setHistory] = useState<HistoryData>({ documents: [], calculations: [], chats: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await fetch('/api/laboral/history', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Error de comunicación con el servidor');
        setHistory(data.data as HistoryData);
      } catch (historyError) {
        setError(historyError instanceof Error ? historyError.message : 'Error de comunicación con el servidor');
      } finally { setLoading(false); }
    };
    void load();
  }, [token]);

  const hasData = history.documents.length > 0 || history.calculations.length > 0 || history.chats.length > 0;

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C49A45]">Historial personal</p>
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="mt-3 text-3xl font-bold text-[#1F4E34]">Tus resultados</h1><p className="mt-2 text-slate-600">Consulta tus conversaciones, cálculos y documentos guardados.</p></div><Link to="/chat" className="rounded-xl bg-[#1F4E34] px-4 py-2 text-sm font-semibold text-white">Abrir chat</Link></div>
        {loading && <div className="mt-8 flex items-center gap-2 rounded-2xl bg-white p-5 text-sm text-slate-600"><RefreshCw size={16} className="animate-spin" />Cargando historial...</div>}
        {error && <div role="alert" className="mt-8 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {!loading && !error && !hasData && <div className="mt-8 rounded-2xl bg-white p-8 text-center text-sm text-slate-500">{EMPTY_MESSAGE}</div>}
        {!loading && !error && hasData && <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-soft"><h2 className="flex items-center gap-2 font-bold text-[#1F4E34]"><MessageCircle size={18} />Conversaciones</h2>{history.chats.length ? <div className="mt-4 space-y-3">{history.chats.map((chat) => <Link to={`/chat?chatId=${chat.id}`} key={chat.id} className="block rounded-xl bg-[#F8F9FA] p-3 hover:bg-[#1F4E34]/10"><p className="truncate text-sm font-semibold text-slate-700">{chat.title}</p><p className="mt-1 text-xs text-slate-500">{chat.messageCount} intercambios</p></Link>)}</div> : <p className="mt-4 text-sm text-slate-500">{EMPTY_MESSAGE}</p>}</section>
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-soft"><h2 className="flex items-center gap-2 font-bold text-[#1F4E34]"><Sigma size={18} />Cálculos laborales</h2>{history.calculations.length ? <div className="mt-4 space-y-3">{history.calculations.map((calculation) => <article key={calculation.id} className="rounded-xl bg-[#F8F9FA] p-3"><p className="text-sm font-semibold text-slate-700">{calculation.title}</p><p className="mt-1 text-sm text-slate-600">Resultado: Bs {Number(calculation.content).toFixed(2)}</p><p className="mt-1 text-xs text-slate-500">{new Date(calculation.created_at).toLocaleString()}</p></article>)}</div> : <p className="mt-4 text-sm text-slate-500">{EMPTY_MESSAGE}</p>}</section>
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-soft"><h2 className="flex items-center gap-2 font-bold text-[#1F4E34]"><FileText size={18} />Documentos</h2>{history.documents.length ? <div className="mt-4 space-y-3">{history.documents.map((document) => <article key={document.id} className="rounded-xl bg-[#F8F9FA] p-3"><p className="text-sm font-semibold text-slate-700">{document.title}</p><p className="mt-1 text-xs text-slate-500">{document.formato || 'Documento'} · {new Date(document.created_at).toLocaleString()}</p><button type="button" onClick={() => downloadText(document.title, document.content)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#1F4E34] px-3 py-2 text-xs font-semibold text-[#1F4E34]"><Download size={14} />Descargar contenido</button></article>)}</div> : <p className="mt-4 text-sm text-slate-500">{EMPTY_MESSAGE}</p>}</section>
        </div>}
      </div>
    </main>
  );
}
