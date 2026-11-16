import { Search } from 'lucide-react';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// kolom cari di atas tabel
export default function SearchField({ value, onChange, placeholder = 'Cari...' }: SearchFieldProps) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border border-line bg-field px-3 focus-within:border-accent">
      <Search size={14} className="text-ink-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-xs outline-none placeholder:text-ink-muted"
      />
    </label>
  );
}
