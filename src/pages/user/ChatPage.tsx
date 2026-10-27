import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Copy, Download, MessageCircle, Plus, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useAuth } from '../../context/AuthContext';

interface Citation {
  normativa: string;
  tipo: string;
  numero: string;
  articulo: string;
  relevance: number;
}

interface ChatResponse {
  answer: string;
  citations: Citation[];
  hasContext: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

const COMMUNICATION_ERROR = 'Error de comunicación con el servidor';

interface ChatSummary { id: number; title: string; createdAt: string; updatedAt: string | null; messageCount: number; }
interface ChatDetail { id: number; title: string; messages: Array<{ question: string; answer: string; createdAt: string }>; }

export const cleanLatexMath = (text: string): string => {
  if (!text) return '';
  return text
    // Normalize escaped brackets \[ ... \] and $$ ... $$ into clean calculation lines
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, '\n\n> **Cálculo:** $1\n\n')
    .replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, '\n\n> **Cálculo:** $1\n\n')
    // Match bracketed math expressions like [ \text{...} ... ] or [ Indemnización = ... ]
    .replace(/\[\s*(\\text\{[^\n\]]+|[^[\]\n]*?(?:\\times|\\frac|=)[^[\]\n]*?)\s*\]/g, '\n\n> **Cálculo:** $1\n\n')
    // Remove \text{...}
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\textbf\{([^}]+)\}/g, '**$1**')
    .replace(/\\textit\{([^}]+)\}/g, '*$1*')
    // Convert mathematical operators
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\div/g, '÷')
    .replace(/\\approx/g, '≈')
    .replace(/\\le(q)?\b/g, '≤')
    .replace(/\\ge(q)?\b/g, '≥')
    // Convert fractions \frac{num}{den} -> (num) / den
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / $2')
    // Remove sizing/bracketing commands
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]/g, ']')
    // Spacing
    .replace(/\\quad/g, ' ')
    .replace(/\\qquad/g, '  ')
    .replace(/\\[,;!]/g, ' ')
    .replace(/\\\\/g, '\n')
    // Strip isolated inline dollar signs containing text/math
    .replace(/\$([^$\n]+)\$/g, (_m, p1) => {
      return p1.replace(/\\text\{([^}]+)\}/g, '$1').replace(/\\times/g, '×').trim();
    })
    .replace(/[ \t]{2,}/g, ' ');
};

export default function ChatPage(): JSX.Element {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [copiedMessage, setCopiedMessage] = useState<number | null>(null);
  const submitLock = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const loadChats = async (): Promise<ChatSummary[]> => {
    const response = await fetch('/api/chat', { headers: authHeaders });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(COMMUNICATION_ERROR);
    return data.data as ChatSummary[];
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const copyMessage = async (content: string, index: number): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessage(index);
      window.setTimeout(() => setCopiedMessage(null), 1600);
    } catch {
      setError(COMMUNICATION_ERROR);
    }
  };

  const downloadMessage = (content: string, index: number): void => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `respuesta-legal-${index + 1}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openChat = async (chatId: number): Promise<void> => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/chat/${chatId}`, { headers: authHeaders });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(COMMUNICATION_ERROR);
      const detail = data.data as ChatDetail;
      setActiveChatId(detail.id);
      setMessages(detail.messages.flatMap((message) => [
        { role: 'user' as const, content: message.question },
        { role: 'assistant' as const, content: message.answer },
      ]));
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : COMMUNICATION_ERROR);
    } finally { setIsLoadingHistory(false); }
  };

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const loadedChats = await loadChats();
        setChats(loadedChats);
        const requestedChatId = Number(searchParams.get('chatId'));
        const chatToOpen = loadedChats.find((chat) => chat.id === requestedChatId) || loadedChats[0];
        if (chatToOpen) await openChat(chatToOpen.id);
        else setIsLoadingHistory(false);
      } catch (historyError) {
        setError(historyError instanceof Error ? historyError.message : COMMUNICATION_ERROR);
        setIsLoadingHistory(false);
      }
    };
    void load();
  }, [token, searchParams]);

  const startNewChat = (): void => {
    setActiveChatId(null);
    setMessages([]);
    setQuestion('');
    setError('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (submitLock.current || isLoading) return;
    submitLock.current = true;
    setError('');
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError('Ingrese una consulta válida para procesar');
      submitLock.current = false;
      return;
    }
    if (trimmedQuestion.length > 500) {
      setError('La consulta excede el límite permitido de 500 caracteres');
      submitLock.current = false;
      return;
    }

    setMessages((current) => [...current, { role: 'user', content: trimmedQuestion }]);
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ question: trimmedQuestion, chatId: activeChatId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || COMMUNICATION_ERROR);
      const result = data.data as ChatResponse & { chatId: number };
      if (!result.answer?.trim()) throw new Error(COMMUNICATION_ERROR);
      setActiveChatId(result.chatId);
      setMessages((current) => [...current, { role: 'assistant', content: result.answer, citations: result.citations }]);
      setChats(await loadChats());
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : COMMUNICATION_ERROR);
    } finally {
      setIsLoading(false);
      submitLock.current = false;
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft lg:flex-row">
        <aside className="border-b border-slate-200 bg-[#F8F9FA] p-4 lg:w-72 lg:border-b-0 lg:border-r sm:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-[#1F4E34]">Tus conversaciones</h2><button type="button" onClick={startNewChat} className="rounded-xl bg-[#1F4E34] p-2 text-white" title="Nueva conversación"><Plus size={17} /></button></div>
          <button type="button" onClick={startNewChat} className="mt-4 flex w-full items-center gap-2 rounded-xl border border-[#1F4E34]/20 bg-white px-3 py-2 text-left text-sm font-semibold text-[#1F4E34]"><Plus size={16} />Nueva conversación</button>
          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto lg:max-h-[calc(100vh-15rem)]">
            {chats.map((chat) => <button type="button" key={chat.id} onClick={() => void openChat(chat.id)} className={`w-full rounded-xl px-3 py-3 text-left ${activeChatId === chat.id ? 'bg-[#1F4E34] text-white' : 'bg-white text-slate-700 hover:bg-[#1F4E34]/10'}`}><p className="truncate text-sm font-semibold">{chat.title}</p><p className={`mt-1 text-xs ${activeChatId === chat.id ? 'text-white/70' : 'text-slate-500'}`}>{chat.messageCount} {chat.messageCount === 1 ? 'intercambio' : 'intercambios'}</p></button>)}
            {!chats.length && <p className="rounded-xl bg-white p-3 text-xs text-slate-500">Todavía no tienes conversaciones.</p>}
          </div>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C49A45]">Usuario General</p><h1 className="mt-3 text-3xl font-bold text-[#1F4E34]">Consulta laboral</h1><p className="mt-2 text-slate-600">Pregunta sobre legislación laboral boliviana cargada en el sistema.</p></div><Link to="/history" className="rounded-xl border border-[#1F4E34] px-4 py-2 text-sm font-semibold text-[#1F4E34]">Historial</Link></div>
        </header>

          <section className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-8" aria-live="polite">
          {isLoadingHistory && <div className="flex items-center gap-2 py-12 text-sm text-slate-500"><RefreshCw size={16} className="animate-spin" />Cargando conversación...</div>}
          {!isLoadingHistory && messages.length === 0 && <div className="py-12 text-center text-slate-500"><MessageCircle className="mx-auto mb-3 text-[#C49A45]" size={30} /><p>Escribe una consulta para iniciar una conversación.</p></div>}
          {messages.map((message, index) => (
            <article key={`${message.role}-${index}`} className={`max-w-3xl rounded-2xl p-4 ${message.role === 'user' ? 'ml-auto bg-[#1F4E34] text-white' : 'bg-[#F8F9FA] text-slate-800'}`}>
              {message.role === 'user' ? (
                <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
              ) : (
                <div className="text-sm leading-relaxed text-slate-800">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      h1: ({ children }) => <h1 className="mt-4 mb-2 text-xl font-bold text-[#1F4E34]">{children}</h1>,
                      h2: ({ children }) => <h2 className="mt-4 mb-2.5 border-b border-slate-200 pb-1.5 text-lg font-bold text-[#1F4E34]">{children}</h2>,
                      h3: ({ children }) => <h3 className="mt-3 mb-1.5 text-base font-semibold text-[#1F4E34]">{children}</h3>,
                      p: ({ children }) => <p className="mb-2.5 leading-relaxed text-sm text-slate-800">{children}</p>,
                      strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
                      ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-slate-800">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-slate-800">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      blockquote: ({ children }) => (
                        <blockquote className="my-3 rounded-xl border-l-4 border-[#1F4E34] bg-emerald-50/80 p-3.5 text-sm font-medium text-slate-800 shadow-xs">
                          {children}
                        </blockquote>
                      ),
                      table: ({ children }) => (
                        <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                          <table className="min-w-full divide-y divide-slate-200 text-left text-xs sm:text-sm">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-[#1F4E34] text-white font-semibold">{children}</thead>,
                      th: ({ children }) => <th className="px-3.5 py-2.5 font-semibold text-white tracking-wide">{children}</th>,
                      tbody: ({ children }) => <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>,
                      tr: ({ children }) => <tr className="hover:bg-slate-50 transition-colors">{children}</tr>,
                      td: ({ children }) => <td className="px-3.5 py-2.5 text-slate-700">{children}</td>,
                      hr: () => <hr className="my-3.5 border-slate-200" />,
                      code: ({ children }) => (
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-[#1F4E34]">
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {cleanLatexMath(message.content)}
                  </ReactMarkdown>
                </div>
              )}
              {message.role === 'assistant' && <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-300/70 pt-3"><button type="button" onClick={() => void copyMessage(message.content, index)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white" aria-label="Copiar respuesta">{copiedMessage === index ? <Check size={14} /> : <Copy size={14} />}{copiedMessage === index ? 'Copiada' : 'Copiar'}</button><button type="button" onClick={() => downloadMessage(message.content, index)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white" aria-label="Descargar respuesta"><Download size={14} />Descargar</button></div>}
              {message.citations && message.citations.some((citation) => citation.normativa || citation.tipo || citation.numero || citation.articulo) && (
                <details open className="mt-4 border-t border-slate-300/70 pt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[#1F4E34]">Referencias legales ({message.citations.length})</summary>
                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    {message.citations.filter((citation) => citation.normativa || citation.tipo || citation.numero || citation.articulo).map((citation, citationIndex) => <p key={`${citation.articulo}-${citationIndex}`}><strong>{citation.normativa}</strong> · {citation.tipo} {citation.numero} · {citation.articulo}</p>)}
                  </div>
                </details>
              )}
            </article>
          ))}
          {isLoading && <div className="rounded-2xl bg-[#F8F9FA] p-4 text-sm text-slate-500">Consultando la base legal...</div>}
          <div ref={messagesEndRef} aria-hidden="true" />
        </section>

        <form onSubmit={submit} className="border-t border-slate-200 p-5 sm:p-8">
          <label htmlFor="question" className="mb-2 block text-sm font-medium text-slate-700">Tu consulta de seguimiento</label>
          <textarea id="question" maxLength={500} rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} className="input-field resize-none" placeholder="Ej. ¿Cuándo corresponde el pago de beneficios sociales?" />
          <div className="mt-2 flex items-center justify-between gap-4 text-xs text-slate-500"><span>{question.length}/500</span><button type="submit" disabled={isLoading} className="btn-primary px-5 py-3 disabled:opacity-50">{isLoading ? 'Procesando...' : 'Enviar consulta'}</button></div>
          {error && <div className="mt-4 rounded-xl border border-[#8B0000]/20 bg-[#8B0000]/5 px-4 py-3 text-sm text-[#8B0000]">{error}</div>}
        </form>
        <nav className="flex flex-wrap gap-3 border-t border-slate-200 p-5 sm:px-8"><Link to="/documents" className="text-sm font-semibold text-[#1F4E34]">Generar documento laboral</Link><Link to="/calculator" className="text-sm font-semibold text-[#1F4E34]">Calcular beneficios</Link></nav>
        </section>
      </div>
    </main>
  );
}
