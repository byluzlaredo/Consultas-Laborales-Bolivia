import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface AIConfig {
  temperatura: number;
  maxTokens: number;
  kChunks: number;
  systemPrompt: string;
}

const promptPresets = [
  {
    id: 'laboral-bolivia',
    label: 'Abogado laboralista boliviano',
    value:
      'Eres un abogado laboralista boliviano experto. Responde con base estricta en la Ley General del Trabajo (Arts. 12, 13, 44), D.S. 110, D.S. 3161 y D.S. 28699. Aplica la escala legal de vacaciones (1-5 años: 15 días hábiles; 5-10 años: 20 días hábiles; >10 años: 30 días hábiles). Si el usuario declara días acumulados de vacación, toma ese dato como rígido para el cálculo monetario sin reducirlo a 20 días. Calcula indemnización sin tope de 12 meses (1 mes por año) y desahucio de 3 meses en despido injustificado. No uses sintaxis LaTeX.',
  },
  {
    id: 'neutral',
    label: 'Asistente neutral',
    value:
      'Eres un asistente virtual neutral y útil. Responde de forma clara, breve y profesional. Si no tienes certeza legal, dilo con prudencia y no inventes normas.',
  },
  {
    id: 'cita-bolivia',
    label: 'Cita siempre normativa boliviana',
    value:
      'Eres un asistente legal boliviano. Debes responder siempre con base en la normativa boliviana (LGT, Decretos Supremos) y citar el artículo correspondiente. Si no hay contexto legal suficiente, indícalo expresamente y no inventes límites ni supuestos.',
  },
  {
    id: 'custom',
    label: 'Personalizado',
    value: '',
  },
] as const;

const MIN_TOKENS = 256;
const MAX_TOKENS = 2048;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const defaultConfig: AIConfig = {
  temperatura: 0.2,
  maxTokens: 1024,
  kChunks: 5,
  systemPrompt: promptPresets[0].value,
};

const getPresetId = (value: string): string => {
  const normalized = value.trim();
  const found = promptPresets.find((preset) => preset.value.trim() === normalized);
  return found?.id ?? 'custom';
};

export default function AISettingsPage(): JSX.Element {
  const { token } = useAuth();
  const [config, setConfig] = useState<AIConfig>(defaultConfig);
  const [selectedPromptPreset, setSelectedPromptPreset] = useState<string>(getPresetId(defaultConfig.systemPrompt));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  useEffect(() => {
    fetch('/api/ai-config', {
      headers: authHeaders,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'No se pudo cargar la configuración');
        const nextConfig = { ...defaultConfig, ...data.data };
        setConfig(nextConfig);
        setSelectedPromptPreset(getPresetId(nextConfig.systemPrompt));
      })
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la configuración');
      });
  }, [token]);

  const update = <K extends keyof AIConfig>(key: K, value: AIConfig[K]): void => {
    setConfig((current) => ({ ...current, [key]: value }));
    setMessage('');
    setError('');
  };

  const handlePromptPresetChange = (presetId: string): void => {
    const preset = promptPresets.find((option) => option.id === presetId);
    setSelectedPromptPreset(presetId);
    update('systemPrompt', preset?.value ?? '');
  };

  const handleCustomPromptChange = (value: string): void => {
    setSelectedPromptPreset('custom');
    update('systemPrompt', value);
  };

  const handleMaxTokensChange = (value: string): void => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return;
    update('maxTokens', clamp(numericValue, MIN_TOKENS, MAX_TOKENS));
  };

  const save = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setMessage('');
    setError('');

    const normalizedConfig = {
      ...config,
      maxTokens: clamp(config.maxTokens, MIN_TOKENS, MAX_TOKENS),
    };

    if (normalizedConfig.temperatura < 0 || normalizedConfig.temperatura > 1) {
      setError('Los valores ingresados están fuera del rango permitido');
      return;
    }
    if (!normalizedConfig.systemPrompt.trim()) {
      setError('El texto de instrucciones no puede estar vacío');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/ai-config', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(normalizedConfig),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo guardar la configuración');
      const nextConfig = { ...defaultConfig, ...data.data, maxTokens: clamp(Number(data.data?.maxTokens ?? defaultConfig.maxTokens), MIN_TOKENS, MAX_TOKENS) };
      setConfig(nextConfig);
      setMessage(data.message || 'Configuración guardada correctamente');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 py-10 sm:px-6 lg:px-8">
      <form onSubmit={save} className="mx-auto max-w-4xl space-y-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C49A45]">Administrador</p>
          <h1 className="mt-3 text-3xl font-bold text-[#1F4E34]">Parámetros del modelo de IA</h1>
          <p className="mt-3 text-slate-600">Configura el estilo y el alcance de las respuestas legales.</p>
        </header>

        <section className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="temperatura" className="mb-2 flex justify-between text-sm font-medium text-slate-700"><span>Temperatura</span><span>{config.temperatura.toFixed(1)}</span></label>
            <input id="temperatura" type="range" min="0" max="1" step="0.1" className="w-full accent-[#1F4E34]" value={config.temperatura} onChange={(e) => update('temperatura', Number(e.target.value))} />
          </div>
          <div>
            <label htmlFor="maxTokens" className="mb-2 block text-sm font-medium text-slate-700">Límite de tokens</label>
            <input
              id="maxTokens"
              type="number"
              min={MIN_TOKENS}
              max={MAX_TOKENS}
              className="input-field"
              value={config.maxTokens}
              onChange={(e) => handleMaxTokensChange(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="kChunks" className="mb-2 block text-sm font-medium text-slate-700">Fragmentos recuperados (K)</label>
            <select id="kChunks" className="input-field" value={config.kChunks} onChange={(e) => update('kChunks', Number(e.target.value))}>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value} fragmento{value > 1 ? 's' : ''}</option>)}
            </select>
          </div>
        </section>

        <section>
          <p className="mb-3 block text-sm font-medium text-slate-700">Instrucción base activa</p>
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            {promptPresets.map((preset) => (
              <label
                key={preset.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${selectedPromptPreset === preset.id ? 'border-[#1F4E34] bg-[#1F4E34]/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <input
                  type="checkbox"
                  name="systemPromptPreset"
                  value={preset.id}
                  checked={selectedPromptPreset === preset.id}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handlePromptPresetChange(preset.id);
                    } else if (selectedPromptPreset === preset.id) {
                      setSelectedPromptPreset('');
                      update('systemPrompt', '');
                    }
                  }}
                  className="mt-1 h-4 w-4 accent-[#1F4E34]"
                />
                <span className="text-sm text-slate-700">{preset.label}</span>
              </label>
            ))}
          </div>

          {selectedPromptPreset === 'custom' && (
            <>
              <label htmlFor="systemPrompt" className="mb-2 block text-sm font-medium text-slate-700">Texto activo</label>
              <textarea
                id="systemPrompt"
                rows={7}
                className="input-field resize-y"
                value={config.systemPrompt}
                onChange={(e) => handleCustomPromptChange(e.target.value)}
              />
            </>
          )}
        </section>

        {error && <div className="rounded-xl border border-[#8B0000]/20 bg-[#8B0000]/5 px-4 py-3 text-sm text-[#8B0000]">{error}</div>}
        {message && <div className="rounded-xl border border-[#1F4E34]/20 bg-[#1F4E34]/5 px-4 py-3 text-sm text-[#1F4E34]">{message}</div>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar configuración'}</button>
        </div>
      </form>
    </main>
  );
}
