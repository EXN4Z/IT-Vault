export interface Supplier {
  id: number;
  nama: string;
  alamat: string | null;
  telepon: string | null;
}

// data yang dikirim saat tambah / ubah
export type SupplierPayload = Omit<Supplier, 'id'>;
