import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Film,
  ImagePlus,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { apiRequest, uploadMediaWithProgress } from '../../lib/api';
import { formatBytes } from '../../lib/format';
import type { ProductImage, ProductVideo } from '../../types/ecommerce';

interface QueuedFile {
  localId: string;
  file: File;
  kind: 'image' | 'video';
  previewUrl: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  isCampaign?: boolean;
}

interface AdminMediaUploaderProps {
  productId: string | null;
  images: ProductImage[];
  videos: ProductVideo[];
  onRefresh: () => Promise<void>;
}

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const VALID_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMG_BYTES = 10 * 1024 * 1024;
const MAX_VID_BYTES = 80 * 1024 * 1024;

export function AdminMediaUploader({
  productId,
  images,
  videos,
  onRefresh,
}: AdminMediaUploaderProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const enqueueFiles = (fileList: FileList | null, forcedKind?: 'image' | 'video') => {
    if (!fileList || fileList.length === 0) return;
    setValidationError(null);

    const added: QueuedFile[] = [];
    for (const file of Array.from(fileList)) {
      const isImg = VALID_IMAGE_TYPES.includes(file.type);
      const isVid = VALID_VIDEO_TYPES.includes(file.type);

      if (forcedKind === 'image' && !isImg) {
        setValidationError(`Formato inválido em "${file.name}". Use JPG, PNG, WEBP ou AVIF.`);
        continue;
      }
      if (forcedKind === 'video' && !isVid) {
        setValidationError(`Formato inválido em "${file.name}". Use MP4, WEBM ou MOV.`);
        continue;
      }
      if (!isImg && !isVid) {
        setValidationError(`Tipo de arquivo não suportado: ${file.name}`);
        continue;
      }
      if (isImg && file.size > MAX_IMG_BYTES) {
        setValidationError(`A imagem "${file.name}" excede 10 MB.`);
        continue;
      }
      if (isVid && file.size > MAX_VID_BYTES) {
        setValidationError(`O vídeo "${file.name}" excede 80 MB.`);
        continue;
      }

      added.push({
        localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        kind: isVid ? 'video' : 'image',
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: 'pending',
        isCampaign: false,
      });
    }

    if (added.length > 0) {
      setQueue((prev) => [...prev, ...added]);
    }
  };

  const removeFromQueue = (localId: string) => {
    setQueue((prev) => {
      const target = prev.find((q) => q.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((q) => q.localId !== localId);
    });
  };

  const uploadSingle = async (item: QueuedFile) => {
    if (!productId) {
      setValidationError('Salve os dados básicos do produto antes de enviar mídias.');
      return;
    }

    setQueue((prev) =>
      prev.map((q) => (q.localId === item.localId ? { ...q, status: 'uploading', progress: 5 } : q))
    );

    const formData = new FormData();
    formData.append('file', item.file);
    formData.append('kind', item.kind);
    formData.append('product_id', productId);
    formData.append('title', item.file.name);
    formData.append('is_campaign', String(Boolean(item.isCampaign)));

    try {
      await uploadMediaWithProgress(formData, (pct) => {
        setQueue((prev) =>
          prev.map((q) => (q.localId === item.localId ? { ...q, progress: pct } : q))
        );
      });

      setQueue((prev) =>
        prev.map((q) =>
          q.localId === item.localId ? { ...q, status: 'done', progress: 100 } : q
        )
      );
      await onRefresh();
      setTimeout(() => removeFromQueue(item.localId), 700);
    } catch (err: any) {
      setQueue((prev) =>
        prev.map((q) =>
          q.localId === item.localId
            ? { ...q, status: 'error', error: err.message || 'Erro no envio' }
            : q
        )
      );
    }
  };

  const uploadAllPending = async () => {
    const pending = queue.filter((q) => q.status === 'pending' || q.status === 'error');
    for (const item of pending) {
      await uploadSingle(item);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    if (!productId) return;
    setBusyId(imageId);
    try {
      await apiRequest(`/api/admin/products/${productId}/images/${imageId}/primary`, {
        method: 'PUT',
      });
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleMoveImage = async (index: number, direction: -1 | 1) => {
    if (!productId) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);

    setBusyId(moved.id);
    try {
      await apiRequest(`/api/admin/products/${productId}/images/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ ordered_ids: reordered.map((i) => i.id) }),
      });
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!productId) return;
    setBusyId(imageId);
    try {
      await apiRequest(`/api/admin/products/${productId}/images/${imageId}`, {
        method: 'DELETE',
      });
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    setBusyId(videoId);
    try {
      await apiRequest(`/api/admin/videos/${videoId}`, {
        method: 'DELETE',
      });
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 border-t border-zinc-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-semibold text-zinc-950">
            Galeria de Fotos e Vídeos do Produto
          </h4>
          <p className="text-xs text-zinc-500">
            Envie fotografias reais (JPG, PNG, WEBP, AVIF até 10 MB) e vídeos demonstrativos (MP4,
            WEBM, MOV até 80 MB).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!productId}
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-40 whitespace-nowrap"
          >
            <ImagePlus className="h-4 w-4" />
            Selecionar Fotos
          </button>
          <button
            type="button"
            disabled={!productId}
            onClick={() => videoInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-40 whitespace-nowrap"
          >
            <Film className="h-4 w-4" />
            Selecionar Vídeos
          </button>
        </div>
      </div>

      {!productId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Salve primeiro as informações do tênis acima para liberar o envio de fotos e vídeos vinculados ao produto.
        </div>
      )}

      {validationError && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          <span>{validationError}</span>
          <button type="button" onClick={() => setValidationError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Drag & Drop Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (productId) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (productId) enqueueFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition-colors ${
          dragActive
            ? 'border-lime-500 bg-lime-50/50'
            : 'border-zinc-300 bg-zinc-50/70'
        } ${!productId ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <Upload className="mb-2 h-6 w-6 text-zinc-500" />
        <p className="text-sm font-medium text-zinc-800">
          Arraste múltiplas fotos ou vídeos aqui para pré-visualizar antes de publicar
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Organizados automaticamente por produto no Storage
        </p>
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            enqueueFiles(e.target.files, 'image');
            e.target.value = '';
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          multiple
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => {
            enqueueFiles(e.target.files, 'video');
            e.target.value = '';
          }}
        />
      </div>

      {/* Preview Queue Before Publishing */}
      {queue.length > 0 && (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-900">
              Pré-visualização ({queue.length} {queue.length === 1 ? 'arquivo' : 'arquivos'})
            </span>
            <button
              type="button"
              onClick={uploadAllPending}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-lime-300 transition-colors hover:bg-zinc-800"
            >
              <Upload className="h-3.5 w-3.5" />
              Enviar Todos para o Storage
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {queue.map((item) => (
              <div
                key={item.localId}
                className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
              >
                <div className="relative aspect-[4/3] bg-zinc-900">
                  {item.kind === 'image' ? (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video
                      src={item.previewUrl}
                      controls
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFromQueue(item.localId)}
                    className="absolute right-2 top-2 rounded-full bg-zinc-950/80 p-1.5 text-white hover:bg-red-600"
                    title="Remover da fila"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-zinc-900">{item.file.name}</span>
                    <span className="shrink-0 font-mono text-zinc-500">
                      {formatBytes(item.file.size)}
                    </span>
                  </div>

                  {item.kind === 'video' && (
                    <label className="flex items-center gap-2 text-xs text-zinc-700">
                      <input
                        type="checkbox"
                        checked={Boolean(item.isCampaign)}
                        onChange={(e) =>
                          setQueue((prev) =>
                            prev.map((q) =>
                              q.localId === item.localId
                                ? { ...q, isCampaign: e.target.checked }
                                : q
                            )
                          )
                        }
                      />
                      Destacar na seção de Vídeos Promocionais
                    </label>
                  )}

                  {/* Real Upload Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className={`h-full transition-all duration-150 ${
                          item.status === 'error' ? 'bg-red-500' : 'bg-lime-500'
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>
                        {item.status === 'pending' && 'Pronto para envio'}
                        {item.status === 'uploading' && `Enviando... ${item.progress}%`}
                        {item.status === 'done' && (
                          <span className="inline-flex items-center gap-1 text-lime-700 font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Concluído
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="text-red-600">{item.error}</span>
                        )}
                      </span>
                      {item.status !== 'uploading' && item.status !== 'done' && (
                        <button
                          type="button"
                          onClick={() => uploadSingle(item)}
                          className="font-semibold text-zinc-900 underline"
                        >
                          Enviar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Published Product Images Gallery */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Fotografias Enviadas ({images.length})
          </h5>
        </div>

        {images.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-xs text-zinc-500">
            Nenhuma fotografia enviada para este produto ainda. Selecione arquivos reais acima.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className={`group relative overflow-hidden rounded-xl border bg-white ${
                  img.is_primary ? 'border-lime-500 ring-1 ring-lime-500' : 'border-zinc-200'
                }`}
              >
                <div className="aspect-[4/3] bg-zinc-100">
                  <img
                    src={img.public_url}
                    alt={img.alt_text}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-1 border-t border-zinc-100 p-2">
                  <button
                    type="button"
                    disabled={busyId === img.id || img.is_primary}
                    onClick={() => handleSetPrimary(img.id)}
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                      img.is_primary
                        ? 'bg-zinc-950 text-lime-300'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    <Star className="h-3 w-3" />
                    {img.is_primary ? 'Principal' : 'Definir'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0 || busyId === img.id}
                      onClick={() => handleMoveImage(idx, -1)}
                      className="rounded p-1 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
                      title="Mover antes"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1 || busyId === img.id}
                      onClick={() => handleMoveImage(idx, 1)}
                      className="rounded p-1 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
                      title="Mover depois"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === img.id}
                      onClick={() => handleDeleteImage(img.id)}
                      className="rounded p-1 text-red-600 hover:bg-red-50"
                      title="Excluir fotografia"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Published Product Videos */}
      <div className="space-y-3">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Vídeos Associados ({videos.length})
        </h5>

        {videos.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-5 text-center text-xs text-zinc-500">
            Nenhum vídeo demonstrativo enviado para este tênis.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {videos.map((vid) => (
              <div
                key={vid.id}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
              >
                <video
                  src={vid.public_url}
                  controls
                  preload="metadata"
                  className="aspect-video w-full bg-zinc-950 object-cover"
                />
                <div className="flex items-center justify-between gap-2 p-3 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{vid.title}</p>
                    <p className="text-zinc-500">
                      {formatBytes(vid.file_size)}
                      {vid.is_campaign ? ' · Campanha na Home' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === vid.id}
                    onClick={() => handleDeleteVideo(vid.id)}
                    className="rounded p-1.5 text-red-600 hover:bg-red-50"
                    title="Excluir vídeo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
