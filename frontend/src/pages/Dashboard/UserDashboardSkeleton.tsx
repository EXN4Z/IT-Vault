// kerangka loading dashboard user: bentuknya meniru kartu barang, laporan kerusakan, dan riwayat perbaikan
// supaya halaman tidak "loncat" saat data selesai dimuat

// satu balok abu-abu yang berdenyut; ukuran diatur lewat className
function Bone({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-selected ${className}`} />;
}

// teks bantu untuk pembaca layar
function Loading() {
  return <span className="sr-only">Memuat...</span>;
}

// meniru <article> kartu barang di UserDashboardPage
function KartuBarangSkeleton() {
  return (
    <article className="flex min-w-0 flex-col rounded-sm border border-line bg-surface">
      {/* kepala: foto, nama + kode, badge status */}
      <header className="flex items-start gap-3 p-4 pb-3">
        <Bone className="size-12 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <Bone className="h-3.5 w-3/4" />
          <Bone className="h-3 w-1/2" />
        </div>
        <Bone className="h-5 w-24 rounded-full" />
      </header>

      {/* spesifikasi: merk, tipe, warna, serial */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <Bone className="h-2.5 w-10" />
            <Bone className="h-3 w-4/5" />
          </div>
        ))}
      </div>

      {/* info pemakaian */}
      <div className="flex items-center justify-between gap-2 border-y border-line bg-hover/40 px-4 py-2">
        <Bone className="h-3 w-1/2" />
        <Bone className="h-3 w-20" />
      </div>

      {/* kelengkapan */}
      <div className="flex-1 space-y-2 px-4 py-3">
        <Bone className="h-3 w-24" />
        <div className="flex items-center gap-2 py-1.5">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Bone className="h-3 w-2/3" />
            <Bone className="h-2.5 w-1/3" />
          </div>
          <Bone className="h-5 w-16 rounded-full" />
          <Bone className="size-[28px]" />
        </div>
      </div>

      {/* aksi */}
      <footer className="flex min-h-[57px] flex-wrap items-center gap-2 border-t border-line p-3">
        <Bone className="h-8 w-28 rounded-md" />
        <Bone className="ml-auto h-8 w-20 rounded-md" />
      </footer>
    </article>
  );
}

// section "Barang yang kamu pakai": judul asli, isinya balok
export function KartuSectionSkeleton({ jumlah = 2 }: { jumlah?: number }) {
  return (
    <section role="status" aria-busy="true" className="rounded-sm border border-line bg-surface">
      <Loading />
      <div className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-3.5">
        <h2 className="text-sm font-semibold">Barang yang kamu pakai</h2>
        <Bone className="h-3 w-14" />
      </div>
      <div className="grid grid-cols-1 gap-4 border-t border-line p-4 md:grid-cols-2">
        {Array.from({ length: jumlah }, (_, i) => (
          <KartuBarangSkeleton key={i} />
        ))}
      </div>
      <div className="flex justify-end border-t border-line px-4 py-3">
        <Bone className="h-8 w-28 rounded-md" />
      </div>
    </section>
  );
}

// section "Laporan kerusakan": baris dengan teks di kiri dan tiga tahap di kanan
export function LaporanSectionSkeleton({ jumlah = 2 }: { jumlah?: number }) {
  return (
    <section role="status" aria-busy="true" className="rounded-sm border border-line bg-surface">
      <Loading />
      <h2 className="px-4 pb-2 pt-3.5 text-sm font-semibold">Laporan kerusakan</h2>
      <ul className="divide-y divide-line/60 border-t border-line">
        {Array.from({ length: jumlah }, (_, i) => (
          <li key={i} className="space-y-2.5 px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-x-6 sm:space-y-0">
            <div className="min-w-0 flex-1 space-y-2">
              <Bone className="h-3.5 w-2/5" />
              <Bone className="h-3 w-1/2" />
              <Bone className="h-3 w-3/5" />
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((s) => (
                <div key={s} className="flex w-16 flex-col gap-1">
                  <Bone className="h-1 rounded-full" />
                  <Bone className="h-2.5 w-10" />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// isi "Riwayat perbaikan barang mu" (dipakai di dalam section yang sudah ada, tanpa membungkus lagi)
export function RiwayatListSkeleton({ jumlah = 3 }: { jumlah?: number }) {
  return (
    <ul role="status" aria-busy="true" className="mt-3 divide-y divide-line/60">
      <li className="sr-only">Memuat...</li>
      {Array.from({ length: jumlah }, (_, i) => (
        <li key={i} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Bone className="h-3 w-2/3" />
              <Bone className="h-2.5 w-1/2" />
            </div>
            <Bone className="h-5 w-20 rounded-full" />
          </div>
          <Bone className="h-2.5 w-full" />
          <Bone className="h-2.5 w-3/4" />
        </li>
      ))}
    </ul>
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