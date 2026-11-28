import { UsahaKuData } from '../types/business';

export const STORAGE_KEY = 'usahaku_data_v2';

export const DEFAULT_AVATAR_URL = '/src/assets/images/avatar_pemilik_umkm_1795869972308.jpg';

/**
 * StorageAdapter interface dirancang modular agar nantinya mudah diganti
 * dengan adapter cloud (misalnya Firebase Firestore atau Supabase) tanpa
 * mengubah logika UI di komponen React.
 */
export interface StorageAdapter {
  load(): UsahaKuData;
  save(data: UsahaKuData): void;
  clear(): UsahaKuData;
}

export function createEmptyData(): UsahaKuData {
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    profile: {
      namaUsaha: 'Usaha Saya',
      taglineUsaha: 'Kelola Usaha Lebih Mudah, Kembangkan Lebih Cepat.',
      kategoriUsaha: 'UMKM',
      alamat: '',
      telepon: '',
      namaPemilik: 'Pemilik Usaha',
      emailPemilik: '',
      avatarUrl: DEFAULT_AVATAR_URL,
      mataUang: 'IDR',
      batasStokMenipisDefault: 5,
    },
    products: [],
    stockHistory: [],
    sales: [],
    customers: [],
    debtRecords: [],
    suppliers: [],
    purchases: [],
    finance: [],
    orders: [],
  };
}

export const localStorageAdapter: StorageAdapter = {
  load(): UsahaKuData {
    try {
      // Bersihkan kunci cache demo lama jika pernah tersimpan sebelumnya
      if (localStorage.getItem('usahaku_mvp_data_v1')) {
        localStorage.removeItem('usahaku_mvp_data_v1');
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const empty = createEmptyData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
        return empty;
      }
      const parsed = JSON.parse(raw) as UsahaKuData;
      if (!parsed || !Array.isArray(parsed.products) || !parsed.profile) {
        const empty = createEmptyData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
        return empty;
      }
      return parsed;
    } catch {
      return createEmptyData();
    }
  },

  save(data: UsahaKuData): void {
    try {
      const payload: UsahaKuData = {
        ...data,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error('Gagal menyimpan data ke LocalStorage:', err);
    }
  },

  clear(): UsahaKuData {
    const empty = createEmptyData();
    this.save(empty);
    return empty;
  },
};
