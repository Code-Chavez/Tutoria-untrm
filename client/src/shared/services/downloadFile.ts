import { apiClient } from '@shared/services/apiClient';

// Descarga en el navegador un archivo servido por la API (exportaciones PDF/Excel, HU-46).
export async function downloadFile(
  path: string,
  filename: string,
  params?: Record<string, string | undefined>,
): Promise<void> {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const response = await apiClient.get(query.size > 0 ? `${path}?${query}` : path, {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
