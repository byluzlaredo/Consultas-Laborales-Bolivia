import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../context/AuthContext';

interface BenefitResult {
  calculationId?: number;
  resultado?: {
    tiempoServicio: { anos: number; meses: number; dias: number; totalDiasComerciales: number };
    spi: number;
    salarioDiario: number;
    indemnizacion: { subtotal: number };
    desahucio: { subtotal: number };
    aguinaldo: { subtotal: number };
    vacaciones: { subtotal: number };
    totalFiniquito: number;
    totalEnLetras: string;
    avisos: string[];
  };
  informe?: string;
}

const money = (value: number): string => `Bs ${value.toFixed(2)}`;

function formatearFecha(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

export default function BenefitsCalculatorPage(): JSX.Element {
  const { token } = useAuth();
  const [form, setForm] = useState({
    ingreso: '',
    salida: '',
    motivo: 'Renuncia Voluntaria',
    salario1: '',
    salario2: '',
    salario3: '',
    diasVacaciones: '0',
  });
  const [result, setResult] = useState<BenefitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInforme, setShowInforme] = useState(false);

  const calculate = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const salaries = [form.salario1, form.salario2, form.salario3].map(Number);

      if (salaries.some((s) => !Number.isFinite(s) || s <= 0)) {
        throw new Error('Ingrese fechas y montos válidos para realizar el cálculo');
      }

      if (!form.ingreso || !form.salida || new Date(`${form.salida}T00:00:00`) <= new Date(`${form.ingreso}T00:00:00`) || Number(form.diasVacaciones) < 0) {
        throw new Error('Ingrese fechas y montos válidos para realizar el cálculo');
      }

      const response = await fetch('/api/laboral/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          fechaIngreso: formatearFecha(form.ingreso),
          fechaRetiro: formatearFecha(form.salida),
          motivo: form.motivo,
          salarioMes1: parseFloat(form.salario1),
          salarioMes2: parseFloat(form.salario2),
          salarioMes3: parseFloat(form.salario3),
          diasVacacionesPendientes: parseInt(form.diasVacaciones) || 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al procesar la estimación de beneficios');
      }

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la estimación de beneficios');
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof typeof form, value: string): void => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const exportDetail = (): void => {
    if (!result?.informe) return;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    const lines = result.informe.split('\n');
    let y = 10;
    const pageHeight = pdf.internal.pageSize.getHeight();
    const lineHeight = 3.5;

    pdf.setFontSize(8);
    pdf.setFont('courier');

    lines.forEach((line) => {
      if (y > pageHeight - 10) {
        pdf.addPage();
        y = 10;
      }
      pdf.text(line, 8, y);
      y += lineHeight;
    });

    pdf.save('finiquito-beneficios-sociales.pdf');
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Formulario */}
        <form onSubmit={calculate} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C49A45]">Calculadora Especializada</p>
          <h1 className="mt-3 text-3xl font-bold text-[#1F4E34]">Beneficios Sociales y Finiquito</h1>

          <div className="mt-8 space-y-5">
            {/* Fechas */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ingreso" className="mb-2 block text-sm font-medium text-slate-700">
                  Fecha de Ingreso
                </label>
                <input
                  id="ingreso"
                  type="date"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#C49A45] focus:outline-none focus:ring-1 focus:ring-[#C49A45]"
                  value={form.ingreso}
                  onChange={(e) => update('ingreso', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="salida" className="mb-2 block text-sm font-medium text-slate-700">
                  Fecha de Retiro
                </label>
                <input
                  id="salida"
                  type="date"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#C49A45] focus:outline-none focus:ring-1 focus:ring-[#C49A45]"
                  value={form.salida}
                  onChange={(e) => update('salida', e.target.value)}
                />
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label htmlFor="motivo" className="mb-2 block text-sm font-medium text-slate-700">
                Motivo de Retiro
              </label>
              <select
                id="motivo"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#C49A45] focus:outline-none focus:ring-1 focus:ring-[#C49A45]"
                value={form.motivo}
                onChange={(e) => update('motivo', e.target.value)}
              >
                <option>Renuncia Voluntaria</option>
                <option>Despido Injustificado</option>
                <option>Despido Justificado</option>
              </select>
            </div>

            {/* Salarios */}
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700">Remuneraciones (últimos 3 meses)</label>
              <div className="space-y-3">
                {(['salario1', 'salario2', 'salario3'] as const).map((key, index) => (
                  <div key={key}>
                    <label htmlFor={key} className="mb-1 block text-xs font-medium text-slate-600">
                      Mes {index + 1}
                    </label>
                    <input
                      id={key}
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#C49A45] focus:outline-none focus:ring-1 focus:ring-[#C49A45]"
                      value={form[key]}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Días de Vacaciones */}
            <div>
              <label htmlFor="diasVacaciones" className="mb-2 block text-sm font-medium text-slate-700">
                Días de Vacaciones Pendientes
              </label>
              <input
                id="diasVacaciones"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#C49A45] focus:outline-none focus:ring-1 focus:ring-[#C49A45]"
                value={form.diasVacaciones}
                onChange={(e) => update('diasVacaciones', e.target.value)}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#1F4E34] py-3 font-semibold text-white transition hover:bg-[#153d26] disabled:opacity-50"
            >
              {loading ? 'Calculando...' : 'Calcular Finiquito'}
            </button>
          </div>
        </form>

        {/* Resultados */}
        {result?.resultado && (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold text-[#1F4E34]">Resumen de Liquidación</h2>

            {result.resultado.avisos.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-800">Advertencias:</p>
                <ul className="mt-2 space-y-1 text-xs text-amber-700">
                  {result.resultado.avisos.map((aviso, idx) => (
                    <li key={idx}>{aviso}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Datos */}
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-medium text-slate-600">Tiempo de Servicio:</span>
                <span className="font-semibold text-slate-900">
                  {result.resultado.tiempoServicio.anos}a {result.resultado.tiempoServicio.meses}m {result.resultado.tiempoServicio.dias}d
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-medium text-slate-600">Sueldo Promedio (SPI):</span>
                <span className="font-semibold text-slate-900">{money(result.resultado.spi)}</span>
              </div>
            </div>

            {/* Tabla de Rubros */}
            <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">Indemnización por T.S.</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {money(result.resultado.indemnizacion.subtotal)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-700">Desahucio</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {money(result.resultado.desahucio.subtotal)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">Aguinaldo Proporcional</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {money(result.resultado.aguinaldo.subtotal)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-700">Vacaciones No Gozadas</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {money(result.resultado.vacaciones.subtotal)}
                    </td>
                  </tr>
                  <tr className="bg-[#1F4E34]">
                    <td className="px-4 py-4 font-bold text-white">TOTAL FINIQUITO</td>
                    <td className="px-4 py-4 text-right text-2xl font-bold text-[#C49A45]">
                      {money(result.resultado.totalFiniquito)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Monto en Letras */}
            <div className="mt-4 rounded-lg bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-600">Monto en Letras:</p>
              <p className="mt-1 text-sm font-semibold text-blue-900">{result.resultado.totalEnLetras}</p>
            </div>

            {/* Botones */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowInforme(!showInforme)}
                className="flex-1 rounded-lg border border-[#1F4E34] py-2 font-semibold text-[#1F4E34] transition hover:bg-[#1F4E34]/5"
              >
                {showInforme ? 'Ocultar' : 'Ver'} Informe Detallado
              </button>
              <button
                onClick={exportDetail}
                className="flex-1 rounded-lg bg-[#C49A45] py-2 font-semibold text-white transition hover:bg-[#a87d2f]"
              >
                📄 Descargar PDF
              </button>
            </div>

            {/* Informe Completo */}
            {showInforme && result.informe && (
              <div className="mt-6 rounded-lg border border-slate-300 bg-slate-50 p-4">
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-700">
                  {result.informe}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
