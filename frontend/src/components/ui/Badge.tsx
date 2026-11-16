// pill kecil dengan titik warna, dipakai untuk Role, Status, dst.
// dot: class warna titik, misal 'bg-success' | 'bg-warn' | 'bg-info' | 'bg-ink-muted'
export default function Badge({ dot, children }: { dot: string; children: string }) {
  return (
    <span className="inline-flex h-5 items-center gap-1.5 rounded-full border border-line px-2 text-[11px] font-semibold">
      <span className={`size-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}
