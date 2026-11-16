export interface Perusahaan {
  id: number;
  nama: string;
  alamat: string | null;
  link: string | null;
  telepon: string | null;
}

// data yang dikirim saat tambah / ubah
export type PerusahaanPayload = Omit<Perusahaan, 'id'>;