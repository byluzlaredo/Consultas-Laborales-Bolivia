import { useRef, useState } from 'react';
import { FileText, UploadCloud } from 'lucide-react';

type NormaTipo = 'Ley' | 'Decreto Supremo' | 'Resolución Ministerial' | 'Código';

interface MetadataForm {
  titulo: string;
  tipo: NormaTipo;
  numero: string;
  fuente: string;
  fechaPublicacion: string;
}

const initialForm: MetadataForm = {
  titulo: '',
  tipo: 'Ley',
  numero: '',
  fuente: '',
  fechaPublicacion: '',
};

export default function DocumentUploader(): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<MetadataForm>(initialForm);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(false);
    const selected = event.dataTransfer.files?.[0] ?? null;
    setFile(selected);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!file) {
      setError('Formato de archivo no válido. Solo se permiten archivos PDF');
      return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Formato de archivo no válido. Solo se permiten archivos PDF');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('El archivo excede el tamaño máximo permitido de 20 MB');
      return;
    }

    if (!form.titulo || !form.numero || !form.fuente || !form.fechaPublicacion) {
      setError('Complete todos los metadatos obligatorios');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('titulo', form.titulo);
    formData.append('tipo', form.tipo);
    formData.append('numero', form.numero);
    formData.append('fuente', form.fuente);
    formData.append('fecha_publicacion', form.fechaPublicacion);

    const token = localStorage.getItem('clb_token');

    try {
      const response = await fetch('/api/normativa', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al cargar la normativa');
      }

      setSuccess('Normativa cargada correctamente y registrada como Pendiente de Procesamiento');
      setFile(null);
      setForm(initialForm);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (uploadError) {
      const message = uploadError instanceof TypeError
        ? 'No se pudo conectar con el servidor. Inicie la API con npm run dev:server.'
        : uploadError instanceof Error
          ? uploadError.message
          : 'Error al cargar la normativa';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C49A45]">Administración</p>
            <h1 className="mt-3 text-3xl font-bold text-[#1F4E34]">Carga de normativa laboral</h1>
          </div>
          <div className="hidden rounded-full bg-[#1F4E34]/10 px-4 py-2 text-sm font-medium text-[#1F4E34] sm:block">
            PDF • máx. 20 MB
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-[24px] border-2 border-dashed p-8 text-center transition ${
              isDragging ? 'border-[#C49A45] bg-[#F8F9FA]' : 'border-[#1F4E34]/30 bg-white'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              onChange={handleInputChange}
              className="hidden"
            />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1F4E34]/10 text-[#1F4E34]">
              <UploadCloud size={32} />
            </div>
            <p className="mt-5 text-lg font-semibold text-[#1F4E34]">Arrastra y suelta el PDF aquí</p>
            <p className="mt-2 text-sm text-slate-500">o</p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-[#1F4E34] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#163c2b]"
              onClick={() => inputRef.current?.click()}
            >
              Seleccionar archivo PDF
            </button>
            {file && (
              <div className="mt-5 flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-[#F8F9FA] px-4 py-3 text-sm text-slate-700">
                <FileText size={16} className="text-[#C49A45]" />
                {file.name}
              </div>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="titulo" className="mb-2 block text-sm font-medium text-slate-700">Título de la Norma</label>
              <input
                id="titulo"
                value={form.titulo}
                onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
                className="input-field"
                placeholder="Ej. Ley General del Trabajo"
              />
            </div>

            <div>
              <label htmlFor="tipo" className="mb-2 block text-sm font-medium text-slate-700">Tipo de Norma</label>
              <select
                id="tipo"
                value={form.tipo}
                onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value as NormaTipo }))}
                className="input-field"
              >
                <option value="Ley">Ley</option>
                <option value="Decreto Supremo">Decreto Supremo</option>
                <option value="Resolución Ministerial">Resolución Ministerial</option>
                <option value="Código">Código</option>
              </select>
            </div>

            <div>
              <label htmlFor="numero" className="mb-2 block text-sm font-medium text-slate-700">Número de Norma</label>
              <input
                id="numero"
                value={form.numero}
                onChange={(e) => setForm((prev) => ({ ...prev, numero: e.target.value }))}
                className="input-field"
                placeholder="Ej. Ley 1178"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="fuente" className="mb-2 block text-sm font-medium text-slate-700">Fuente</label>
              <input
                id="fuente"
                value={form.fuente}
                onChange={(e) => setForm((prev) => ({ ...prev, fuente: e.target.value }))}
                className="input-field"
                placeholder="Ej. Gaceta Oficial del Estado Plurinacional de Bolivia"
              />
            </div>

            <div>
              <label htmlFor="fechaPublicacion" className="mb-2 block text-sm font-medium text-slate-700">Fecha de Publicación</label>
              <input
                id="fechaPublicacion"
                type="date"
                value={form.fechaPublicacion}
                onChange={(e) => setForm((prev) => ({ ...prev, fechaPublicacion: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-[#8B0000]/20 bg-[#8B0000]/5 px-4 py-3 text-sm text-[#8B0000]">{error}</div>
          )}

          {success && (
            <div className="rounded-xl border border-[#1F4E34]/20 bg-[#1F4E34]/5 px-4 py-3 text-sm text-[#1F4E34]">{success}</div>
          )}

          <button type="submit" className="btn-primary w-full py-3.5 text-base">
            Guardar normativa
          </button>
        </form>
      </div>
    </div>
  );
}
