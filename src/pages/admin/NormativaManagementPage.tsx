import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';

interface Normativa {
  id_normativa: string;
  titulo: string;
  tipo: 'Ley' | 'Decreto Supremo' | 'Resolución Ministerial';
  numero: string;
  fuente: string;
  fecha_publicacion: string;
  estado: string;
  fecha_creacion: string;
  cantidad_fragmentos?: number;
}

interface NormativaForm {
  titulo: string;
  tipo: 'Ley' | 'Decreto Supremo' | 'Resolución Ministerial';
  numero: string;
  fuente: string;
  fecha_publicacion: string;
  archivo?: File;
}

type NormativaStatus = 'PENDIENTE_PROCESAMIENTO' | 'PROCESANDO' | 'ACTIVO' | 'DEROGADA' | 'MODIFICADA' | 'INACTIVO' | 'ERROR';

export default function NormativaManagementPage(): JSX.Element {
  const [normativas, setNormativas] = useState<Normativa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedNormativaId, setSelectedNormativaId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<NormativaStatus>('ACTIVO');
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [form, setForm] = useState<NormativaForm>({
    titulo: '',
    tipo: 'Ley',
    numero: '',
    fuente: '',
    fecha_publicacion: '',
  });

  useEffect(() => {
    const fetchNormativas = async (): Promise<void> => {
      const token = localStorage.getItem('clb_token');
      try {
        let url = '/api/normativa';
        if (filterStatus) {
          url += `?estado=${filterStatus}`;
        }
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Error al cargar normativas');
        }

        const data = await response.json();
        setNormativas(data.data || []);
        if (!selectedNormativaId && (data.data || []).length > 0) {
          setSelectedNormativaId(data.data[0].id_normativa);
          setSelectedStatus((data.data[0].estado as NormativaStatus) || 'ACTIVO');
        }
        if (selectedNormativaId && (data.data || []).length > 0) {
          const current = (data.data as Normativa[]).find((n) => n.id_normativa === selectedNormativaId);
          if (current) {
            setSelectedStatus((current.estado as NormativaStatus) || 'ACTIVO');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNormativas();
  }, [filterStatus]);

  const handleFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files) {
      setForm((prev) => ({ ...prev, archivo: event.target.files?.[0] }));
    }
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!form.titulo || !form.numero || !form.fuente || !form.fecha_publicacion || !form.archivo) {
      setError('Completa todos los campos obligatorios');
      return;
    }

    setIsUploading(true);
    const token = localStorage.getItem('clb_token');
    const formData = new FormData();
    formData.append('titulo', form.titulo);
    formData.append('tipo', form.tipo);
    formData.append('numero', form.numero);
    formData.append('fuente', form.fuente);
    formData.append('fecha_publicacion', form.fecha_publicacion);
    formData.append('file', form.archivo);

    try {
      const response = await fetch('/api/normativa', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al subir normativa');
      }

      setForm({
        titulo: '',
        tipo: 'Ley',
        numero: '',
        fuente: '',
        fecha_publicacion: '',
      });
      setShowUploadForm(false);

      // Refresh list
      const listResponse = await fetch('/api/normativa', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await listResponse.json();
      setNormativas(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsUploading(false);
    }
  };

  const handleChangeStatus = async (
    normativaId: string,
    newStatus: NormativaStatus
  ): Promise<void> => {
    const token = localStorage.getItem('clb_token');
    try {
      const response = await fetch(`/api/normativa/${normativaId}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'No se pudo actualizar el registro normativo seleccionado.');
      }

      const result = await response.json();
      setNormativas(
        normativas.map((n) =>
          n.id_normativa === normativaId ? { ...n, estado: result.data?.estado || newStatus } : n
        )
      );
      setSelectedStatus((result.data?.estado as NormativaStatus) || newStatus);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar el registro normativo seleccionado.';
      setError(message);
    }
  };

  const handleSaveSelection = async (): Promise<void> => {
    if (!selectedNormativaId) {
      setError('No se pudo actualizar el registro normativo seleccionado.');
      return;
    }

    const selected = normativas.find((n) => n.id_normativa === selectedNormativaId);
    if (!selected) {
      setError('No se pudo actualizar el registro normativo seleccionado.');
      return;
    }

    try {
      const response = await fetch(`/api/normativa/${selectedNormativaId}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('clb_token')}`,
        },
        body: JSON.stringify({ estado: selectedStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'No se pudo actualizar el registro normativo seleccionado.');
      }

      const data = await response.json();
      const updatedNormativas = normativas.map((n) =>
        n.id_normativa === selectedNormativaId ? { ...n, estado: data.data?.estado || selectedStatus } : n
      );
      setNormativas(updatedNormativas);
      setError('');

      if (versionFile) {
        const payload = new FormData();
        payload.append('file', versionFile);
        payload.append('titulo', selected.titulo);
        payload.append('tipo', selected.tipo);
        payload.append('numero', selected.numero);
        payload.append('fuente', selected.fuente);
        payload.append('fecha_publicacion', selected.fecha_publicacion || new Date().toISOString().slice(0, 10));
        const versionResponse = await fetch(`/api/normativa/${selectedNormativaId}/version`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('clb_token')}`,
          },
          body: payload,
        });

        const versionData = await versionResponse.json();
        if (!versionResponse.ok) {
          throw new Error(versionData.message || 'No se pudo actualizar el registro normativo seleccionado.');
        }
      }

      setVersionFile(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar el registro normativo seleccionado.';
      setError(message);
    }
  };

  const handleProcessNormativa = async (normativaId: string): Promise<void> => {
    const token = localStorage.getItem('clb_token');
    try {
      setProcessingId(normativaId);
      setProcessingStatus(prev => ({ ...prev, [normativaId]: 'iniciando...' }));
      
      const response = await fetch(`/api/admin/normativa/${normativaId}/procesar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al procesar normativa');
      }

      const result = await response.json();
      setProcessingStatus(prev => ({ ...prev, [normativaId]: 'completado ✓' }));
      
      // Reload normativas to get updated status
      setTimeout(() => {
        const fetchNormativas = async (): Promise<void> => {
          const token = localStorage.getItem('clb_token');
          try {
            let url = '/api/normativa';
            if (filterStatus) {
              url += `?estado=${filterStatus}`;
            }
            const response = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Error al cargar');
            const data = await response.json();
            setNormativas(data.data || []);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
          } finally {
            setIsLoading(false);
          }
        };
        fetchNormativas();
        setProcessingId('');
      }, 1500);
    } catch (err) {
      setProcessingStatus(prev => ({ ...prev, [normativaId]: 'error: ' + (err instanceof Error ? err.message : 'unknown') }));
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setProcessingId('');
    }
  };

  const getStatusBadge = (status: string): string => {
    const statusMap: Record<string, string> = {
      ACTIVO: 'bg-green-100 text-green-800',
      INACTIVO: 'bg-gray-100 text-gray-800',
      'Pendiente de Procesamiento': 'bg-yellow-100 text-yellow-800',
      'PENDIENTE_PROCESAMIENTO': 'bg-yellow-100 text-yellow-800',
      PENDIENTE: 'bg-yellow-100 text-yellow-800',
      DEROGADA: 'bg-red-100 text-red-800',
      MODIFICADA: 'bg-orange-100 text-orange-800',
      PROCESANDO: 'bg-blue-100 text-blue-800',
      'Procesando': 'bg-blue-100 text-blue-800',
      'Procesado / Activo': 'bg-green-100 text-green-800',
      ERROR: 'bg-red-100 text-red-800',
    };
    return statusMap[status] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#1F4E34]">Gestión de Normativa</h1>
            <p className="mt-2 text-slate-600">Administra documentos legales y normativas</p>
          </div>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="btn-primary whitespace-nowrap text-sm"
          >
            {showUploadForm ? 'Cancelar' : 'Subir Normativa'}
          </button>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="mb-4 text-lg font-bold text-[#1F4E34]">Subir Nueva Normativa</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Título</label>
                  <input
                    name="titulo"
                    value={form.titulo}
                    onChange={handleFormChange}
                    type="text"
                    className="input-field w-full"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Tipo</label>
                  <select
                    name="tipo"
                    value={form.tipo}
                    onChange={handleFormChange}
                    className="input-field w-full"
                  >
                    <option>Ley</option>
                    <option>Decreto Supremo</option>
                    <option>Resolución Ministerial</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Número</label>
                  <input
                    name="numero"
                    value={form.numero}
                    onChange={handleFormChange}
                    type="text"
                    className="input-field w-full"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Fuente</label>
                  <input
                    name="fuente"
                    value={form.fuente}
                    onChange={handleFormChange}
                    type="text"
                    className="input-field w-full"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Fecha de Publicación
                  </label>
                  <input
                    name="fecha_publicacion"
                    value={form.fecha_publicacion}
                    onChange={handleFormChange}
                    type="date"
                    className="input-field w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Archivo PDF</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="input-field w-full"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn-primary text-sm"
                disabled={isUploading}
              >
                {isUploading ? 'Subiendo...' : 'Subir Normativa'}
              </button>
            </form>
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
          <label className="text-sm font-medium text-slate-700">Filtrar por estado:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="mt-2 rounded-lg border border-slate-300 px-4 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="PENDIENTE_PROCESAMIENTO">Pendiente de Procesamiento</option>
            <option value="PROCESANDO">Procesando</option>
            <option value="ERROR">Error</option>
          </select>
        </div>

        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700">Documento normativo</label>
              <select
                value={selectedNormativaId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedNormativaId(id);
                  const item = normativas.find((n) => n.id_normativa === id);
                  if (item) setSelectedStatus((item.estado as NormativaStatus) || 'ACTIVO');
                }}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                <option value="">Seleccione un documento</option>
                {normativas.map((item) => (
                  <option key={item.id_normativa} value={item.id_normativa}>
                    {item.titulo}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full md:max-w-xs">
              <label className="text-sm font-medium text-slate-700">Estado de vigencia</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as NormativaStatus)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700">Versión actualizada</label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveSelection}
              className="btn-primary text-sm"
            >
              Guardar Cambios
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Estado normativo actualizado correctamente.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Normativas Table */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-600">Cargando normativas...</div>
            </div>
          ) : normativas.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-600">No se encontraron normativas</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8F9FA]">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Título</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Tipo</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Estado</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    Fecha Creación
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {normativas.map((normativa) => (
                  <tr key={normativa.id_normativa} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {normativa.titulo}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{normativa.tipo}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(normativa.estado)}`}>
                        {normativa.estado.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(normativa.fecha_creacion).toLocaleDateString('es-BO')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col gap-2">
                        {processingStatus[normativa.id_normativa] && (
                          <div className="text-xs text-blue-600 font-medium">
                            {processingStatus[normativa.id_normativa]}
                          </div>
                        )}
                        {normativa.estado === 'Pendiente de Procesamiento' && !processingId && (
                          <button
                            onClick={() => handleProcessNormativa(normativa.id_normativa)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded whitespace-nowrap"
                          >
                            ⚡ Procesar
                          </button>
                        )}
                        {processingId === normativa.id_normativa && (
                          <button disabled className="bg-gray-400 text-white text-xs px-3 py-1 rounded">
                            ⏳ Procesando...
                          </button>
                        )}
                        {normativa.estado !== 'Pendiente de Procesamiento' && !processingStatus[normativa.id_normativa] && (
                          <select
                            value={normativa.estado}
                            onChange={(e) =>
                              handleChangeStatus(normativa.id_normativa, e.target.value as NormativaStatus)
                            }
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          >
                            <option value="ACTIVO">Activar</option>
                            <option value="DEROGADA">Derogada</option>
                            <option value="MODIFICADA">Modificada</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
