import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// class untuk <input> dan <textarea> di dalam FormField
export const inputClass =
  'h-10 w-full rounded-lg border border-line bg-field px-3 text-xs outline-none transition placeholder:text-ink-muted focus:border-accent';
export const textareaClass =
  'w-full resize-none rounded-lg border border-line bg-field px-3 py-2.5 text-xs outline-none transition placeholder:text-ink-muted focus:border-accent';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string; // pesan error di bawah field
  icon?: LucideIcon; // ikon di dalam field (teks otomatis bergeser)
  className?: string; // untuk atur lebar di grid, misal 'col-span-2'
  children: ReactNode; // <input> / <textarea> / <select> / <Combobox>
}

// label + field + pesan error, supaya semua form tampilannya seragam
export default function FormField({ label, required, error, icon: Icon, className = '', children }: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-soft">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </span>
        <span className={`relative block ${Icon ? '[&>input]:pl-10 [&>textarea]:pl-10 [&>select]:pl-10 [&>button]:pl-10' : ''}`}>
          {Icon && <Icon size={15} className="pointer-events-none absolute left-3 top-[13px] text-ink-muted" />}
          {children}
        </span>
      </label>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  );
}