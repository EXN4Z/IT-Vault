import { getErrorMessage } from './errors';

// simpan Blob hasil request sebagai file unduhan di browser
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url); // lepas memori setelah unduhan dimulai
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// kalau request berresponseType 'blob' gagal, isi error-nya juga berupa Blob, jadi harus dibaca dulu
export async function blobErrorMessage(err: unknown): Promise<string> {
  const body = (err as { response?: { data?: unknown } }).response?.data;
  if (body instanceof Blob) {
    try {
      const json = JSON.parse(await body.text());
      if (json?.message) return String(json.message);
    } catch { /* bukan JSON, jatuh ke pesan umum */ }
  }
  return getErrorMessage(err);
}