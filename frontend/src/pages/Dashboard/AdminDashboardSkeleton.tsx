// kerangka loading dashboard admin: label dan judul tetap teks asli, hanya angka dan isi daftar yang jadi balok

// satu balok abu-abu yang berdenyut; ukuran diatur lewat className
function Bone({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-selected ${className}`} />;
}

// pengganti satu angka di dalam teks / baris Row (inline supaya tinggi barisnya tidak berubah)
export function AngkaBone({ className = 'h-3.5 w-8' }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block animate-pulse rounded bg-selected align-middle ${className}`} />;
}

// angka "x Unit" dan selisih bulan lalu di kanan atas kartu chart
export function ChartHeaderSkeleton() {
  return (
    <div className="space-y-1.5" aria-hidden="true">
      <Bone className="ml-auto h-5 w-20" />
      <Bone className="ml-auto h-3 w-28" />
    </div>
  );
}

// kerangka grafik: viewBox sama dengan PertumbuhanChart (720x190) jadi tingginya identik
export function ChartSkeleton() {
  const garis = [60, 93.3, 126.7, 160];
  return (
    <svg role="status" aria-busy="true" aria-label="Memuat grafik" viewBox="0 0 720 190" className="h-auto w-full animate-pulse">
      {garis.map((y) => (
        <line key={y} x1={30} x2={716} y1={y} y2={y} className="stroke-line" />
      ))}
      <path d="M44 140 C120 120, 180 138, 260 112 S 400 122, 480 88 S 620 78, 704 64 L704 160 L44 160 Z" className="fill-selected" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={34 + i * 132} y={178} width={20} height={6} rx={3} className="fill-selected" />
      ))}
    </svg>
  );
}

// daftar "Inventory terbaru": 5 baris seperti data aslinya (terbaru.slice(0, 5))
export function TerbaruSkeleton({ jumlah = 5 }: { jumlah?: number }) {
  return (
    <ul role="status" aria-busy="true" className="space-y-4">
      <li className="sr-only">Memuat...</li>
      {Array.from({ length: jumlah }, (_, i) => (
        <li key={i} className="flex items-center gap-3">
          <Bone className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Bone className="h-3.5 w-3/5" />
            <Bone className="h-3 w-2/5" />
          </div>
          <Bone className="h-5 w-20 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

// baris tabel "Laporan menunggu diterima" (penangananService.list(1, 5, 'menunggu') = 5 baris)
export function MenungguRowsSkeleton({ jumlah = 5 }: { jumlah?: number }) {
  return (
    <>
      {Array.from({ length: jumlah }, (_, i) => (
        <tr key={i} aria-hidden="true">
          <td className="px-5 py-2.5">
            <div className="space-y-1">
              <Bone className="h-3.5 w-32" />
              <Bone className="h-3.5 w-20" />
            </div>
          </td>
          <td className="px-3 py-2.5">
            <Bone className="h-3.5 w-20" />
          </td>
          <td className="px-3 py-2.5">
            <Bone className="h-3.5 w-16" />
          </td>
          <td className="px-3 py-2.5">
            <Bone className="h-3.5 w-24" />
          </td>
          <td className="px-5 py-2.5">
            <Bone className="ml-auto h-3.5 w-12" />
          </td>
        </tr>
      ))}
    </>
  );
}

// kerangka panel notifikasi (dipasang lewat prop `skeleton` di NotificationPanel): 2 baris = jumlah notifikasi per halaman
export function NotifikasiSkeleton({ jumlah = 2 }: { jumlah?: number }) {
  return (
    <ul role="status" aria-busy="true" className="divide-y divide-line/60">
      <li className="sr-only">Memuat...</li>
      {Array.from({ length: jumlah }, (_, i) => (
        <li key={i} className="flex gap-2.5 px-4 py-2.5">
          <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-transparent" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Bone className="h-3 w-4/5" />
            <Bone className="h-2.5 w-1/4" />
          </div>
        </li>
      ))}
    </ul>
  );
}
