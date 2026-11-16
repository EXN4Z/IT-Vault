export interface Kategori {
  id: number;
  nama: string;
}

// data yang dikirim saat tambah / ubah
export type KategoriPayload = Omit<Kategori, 'id'>;
