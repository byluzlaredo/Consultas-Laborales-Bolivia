import { FormEvent, useMemo, useState } from 'react';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../context/AuthContext';

type DocumentType = 'Carta de Renuncia' | 'Denuncia Laboral' | 'Solicitud de Vacaciones' | 'Reclamo de Finiquito';
type ExportFormat = 'PDF' | 'DOCX';

interface DocumentForm {
  type: DocumentType;
  nombre: string;
  ci: string;
  empresa: string;
  cargo: string;
  fecha: string;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  hechos: string;
}

const initialForm: DocumentForm = {
  type: 'Carta de Renuncia', nombre: '', ci: '', empresa: '', cargo: '', fecha: '', fechaInicio: '', fechaFin: '', motivo: '', hechos: '',
};

const makeContent = (form: DocumentForm): string => {
  const date = form.fecha || '________________';
  const header = `La Paz, ${date}\n\nSeñores\n${form.empresa || '________________'}\nPresente.-`;
  if (form.type === 'Carta de Renuncia') return `${header}\n\nRef.: CARTA DE RENUNCIA\n\nDe mi consideración:\n\nYo, ${form.nombre}, con C.I. ${form.ci}, quien desempeña el cargo de ${form.cargo || '________________'}, comunico formalmente mi decisión de renunciar al cargo que ocupo en su empresa. Solicito se realice el pago de los beneficios sociales que correspondan conforme a la normativa laboral boliviana.\n\nAtentamente,\n\n${form.nombre}\nC.I. ${form.ci}`;
  if (form.type === 'Denuncia Laboral') return `${header}\n\nRef.: DENUNCIA LABORAL\n\nYo, ${form.nombre}, con C.I. ${form.ci}, trabajador(a) que desempeña el cargo de ${form.cargo || '________________'}, presento denuncia contra ${form.empresa || '________________'} por los siguientes hechos:\n\n${form.hechos || '________________________________________________________________'}\n\nMotivo de la denuncia: ${form.motivo || '________________________________________________________________'}\n\nSolicito que se investiguen los hechos y se adopten las medidas que correspondan conforme a la normativa laboral vigente.\n\nAtentamente,\n\n${form.nombre}\nC.I. ${form.ci}`;
  if (form.type === 'Solicitud de Vacaciones') return `${header}\n\nRef.: SOLICITUD DE VACACIONES\n\nYo, ${form.nombre}, con C.I. ${form.ci}, solicito autorización para hacer uso de mi descanso anual desde el ${form.fechaInicio || '________'} hasta el ${form.fechaFin || '________'}, de acuerdo con la normativa laboral vigente.\n\nMotivo u observación: ${form.motivo || 'Ninguno'}.\n\nAtentamente,\n\n${form.nombre}\nC.I. ${form.ci}`;
  return `${header}\n\nRef.: SOLICITUD DE PAGO DE FINIQUITO\n\nYo, ${form.nombre}, con C.I. ${form.ci}, solicito el cálculo y pago de los beneficios sociales y conceptos laborales pendientes derivados de mi relación laboral como ${form.cargo || '________________'}.\n\nMotivo: ${form.motivo || '________________'}.\n\nSolicito que se me entregue el desglose correspondiente conforme a la Ley General del Trabajo y su normativa complementaria.\n\nAtentamente,\n\n${form.nombre}\nC.I. ${form.ci}`;
};

const sanitizeFileName = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'documento-laboral';

const requiredFields = (form: DocumentForm): string[] => {
  const fields = [form.nombre, form.ci, form.empresa, form.fecha];
  if (form.type === 'Solicitud de Vacaciones') fields.push(form.fechaInicio, form.fechaFin);
  if (form.type === 'Denuncia Laboral') fields.push(form.motivo, form.hechos);
  if (form.type === 'Reclamo de Finiquito') fields.push(form.cargo, form.motivo);
  return fields;
};

const downloadBlob = (blob: Blob, title: string, format: ExportFormat): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFileName(title)}.${format.toLowerCase()}`;
  link.click();
  URL.revokeObjectURL(url);
};

const createPdf = (title: string, content: string): Blob => {
  const pdf = new jsPDF();
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setProperties({ title });
  const lines = pdf.splitTextToSize(content, 175) as string[];
  let y = 20;
  lines.forEach((line) => { if (y > 280) { pdf.addPage(); y = 20; } pdf.text(line, 18, y); y += 7; });
  return pdf.output('blob');
};

const createDocx = async (title: string, content: string): Promise<Blob> => {
  const paragraphs = content.split('\n').map((line) => new Paragraph({ children: [new TextRun({ text: line, font: 'Arial', size: 22 })], spacing: { after: 160 } }));
  const document = new Document({ sections: [{ children: [new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }), ...paragraphs] }] });
  return Packer.toBlob(document);
};

export default function DocumentGeneratorPage(): JSX.Element {
  const { token } = useAuth();
  const [form, setForm] = useState<DocumentForm>(initialForm);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const content = useMemo(() => makeContent(form), [form]);

  const generate = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (requiredFields(form).some((value) => !value.trim())) { setError('Complete todos los campos obligatorios para generar el documento'); setPreview(''); return; }
    setError('');
    setMessage('');
    setPreview(content);
  };

  const update = <K extends keyof DocumentForm>(key: K, value: DocumentForm[K]): void => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
    setMessage('');
  };
  const title = form.type;

  const exportDocument = async (format: ExportFormat): Promise<void> => {
    if (!preview) return;
    setExporting(format);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/laboral/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ tipo: form.type, titulo: form.type, contenido: preview, formato: format }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || 'Error al procesar el archivo. Intente exportar nuevamente');
      const blob = format === 'PDF' ? createPdf(title, preview) : await createDocx(title, preview);
      if (blob.size < 100) throw new Error('Archivo generado vacío');
      downloadBlob(blob, title, format);
      setMessage(`Documento ${format} generado correctamente`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Error al procesar el archivo. Intente exportar nuevamente');
    } finally {
      setExporting(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <form onSubmit={generate} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C49A45]">Documentos laborales</p>
          <h1 className="mt-3 text-3xl font-bold text-[#1F4E34]">Datos para tu documento</h1>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><label htmlFor="docType" className="mb-2 block text-sm font-medium text-slate-700">Plantilla</label><select id="docType" className="input-field" value={form.type} onChange={(e) => update('type', e.target.value as DocumentType)}><option>Carta de Renuncia</option><option>Denuncia Laboral</option><option>Solicitud de Vacaciones</option><option>Reclamo de Finiquito</option></select></div>
            <div><label htmlFor="nombre" className="mb-2 block text-sm font-medium text-slate-700">Nombres y apellidos *</label><input id="nombre" className="input-field" value={form.nombre} onChange={(e) => update('nombre', e.target.value)} /></div>
            <div><label htmlFor="ci" className="mb-2 block text-sm font-medium text-slate-700">Cédula de Identidad *</label><input id="ci" className="input-field" value={form.ci} onChange={(e) => update('ci', e.target.value)} /></div>
            <div><label htmlFor="empresa" className="mb-2 block text-sm font-medium text-slate-700">Empresa o empleador *</label><input id="empresa" className="input-field" value={form.empresa} onChange={(e) => update('empresa', e.target.value)} /></div>
            <div><label htmlFor="cargo" className="mb-2 block text-sm font-medium text-slate-700">Cargo {form.type === 'Reclamo de Finiquito' ? '*' : ''}</label><input id="cargo" className="input-field" value={form.cargo} onChange={(e) => update('cargo', e.target.value)} /></div>
            <div><label htmlFor="fecha" className="mb-2 block text-sm font-medium text-slate-700">Fecha del documento *</label><input id="fecha" type="date" className="input-field" value={form.fecha} onChange={(e) => update('fecha', e.target.value)} /></div>
            {form.type === 'Solicitud de Vacaciones' && <><div><label htmlFor="fechaInicio" className="mb-2 block text-sm font-medium text-slate-700">Inicio de vacaciones *</label><input id="fechaInicio" type="date" className="input-field" value={form.fechaInicio} onChange={(e) => update('fechaInicio', e.target.value)} /></div><div><label htmlFor="fechaFin" className="mb-2 block text-sm font-medium text-slate-700">Fin de vacaciones *</label><input id="fechaFin" type="date" className="input-field" value={form.fechaFin} onChange={(e) => update('fechaFin', e.target.value)} /></div></>}
            {(form.type === 'Denuncia Laboral' || form.type === 'Reclamo de Finiquito' || form.type === 'Solicitud de Vacaciones') && <div className="sm:col-span-2"><label htmlFor="motivo" className="mb-2 block text-sm font-medium text-slate-700">Motivo {form.type !== 'Solicitud de Vacaciones' ? '*' : ''}</label><textarea id="motivo" rows={3} className="input-field" value={form.motivo} onChange={(e) => update('motivo', e.target.value)} /></div>}
            {form.type === 'Denuncia Laboral' && <div className="sm:col-span-2"><label htmlFor="hechos" className="mb-2 block text-sm font-medium text-slate-700">Hechos denunciados *</label><textarea id="hechos" rows={5} className="input-field" value={form.hechos} onChange={(e) => update('hechos', e.target.value)} /></div>}
          </div>
          {error && <div className="mt-5 rounded-xl border border-[#8B0000]/20 bg-[#8B0000]/5 px-4 py-3 text-sm text-[#8B0000]">{error}</div>}
          {message && <div className="mt-5 rounded-xl border border-[#1F4E34]/20 bg-[#1F4E34]/5 px-4 py-3 text-sm text-[#1F4E34]">{message}</div>}
          <button type="submit" className="btn-primary mt-6 w-full py-3">Generar vista previa</button>
        </form>
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft sm:p-8"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-[#1F4E34]">Vista previa</h2><span className="text-xs uppercase tracking-wider text-slate-400">{preview ? 'Lista' : 'Pendiente'}</span></div><div className="mt-5 min-h-[420px] whitespace-pre-wrap rounded-2xl border border-slate-200 bg-[#F8F9FA] p-5 text-sm leading-7 text-slate-700">{preview || 'Completa el formulario para estructurar el documento.'}</div>{preview && <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" disabled={Boolean(exporting)} onClick={() => void exportDocument('PDF')} className="btn-primary w-full py-3 disabled:opacity-50">{exporting === 'PDF' ? 'Generando PDF...' : 'Descargar PDF'}</button><button type="button" disabled={Boolean(exporting)} onClick={() => void exportDocument('DOCX')} className="rounded-xl border border-[#1F4E34] px-4 py-3 font-semibold text-[#1F4E34] disabled:opacity-50">{exporting === 'DOCX' ? 'Generando DOCX...' : 'Descargar DOCX'}</button></div>}</section>
      </div>
    </main>
  );
}
