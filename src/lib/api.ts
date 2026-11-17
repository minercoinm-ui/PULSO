const TOKEN_STORAGE_KEY = 'pulso_auth_token';
const DIRECT_UPLOAD_THRESHOLD_BYTES = 3.5 * 1024 * 1024; // Avoid Vercel 4.5MB Serverless body limit

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erro na requisição (${res.status})`);
  }
  return data as T;
}

function uploadViaSignedUrl(
  signedUrl: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.min(95, Math.round((event.loaded / event.total) * 95));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Falha ao enviar arquivo ao Storage (${xhr.status}).`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Erro de conexão durante o upload direto ao Storage.'));
    };

    xhr.send(file);
  });
}

export async function uploadMediaWithProgress(
  formData: FormData,
  onProgress: (percent: number) => void
): Promise<{
  public_url: string;
  storage_path: string;
  imageRecord?: any;
  videoRecord?: any;
}> {
  const file = formData.get('file');
  const kind = String(formData.get('kind') || 'image');
  const productId = formData.get('product_id') ? String(formData.get('product_id')) : null;
  const title = formData.get('title') ? String(formData.get('title')) : undefined;
  const isCampaign = String(formData.get('is_campaign') || 'false') === 'true';

  if (file instanceof File && file.size > DIRECT_UPLOAD_THRESHOLD_BYTES) {
    try {
      const signed = await apiRequest<{
        supported: boolean;
        signed_url?: string;
        storage_path?: string;
        public_url?: string;
      }>('/api/admin/media/signed-upload', {
        method: 'POST',
        body: JSON.stringify({
          kind,
          product_id: productId,
          original_name: file.name,
          mime_type: file.type,
          file_size: file.size,
        }),
      });

      if (signed.supported && signed.signed_url && signed.storage_path && signed.public_url) {
        await uploadViaSignedUrl(signed.signed_url, file, onProgress);
        const committed = await apiRequest<{
          public_url: string;
          storage_path: string;
          imageRecord?: any;
          videoRecord?: any;
        }>('/api/admin/media/commit', {
          method: 'POST',
          body: JSON.stringify({
            kind,
            product_id: productId,
            storage_path: signed.storage_path,
            public_url: signed.public_url,
            original_name: file.name,
            mime_type: file.type,
            file_size: file.size,
            title: title || file.name,
            is_campaign: isCampaign,
          }),
        });
        onProgress(100);
        return committed;
      }
    } catch (err) {
      // Fall back to standard multipart upload on local dev when not on Supabase
      if (file.size > 4.2 * 1024 * 1024 && window.location.hostname.endsWith('.vercel.app')) {
        throw err;
      }
    }
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/media/upload');
    const token = getStoredToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.round((event.loaded / event.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve(parsed);
        } else {
          reject(new Error(parsed.error || 'Falha no envio do arquivo.'));
        }
      } catch {
        reject(new Error('Resposta inválida do servidor durante o upload.'));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Erro de conexão ao enviar mídia.'));
    };

    xhr.send(formData);
  });
}
