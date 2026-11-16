import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';

interface PhotoUploadFieldProps {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  max?: number; // jumlah foto (default 3)
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

// kecilkan foto HP (bisa 5-10 MB) jadi JPEG maks 1600px supaya upload cepat dan tidak mentok batas ukuran server
async function shrink(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file; // browser tidak bisa membaca gambarnya -> kirim apa adanya, server yang menilai
  }
}

// kotak upload beberapa foto (default 3) dengan pratinjau dan tombol hapus
export default function PhotoUploadField({ label, files, onChange, max = 3, required, error, disabled }: PhotoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  // URL pratinjau dibuat ulang tiap daftar file berubah, yang lama dilepas
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    e.target.value = ''; // supaya foto yang sama bisa dipilih lagi setelah dihapus
    const room = max - files.length;
    if (picked.length === 0 || room <= 0) return;

    setProcessing(true);
    const added = await Promise.all(picked.slice(0, room).map((f) => shrink(f)));
    setProcessing(false);
    onChange([...files, ...added]);
  };

  const busy = disabled || processing;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-soft">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
        <span className="ml-1.5 font-normal text-ink-muted">({files.length}/{max})</span>
      </span>

      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: max }, (_, i) =>
          files[i] ? (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-field">
              <img src={urls[i]} alt={`Foto bukti ${i + 1}`} className="size-full object-cover" />
              <button
                type="button"
                aria-label={`Hapus foto ${i + 1}`}
                disabled={busy}
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="absolute right-1 top-1 cursor-pointer rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80 disabled:cursor-not-allowed"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-field text-ink-muted transition hover:border-accent hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processing ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              <span className="text-[11px]">Foto {i + 1}</span>
            </button>
          ),
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple={max > 1} className="hidden" onChange={handleSelect} />
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}