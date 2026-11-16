export interface Departemen {
  id: number;
  nama: string;
}

// data yang dikirim saat tambah / ubah
export type DepartemenPayload = Omit<Departemen, 'id'>;