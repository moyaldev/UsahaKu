import { BusinessInsight, UsahaKuData } from '../types/business';
import { formatIDR, toISODateLocal } from './formatters';

/**
 * Menghasilkan insight usaha secara deterministik murni dari data yang tersedia
 * (penjualan, stok produk, margin, piutang pelanggan, dan tenggat pesanan).
 */
export function generateBusinessInsights(data: UsahaKuData): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const activeSales = data.sales.filter((s) => s.status === 'selesai');
  const todayStr = toISODateLocal(new Date());

  // 1. Cek stok menipis atau habis
  const outOfStock = data.products.filter((p) => p.stok <= 0);
  const lowStock = data.products.filter((p) => p.stok > 0 && p.stok <= p.stokMinimum);

  if (outOfStock.length > 0) {
    const names = outOfStock.slice(0, 2).map((p) => p.nama).join(', ');
    insights.push({
      id: 'ins_stok_habis',
      prioritas: 'tinggi',
      kategori: 'Stok',
      judul: `${outOfStock.length} produk kehabisan stok`,
      ringkasan: `Produk habis saat ini: ${names}${outOfStock.length > 2 ? ` (+${outOfStock.length - 2} lainnya)` : ''}. Penjualan produk ini tertahan sampai stok diisi ulang.`,
      rekomendasi: 'Catat pembelian barang baru ke pemasok agar transaksi tetap berjalan.',
      targetPage: 'pembelian',
      actionLabel: 'Catat Pembelian',
    });
  } else if (lowStock.length > 0) {
    const names = lowStock.slice(0, 2).map((p) => `${p.nama} (sisa ${p.stok} ${p.satuan})`).join(', ');
    insights.push({
      id: 'ins_stok_menipis',
      prioritas: 'tinggi',
      kategori: 'Stok',
      judul: `${lowStock.length} produk mendekati batas stok minimum`,
      ringkasan: `Stok menipis pada ${names}.`,
      rekomendasi: 'Segera rencanakan restok sebelum kehabisan saat jam ramai.',
      targetPage: 'produk',
      actionLabel: 'Cek Stok Produk',
    });
  }

  // 2. Cek margin produk terendah (< 20%) atau produk rugi
  const lowMarginProducts = data.products.filter((p) => {
    if (p.hargaJual <= 0) return false;
    const marginPct = ((p.hargaJual - p.hargaModal) / p.hargaJual) * 100;
    return marginPct < 20;
  });

  if (lowMarginProducts.length > 0) {
    const sample = lowMarginProducts[0];
    const marginPct = sample.hargaJual > 0
      ? Math.round(((sample.hargaJual - sample.hargaModal) / sample.hargaJual) * 100)
      : 0;
    insights.push({
      id: 'ins_margin_tipis',
      prioritas: 'sedang',
      kategori: 'Margin',
      judul: `Margin ${sample.nama} tergolong tipis (${marginPct}%)`,
      ringkasan: `Modal ${formatIDR(sample.hargaModal)} dengan harga jual ${formatIDR(sample.hargaJual)} menyisakan ruang tipis untuk biaya kemasan atau ongkir.`,
      rekomendasi: 'Gunakan Kalkulator Harga untuk menghitung ulang komponen modal, biaya admin, dan margin bersihnya.',
      targetPage: 'kalkulator',
      actionLabel: 'Buka Kalkulator Harga',
    });
  }

  // 3. Cek produk terlaris dari data penjualan nyata
  if (activeSales.length > 0 && data.products.length > 0) {
    const qtyByProduct = new Map<string, { name: string; qty: number; profit: number }>();
    for (const sale of activeSales) {
      for (const item of sale.items) {
        const current = qtyByProduct.get(item.productId) || {
          name: item.productName,
          qty: 0,
          profit: 0,
        };
        current.qty += item.qty;
        current.profit += item.profit;
        qtyByProduct.set(item.productId, current);
      }
    }

    const sorted = Array.from(qtyByProduct.values()).sort((a, b) => b.qty - a.qty);
    if (sorted.length > 0) {
      const top = sorted[0];
      insights.push({
        id: 'ins_produk_terlaris',
        prioritas: 'info',
        kategori: 'Penjualan',
        judul: `${top.name} menjadi kontributor utama`,
        ringkasan: `Tercatat ${top.qty} unit terjual dengan total keuntungan kotor ${formatIDR(top.profit)} dari transaksi selesai.`,
        rekomendasi: 'Pertahankan ketersediaan stok produk ini dan jadikan menu unggulan atau paket bundling.',
        targetPage: 'laporan',
        actionLabel: 'Lihat Laporan',
      });
    }

    // Produk belum terjual sama sekali
    const unsold = data.products.filter((p) => !qtyByProduct.has(p.id) && p.stok > 0);
    if (unsold.length > 0) {
      insights.push({
        id: 'ins_produk_lambat',
        prioritas: 'sedang',
        kategori: 'Penjualan',
        judul: `${unsold.length} produk belum memiliki penjualan`,
        ringkasan: `Contoh: ${unsold[0].nama} (stok ${unsold[0].stok} ${unsold[0].satuan}) belum tercatat dalam transaksi penjualan selesai.`,
        rekomendasi: 'Pertimbangkan promo paket hemat atau tawarkan ke pelanggan tetap.',
        targetPage: 'produk',
        actionLabel: 'Tinjau Produk',
      });
    }
  }

  // 4. Cek piutang / utang pelanggan
  const debtors = data.customers.filter((c) => c.totalUtang > 0);
  if (debtors.length > 0) {
    const totalReceivable = debtors.reduce((sum, c) => sum + c.totalUtang, 0);
    insights.push({
      id: 'ins_piutang',
      prioritas: 'sedang',
      kategori: 'Piutang',
      judul: `Total piutang pelanggan ${formatIDR(totalReceivable)}`,
      ringkasan: `Terdapat ${debtors.length} pelanggan yang masih memiliki catatan kasbon/utang aktif.`,
      rekomendasi: 'Pantau jatuh tempo dan catat pembayaran segera saat pelanggan melunasi.',
      targetPage: 'pelanggan',
      actionLabel: 'Kelola Piutang',
    });
  }

  // 5. Cek agenda & pesanan jatuh tempo hari ini atau lewat tenggat
  const urgentOrders = data.orders.filter(
    (o) => (o.status === 'menunggu' || o.status === 'diproses') && o.tenggatWaktu <= todayStr
  );
  if (urgentOrders.length > 0) {
    insights.push({
      id: 'ins_agenda_tenggat',
      prioritas: 'tinggi',
      kategori: 'Agenda',
      judul: `${urgentOrders.length} pesanan/agenda jatuh tempo hari ini atau terlewat`,
      ringkasan: `Terdekat: "${urgentOrders[0].judul}" (${urgentOrders[0].customerName}).`,
      rekomendasi: 'Periksa daftar pesanan dan perbarui status pengerjaannya.',
      targetPage: 'pesanan',
      actionLabel: 'Buka Agenda',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'ins_mulai',
      prioritas: 'info',
      kategori: 'Penjualan',
      judul: 'Mulai catat produk & transaksi harian Anda',
      ringkasan: 'Insight usaha akan otomatis muncul ketika data produk, penjualan, dan pelanggan mulai terisi.',
      rekomendasi: 'Tambahkan minimal 1 produk lalu catat penjualan pertama Anda.',
      targetPage: 'produk',
      actionLabel: 'Tambah Produk',
    });
  }

  return insights;
}
