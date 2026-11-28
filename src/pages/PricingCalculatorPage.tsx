import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  Check,
  Layers,
  Plus,
  Scale,
  Trash2,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatIDR, formatNumberID, generateId } from '../utils/formatters';

interface CostComponent {
  id: string;
  nama: string;
  nominal: number;
}

interface FixedCostComponent {
  id: string;
  nama: string;
  nominal: number;
}

type CalcTab = 'profit' | 'bep' | 'grosir';

export const PricingCalculatorPage: React.FC = () => {
  const { data, updateProduct, notify } = useStore();
  const [activeTab, setActiveTab] = useState<CalcTab>('profit');
  const [selectedProductId, setSelectedProductId] = useState('');

  // --- TAB 1: HITUNG LABA & MARGIN DARI HARGA JUAL SENDIRI ---
  const [costComponents, setCostComponents] = useState<CostComponent[]>([
    { id: 'c_1', nama: 'Modal Bahan / Harga Beli Barang', nominal: 0 },
    { id: 'c_2', nama: 'Kemasan, Label & Stiker', nominal: 0 },
  ]);
  const [channelFeePct, setChannelFeePct] = useState(0);
  const [discountPerUnit, setDiscountPerUnit] = useState(0);
  const [sellingPriceInput, setSellingPriceInput] = useState(0);

  // --- TAB 2: ANALISIS IMPAS (BEP) & TARGET BULANAN ---
  const [fixedCosts, setFixedCosts] = useState<FixedCostComponent[]>([
    { id: 'fc_1', nama: 'Sewa Tempat / Operasional', nominal: 0 },
    { id: 'fc_2', nama: 'Listrik, Air & Internet', nominal: 0 },
  ]);
  const [targetMonthlyUnits, setTargetMonthlyUnits] = useState(100);

  // --- TAB 3: KALKULATOR GROSIR & PAKET BUNDLING ---
  const [bundleQty, setBundleQty] = useState(5);
  const [bundleInputMode, setBundleInputMode] = useState<'diskon' | 'manual'>('diskon');
  const [bundleDiscountPct, setBundleDiscountPct] = useState(10);
  const [bundleManualPrice, setBundleManualPrice] = useState(0);

  const handleLoadProduct = (productId: string) => {
    setSelectedProductId(productId);
    const prod = data.products.find((p) => p.id === productId);
    if (!prod) return;

    setCostComponents([
      { id: generateId('c'), nama: `Modal ${prod.nama}`, nominal: prod.hargaModal },
      { id: generateId('c'), nama: 'Kemasan & Operasional Tambahan', nominal: 0 },
    ]);
    setSellingPriceInput(prod.hargaJual);
    setBundleManualPrice(prod.hargaJual * bundleQty);
  };

  // Hitung Tab 1: Profit & Margin
  const profitAnalysis = useMemo(() => {
    const totalModalUnit = costComponents.reduce(
      (sum, c) => sum + Math.max(0, Number(c.nominal) || 0),
      0
    );
    const grossPrice = Math.max(0, Number(sellingPriceInput) || 0);
    const discount = Math.min(grossPrice, Math.max(0, Number(discountPerUnit) || 0));
    const effectivePrice = Math.max(0, grossPrice - discount);
    const feePct = Math.min(50, Math.max(0, Number(channelFeePct) || 0));
    const channelFeeRp = Math.round(effectivePrice * (feePct / 100));
    const netReceived = effectivePrice - channelFeeRp;
    const netProfit = netReceived - totalModalUnit;

    const marginPct =
      effectivePrice > 0 ? Number(((netProfit / effectivePrice) * 100).toFixed(1)) : 0;
    const markupPct =
      totalModalUnit > 0 ? Number(((netProfit / totalModalUnit) * 100).toFixed(1)) : 0;

    const status: 'untung' | 'impas' | 'rugi' | 'kosong' =
      effectivePrice === 0 && totalModalUnit === 0
        ? 'kosong'
        : netProfit > 0
        ? 'untung'
        : netProfit === 0
        ? 'impas'
        : 'rugi';

    // Proporsi visual terhadap harga efektif
    const modalSharePct =
      effectivePrice > 0
        ? Math.min(100, Math.round((totalModalUnit / effectivePrice) * 100))
        : 0;
    const feeSharePct =
      effectivePrice > 0
        ? Math.min(100 - modalSharePct, Math.round((channelFeeRp / effectivePrice) * 100))
        : 0;
    const profitSharePct = Math.max(0, 100 - modalSharePct - feeSharePct);

    return {
      totalModalUnit,
      grossPrice,
      discount,
      effectivePrice,
      channelFeeRp,
      netReceived,
      netProfit,
      marginPct,
      markupPct,
      status,
      modalSharePct,
      feeSharePct,
      profitSharePct,
    };
  }, [channelFeePct, costComponents, discountPerUnit, sellingPriceInput]);

  // Hitung Tab 2: Analisis BEP & Target Bulanan
  const bepAnalysis = useMemo(() => {
    const totalFixedCost = fixedCosts.reduce(
      (sum, f) => sum + Math.max(0, Number(f.nominal) || 0),
      0
    );
    const contributionPerUnit = profitAnalysis.netProfit;
    const canBreakEven = contributionPerUnit > 0;
    const bepUnits = canBreakEven ? Math.ceil(totalFixedCost / contributionPerUnit) : 0;
    const bepRevenue = bepUnits * profitAnalysis.effectivePrice;

    const targetUnits = Math.max(0, Math.floor(Number(targetMonthlyUnits) || 0));
    const projectedRevenue = targetUnits * profitAnalysis.effectivePrice;
    const projectedGrossContribution = targetUnits * contributionPerUnit;
    const projectedNetProfit = projectedGrossContribution - totalFixedCost;

    const volumeScenarios = [
      Math.max(10, Math.round(targetUnits * 0.5)),
      bepUnits > 0 ? bepUnits : Math.max(25, Math.round(targetUnits * 0.75)),
      targetUnits,
      Math.round(targetUnits * 1.5),
      targetUnits * 2,
    ]
      .filter((v, idx, arr) => v > 0 && arr.indexOf(v) === idx)
      .sort((a, b) => a - b)
      .map((units) => {
        const omzet = units * profitAnalysis.effectivePrice;
        const labaBersih = units * contributionPerUnit - totalFixedCost;
        return { units, omzet, labaBersih, isBep: units === bepUnits };
      });

    return {
      totalFixedCost,
      contributionPerUnit,
      canBreakEven,
      bepUnits,
      bepRevenue,
      projectedRevenue,
      projectedNetProfit,
      volumeScenarios,
    };
  }, [fixedCosts, profitAnalysis.effectivePrice, profitAnalysis.netProfit, targetMonthlyUnits]);

  // Hitung Tab 3: Grosir & Paket
  const wholesaleAnalysis = useMemo(() => {
    const qty = Math.max(2, Math.floor(Number(bundleQty) || 2));
    const unitNormalPrice = profitAnalysis.grossPrice;
    const normalBundleTotal = unitNormalPrice * qty;
    const totalBundleModal = profitAnalysis.totalModalUnit * qty;

    const totalBundlePrice =
      bundleInputMode === 'diskon'
        ? Math.round(normalBundleTotal * (1 - Math.min(90, Math.max(0, bundleDiscountPct)) / 100))
        : Math.max(0, Number(bundleManualPrice) || 0);

    const effectiveUnitPrice = Math.round(totalBundlePrice / qty);
    const buyerSavings = Math.max(0, normalBundleTotal - totalBundlePrice);
    const channelFeeBundle = Math.round(
      totalBundlePrice * (Math.min(50, Math.max(0, channelFeePct)) / 100)
    );
    const netBundleProfit = totalBundlePrice - channelFeeBundle - totalBundleModal;
    const bundleMarginPct =
      totalBundlePrice > 0 ? Number(((netBundleProfit / totalBundlePrice) * 100).toFixed(1)) : 0;

    return {
      qty,
      normalBundleTotal,
      totalBundlePrice,
      effectiveUnitPrice,
      buyerSavings,
      totalBundleModal,
      channelFeeBundle,
      netBundleProfit,
      bundleMarginPct,
    };
  }, [
    bundleDiscountPct,
    bundleInputMode,
    bundleManualPrice,
    bundleQty,
    channelFeePct,
    profitAnalysis.grossPrice,
    profitAnalysis.totalModalUnit,
  ]);

  const addCostRow = () => {
    setCostComponents((prev) => [
      ...prev,
      { id: generateId('c'), nama: 'Biaya Tambahan', nominal: 0 },
    ]);
  };

  const addFixedCostRow = () => {
    setFixedCosts((prev) => [
      ...prev,
      { id: generateId('fc'), nama: 'Biaya Tetap Lainnya', nominal: 0 },
    ]);
  };

  const handleApplyToProduct = () => {
    if (!selectedProductId) {
      notify('warning', 'Pilih produk di dropdown atas untuk menyimpan perubahan harga');
      return;
    }
    const prod = data.products.find((p) => p.id === selectedProductId);
    if (!prod) return;
    updateProduct(prod.id, {
      hargaJual: profitAnalysis.grossPrice,
      hargaModal: profitAnalysis.totalModalUnit,
    });
    notify(
      'success',
      `Data harga ${prod.nama} diperbarui`,
      `Modal ${formatIDR(profitAnalysis.totalModalUnit)} · Harga jual ${formatIDR(
        profitAnalysis.grossPrice
      )}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#172B43]">
            Kalkulator Harga, Margin &amp; Titik Impas
          </h2>
          <p className="text-sm text-[#8190A3] mt-0.5">
            Hitung rincian modal, potongan channel penjualan, margin keuntungan, titik impas (BEP), dan paket grosir berdasarkan angka yang Anda tentukan sendiri.
          </p>
        </div>

        {/* Pilih Produk Katalog */}
        <div className="w-full sm:w-72 shrink-0">
          <select
            value={selectedProductId}
            onChange={(e) => handleLoadProduct(e.target.value)}
            aria-label="Muat data dari produk katalog"
            className="w-full px-3 py-2 text-xs font-medium border border-[#E5EBF1] rounded-lg bg-white text-[#172B43] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
          >
            <option value="">Input manual / Muat dari produk katalog</option>
            {data.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama} (Jual: {formatIDR(p.hargaJual)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="bg-white border border-[#E8EDF3] rounded-xl p-1.5 inline-flex flex-wrap gap-1 shadow-[0_4px_16px_rgba(20,42,66,0.03)]">
        <button
          type="button"
          onClick={() => setActiveTab('profit')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'profit'
              ? 'bg-[#10243B] text-white'
              : 'text-[#52677E] hover:text-[#172B43] hover:bg-slate-50'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>1. Hitung Laba &amp; Margin</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bep')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'bep'
              ? 'bg-[#10243B] text-white'
              : 'text-[#52677E] hover:text-[#172B43] hover:bg-slate-50'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>2. Analisis Impas (BEP)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('grosir')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'grosir'
              ? 'bg-[#10243B] text-white'
              : 'text-[#52677E] hover:text-[#172B43] hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>3. Kalkulator Grosir &amp; Paket</span>
        </button>
      </div>

      {/* TAB 1: HITUNG LABA & MARGIN */}
      {activeTab === 'profit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri: Komponen Biaya & Harga Jual */}
          <div className="lg:col-span-6 bg-white border border-[#E8EDF3] rounded-2xl p-6 shadow-[0_8px_28px_rgba(20,42,66,0.045)] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F3F6]">
              <div>
                <h3 className="text-sm font-bold text-[#243A53]">
                  Rincian Modal per Unit
                </h3>
                <p className="text-xs text-[#94A1AF] mt-0.5">
                  Tambahkan seluruh komponen bahan, kemasan, atau biaya produksi satuan.
                </p>
              </div>
              <button
                type="button"
                onClick={addCostRow}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#059669] bg-[#E6F9F1] hover:bg-[#D1F4E5] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Baris Biaya</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {costComponents.map((comp) => (
                <div key={comp.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={comp.nama}
                    onChange={(e) =>
                      setCostComponents((prev) =>
                        prev.map((c) =>
                          c.id === comp.id ? { ...c, nama: e.target.value } : c
                        )
                      )
                    }
                    placeholder="Nama komponen biaya"
                    className="flex-1 px-3 py-2 text-xs sm:text-sm border border-[#E5EBF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                  <input
                    type="number"
                    min={0}
                    value={comp.nominal}
                    onChange={(e) =>
                      setCostComponents((prev) =>
                        prev.map((c) =>
                          c.id === comp.id
                            ? { ...c, nominal: Math.max(0, Number(e.target.value)) }
                            : c
                        )
                      )
                    }
                    placeholder="0"
                    className="w-32 px-3 py-2 text-xs sm:text-sm font-mono text-right border border-[#E5EBF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                  {costComponents.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCostComponents((prev) => prev.filter((c) => c.id !== comp.id))
                      }
                      aria-label={`Hapus ${comp.nama}`}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#F0F3F6] text-sm">
              <span className="font-semibold text-[#52677E]">Total Modal per Unit</span>
              <span className="font-mono tabular-nums font-bold text-[#172B43]">
                {formatIDR(profitAnalysis.totalModalUnit)}
              </span>
            </div>

            {/* Harga Jual & Potongan Channel */}
            <div className="pt-4 border-t border-[#F0F3F6] space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#243A53] mb-1.5">
                  Harga Jual yang Anda Tetapkan (IDR)
                </label>
                <input
                  type="number"
                  min={0}
                  value={sellingPriceInput}
                  onChange={(e) => setSellingPriceInput(Math.max(0, Number(e.target.value)))}
                  placeholder="Masukkan harga jual Anda, misal 25000"
                  className="w-full px-3.5 py-2.5 text-base font-mono font-bold text-[#172B43] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#52677E] mb-1">
                    Biaya Admin / Channel (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.1}
                    value={channelFeePct}
                    onChange={(e) => setChannelFeePct(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-sm font-mono border border-[#E5EBF1] rounded-lg"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {[
                      { label: 'Tunai 0%', val: 0 },
                      { label: 'QRIS 0.7%', val: 0.7 },
                      { label: 'Admin 6%', val: 6 },
                      { label: 'Ojol 20%', val: 20 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setChannelFeePct(preset.val)}
                        className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors ${
                          channelFeePct === preset.val
                            ? 'bg-[#10243B] text-white border-[#10243B]'
                            : 'bg-slate-50 text-[#52677E] border-[#E5EBF1] hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#52677E] mb-1">
                    Diskon / Potongan Promo (IDR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={discountPerUnit}
                    onChange={(e) => setDiscountPerUnit(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-sm font-mono border border-[#E5EBF1] rounded-lg"
                  />
                  <p className="text-[11px] text-[#94A1AF] mt-1.5">
                    Harga efektif dibayar pembeli:{' '}
                    <span className="font-mono font-semibold text-[#172B43]">
                      {formatIDR(profitAnalysis.effectivePrice)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Hasil Perhitungan Laba & Margin */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-white border border-[#E8EDF3] rounded-2xl p-6 shadow-[0_8px_28px_rgba(20,42,66,0.045)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#8190A2]">
                    Laba Bersih per Unit Terjual
                  </p>
                  <p
                    className={`text-3xl sm:text-4xl font-bold font-mono tabular-nums mt-2 ${
                      profitAnalysis.status === 'rugi'
                        ? 'text-red-600'
                        : profitAnalysis.status === 'untung'
                        ? 'text-[#087C58]'
                        : 'text-[#172B43]'
                    }`}
                  >
                    {formatIDR(profitAnalysis.netProfit)}
                  </p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-bold shrink-0 ${
                    profitAnalysis.status === 'rugi'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : profitAnalysis.status === 'untung'
                      ? 'bg-[#E6F9F1] text-[#087C58] border border-[#BDEFD9]'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {profitAnalysis.status === 'rugi'
                    ? 'Rugi'
                    : profitAnalysis.status === 'untung'
                    ? 'Untung'
                    : profitAnalysis.status === 'impas'
                    ? 'Impas (0)'
                    : 'Masukkan Angka'}
                </span>
              </div>

              {profitAnalysis.status === 'rugi' && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>
                    Harga jual setelah diskon &amp; biaya admin lebih rendah dari total modal. Setiap penjualan akan mengurangi kas sebesar{' '}
                    <strong className="font-mono">{formatIDR(Math.abs(profitAnalysis.netProfit))}</strong>.
                  </span>
                </div>
              )}

              {/* Metrik Rincian */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-[#F0F3F6]">
                <div>
                  <p className="text-[11px] text-[#8190A3]">Margin Bersih</p>
                  <p className="text-base font-bold font-mono tabular-nums text-[#172B43] mt-0.5">
                    {profitAnalysis.marginPct}%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#8190A3]">Markup Modal</p>
                  <p className="text-base font-bold font-mono tabular-nums text-[#172B43] mt-0.5">
                    {profitAnalysis.markupPct}%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#8190A3]">Potongan Admin</p>
                  <p className="text-base font-bold font-mono tabular-nums text-[#172B43] mt-0.5">
                    {formatIDR(profitAnalysis.channelFeeRp)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#8190A3]">Masuk ke Kas</p>
                  <p className="text-base font-bold font-mono tabular-nums text-[#172B43] mt-0.5">
                    {formatIDR(profitAnalysis.netReceived)}
                  </p>
                </div>
              </div>

              {/* Proporsi Struktur Harga */}
              {profitAnalysis.effectivePrice > 0 && (
                <div className="mt-6 pt-5 border-t border-[#F0F3F6] space-y-2">
                  <div className="flex justify-between text-xs text-[#52677E]">
                    <span>Komposisi Harga Efektif ({formatIDR(profitAnalysis.effectivePrice)})</span>
                  </div>
                  <div className="h-3 w-full rounded-md bg-slate-100 overflow-hidden flex">
                    <div
                      style={{ width: `${profitAnalysis.modalSharePct}%` }}
                      className="bg-[#10243B] h-full"
                      title={`Modal: ${profitAnalysis.modalSharePct}%`}
                    />
                    <div
                      style={{ width: `${profitAnalysis.feeSharePct}%` }}
                      className="bg-amber-500 h-full"
                      title={`Biaya Admin: ${profitAnalysis.feeSharePct}%`}
                    />
                    <div
                      style={{ width: `${profitAnalysis.profitSharePct}%` }}
                      className="bg-[#10B981] h-full"
                      title={`Laba Bersih: ${profitAnalysis.profitSharePct}%`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-4 text-[11px] text-[#52677E] pt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#10243B]" />
                      Modal ({profitAnalysis.modalSharePct}%)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                      Biaya Admin ({profitAnalysis.feeSharePct}%)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#10B981]" />
                      Laba ({profitAnalysis.profitSharePct}%)
                    </span>
                  </div>
                </div>
              )}

              {selectedProductId && (
                <div className="mt-6 pt-4 border-t border-[#F0F3F6] flex justify-end">
                  <button
                    type="button"
                    onClick={handleApplyToProduct}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Modal &amp; Harga Jual ke Produk</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANALISIS IMPAS (BEP) & TARGET BULANAN */}
      {activeTab === 'bep' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-[#E8EDF3] rounded-2xl p-6 shadow-[0_8px_28px_rgba(20,42,66,0.045)] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F3F6]">
              <div>
                <h3 className="text-sm font-bold text-[#243A53]">
                  Biaya Tetap Usaha per Bulan
                </h3>
                <p className="text-xs text-[#94A1AF] mt-0.5">
                  Biaya rutin bulanan yang tetap keluar meski penjualan sepi.
                </p>
              </div>
              <button
                type="button"
                onClick={addFixedCostRow}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#059669] bg-[#E6F9F1] hover:bg-[#D1F4E5] rounded-lg whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {fixedCosts.map((fc) => (
                <div key={fc.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={fc.nama}
                    onChange={(e) =>
                      setFixedCosts((prev) =>
                        prev.map((x) => (x.id === fc.id ? { ...x, nama: e.target.value } : x))
                      )
                    }
                    className="flex-1 px-3 py-2 text-xs sm:text-sm border border-[#E5EBF1] rounded-lg"
                  />
                  <input
                    type="number"
                    min={0}
                    value={fc.nominal}
                    onChange={(e) =>
                      setFixedCosts((prev) =>
                        prev.map((x) =>
                          x.id === fc.id
                            ? { ...x, nominal: Math.max(0, Number(e.target.value)) }
                            : x
                        )
                      )
                    }
                    className="w-32 px-3 py-2 text-xs sm:text-sm font-mono text-right border border-[#E5EBF1] rounded-lg"
                  />
                  {fixedCosts.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFixedCosts((prev) => prev.filter((x) => x.id !== fc.id))
                      }
                      aria-label={`Hapus ${fc.nama}`}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#F0F3F6] space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#52677E]">Total Biaya Tetap / Bulan</span>
                <span className="font-mono font-bold text-[#172B43]">
                  {formatIDR(bepAnalysis.totalFixedCost)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-[#8190A3]">
                <span>Kontribusi Laba per Unit (dari Tab 1)</span>
                <span className="font-mono font-semibold text-[#172B43]">
                  {formatIDR(bepAnalysis.contributionPerUnit)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0F3F6]">
              <label className="block text-xs font-bold text-[#243A53] mb-1.5">
                Target Volume Penjualan per Bulan (Unit)
              </label>
              <input
                type="number"
                min={1}
                value={targetMonthlyUnits}
                onChange={(e) =>
                  setTargetMonthlyUnits(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                }
                className="w-full px-3 py-2 text-sm font-mono border border-[#E5EBF1] rounded-lg"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E8EDF3] rounded-2xl p-5 shadow-[0_8px_28px_rgba(20,42,66,0.045)]">
                <p className="text-xs font-semibold text-[#8190A2]">Titik Impas (BEP Unit)</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#172B43] mt-2">
                  {bepAnalysis.canBreakEven
                    ? `${formatNumberID(bepAnalysis.bepUnits)} unit`
                    : 'Belum tercapai'}
                </p>
                <p className="text-[11px] text-[#94A1AF] mt-1">Minimal terjual tiap bulan</p>
              </div>
              <div className="bg-white border border-[#E8EDF3] rounded-2xl p-5 shadow-[0_8px_28px_rgba(20,42,66,0.045)]">
                <p className="text-xs font-semibold text-[#8190A2]">BEP Omzet Bulanan</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#172B43] mt-2">
                  {bepAnalysis.canBreakEven ? formatIDR(bepAnalysis.bepRevenue) : '-'}
                </p>
                <p className="text-[11px] text-[#94A1AF] mt-1">Omzet minimal balik modal</p>
              </div>
              <div className="bg-white border border-[#E8EDF3] rounded-2xl p-5 shadow-[0_8px_28px_rgba(20,42,66,0.045)]">
                <p className="text-xs font-semibold text-[#8190A2]">
                  Proyeksi Laba ({formatNumberID(targetMonthlyUnits)} unit)
                </p>
                <p
                  className={`text-2xl font-bold font-mono tabular-nums mt-2 ${
                    bepAnalysis.projectedNetProfit >= 0 ? 'text-[#087C58]' : 'text-red-600'
                  }`}
                >
                  {formatIDR(bepAnalysis.projectedNetProfit)}
                </p>
                <p className="text-[11px] text-[#94A1AF] mt-1">Setelah potong biaya tetap</p>
              </div>
            </div>

            <div className="bg-white border border-[#E8EDF3] rounded-2xl overflow-hidden shadow-[0_8px_28px_rgba(20,42,66,0.045)]">
              <div className="px-5 py-4 border-b border-[#F0F3F6]">
                <h3 className="text-sm font-bold text-[#243A53]">
                  Simulasi Volume Penjualan Bulanan
                </h3>
                <p className="text-xs text-[#94A1AF] mt-0.5">
                  Perbandingan omzet dan hasil bersih setelah biaya tetap berdasarkan jumlah penjualan.
                </p>
              </div>
              {!bepAnalysis.canBreakEven ? (
                <p className="p-6 text-xs text-slate-600">
                  Isi harga jual lebih besar dari modal di Tab 1 terlebih dahulu agar proyeksi volume penjualan dapat dihitung.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#E8EDF3] bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                        <th className="py-3 px-4">Volume Terjual</th>
                        <th className="py-3 px-4 text-right">Omzet Kotor</th>
                        <th className="py-3 px-4 text-right">Laba / Rugi Bersih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F3F6]">
                      {bepAnalysis.volumeScenarios.map((row) => (
                        <tr
                          key={row.units}
                          className={row.units === targetMonthlyUnits ? 'bg-[#F0FDF7]' : ''}
                        >
                          <td className="py-3 px-4 font-mono font-semibold text-[#172B43]">
                            {formatNumberID(row.units)} unit
                            {row.isBep && (
                              <span className="ml-2 text-[11px] font-sans text-[#8190A3]">
                                · Titik Impas
                              </span>
                            )}
                            {row.units === targetMonthlyUnits && (
                              <span className="ml-2 text-[11px] font-sans text-[#059669]">
                                · Target Anda
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-[#344A62]">
                            {formatIDR(row.omzet)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${
                              row.labaBersih >= 0 ? 'text-[#087C58]' : 'text-red-600'
                            }`}
                          >
                            {formatIDR(row.labaBersih)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KALKULATOR GROSIR & PAKET */}
      {activeTab === 'grosir' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-[#E8EDF3] rounded-2xl p-6 shadow-[0_8px_28px_rgba(20,42,66,0.045)] space-y-4">
            <div className="pb-3 border-b border-[#F0F3F6]">
              <h3 className="text-sm font-bold text-[#243A53]">
                Pengaturan Paket / Harga Grosir
              </h3>
              <p className="text-xs text-[#94A1AF] mt-0.5">
                Hitung sisa keuntungan jika Anda menjual paket bundling atau harga reseller.
              </p>
            </div>

            <div className="text-xs bg-[#F6F8FB] border border-[#E8EDF3] rounded-xl p-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-[#52677E]">Modal Satuan (dari Tab 1):</span>
                <span className="font-mono font-semibold text-[#172B43]">
                  {formatIDR(profitAnalysis.totalModalUnit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#52677E]">Harga Eceran Satuan (dari Tab 1):</span>
                <span className="font-mono font-semibold text-[#172B43]">
                  {formatIDR(profitAnalysis.grossPrice)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#243A53] mb-1">
                Jumlah Unit per Paket / Minimal Beli Grosir
              </label>
              <input
                type="number"
                min={2}
                value={bundleQty}
                onChange={(e) => setBundleQty(Math.max(2, Math.floor(Number(e.target.value) || 2)))}
                className="w-full px-3 py-2 text-sm font-mono border border-[#E5EBF1] rounded-lg"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#F6F8FB] border border-[#E8EDF3] rounded-lg">
              <button
                type="button"
                onClick={() => setBundleInputMode('diskon')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${
                  bundleInputMode === 'diskon'
                    ? 'bg-white text-[#172B43] shadow-xs'
                    : 'text-[#8190A3]'
                }`}
              >
                Potongan Diskon (%)
              </button>
              <button
                type="button"
                onClick={() => {
                  setBundleInputMode('manual');
                  if (bundleManualPrice === 0) {
                    setBundleManualPrice(wholesaleAnalysis.totalBundlePrice);
                  }
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${
                  bundleInputMode === 'manual'
                    ? 'bg-white text-[#172B43] shadow-xs'
                    : 'text-[#8190A3]'
                }`}
              >
                Input Harga Paket (Rp)
              </button>
            </div>

            {bundleInputMode === 'diskon' ? (
              <div>
                <label className="block text-xs font-semibold text-[#243A53] mb-1">
                  Diskon Pembelian Grosir / Paket (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={bundleDiscountPct}
                  onChange={(e) =>
                    setBundleDiscountPct(Math.min(90, Math.max(0, Number(e.target.value))))
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-[#E5EBF1] rounded-lg"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#243A53] mb-1">
                  Harga Total per Paket yang Anda Tetapkan (IDR)
                </label>
                <input
                  type="number"
                  min={0}
                  value={bundleManualPrice}
                  onChange={(e) => setBundleManualPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-sm font-mono border border-[#E5EBF1] rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-white border border-[#E8EDF3] rounded-2xl p-6 shadow-[0_8px_28px_rgba(20,42,66,0.045)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-5 border-b border-[#F0F3F6]">
              <div>
                <p className="text-xs font-semibold text-[#8190A2]">
                  Total Harga Paket ({wholesaleAnalysis.qty} unit)
                </p>
                <p className="text-3xl font-bold font-mono tabular-nums text-[#172B43] mt-1">
                  {formatIDR(wholesaleAnalysis.totalBundlePrice)}
                </p>
                <p className="text-xs text-[#52677E] mt-1">
                  Harga efektif per unit:{' '}
                  <span className="font-mono font-semibold text-[#172B43]">
                    {formatIDR(wholesaleAnalysis.effectiveUnitPrice)}
                  </span>
                  {wholesaleAnalysis.buyerSavings > 0 && (
                    <span className="text-[#0B9B70] ml-2">
                      · Pembeli hemat {formatIDR(wholesaleAnalysis.buyerSavings)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[#8190A3]">Total Modal Paket</p>
                <p className="text-lg font-bold font-mono tabular-nums text-[#172B43] mt-1">
                  {formatIDR(wholesaleAnalysis.totalBundleModal)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8190A3]">Potongan Admin ({channelFeePct}%)</p>
                <p className="text-lg font-bold font-mono tabular-nums text-[#172B43] mt-1">
                  {formatIDR(wholesaleAnalysis.channelFeeBundle)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8190A3]">Laba Bersih per Paket</p>
                <p
                  className={`text-lg font-bold font-mono tabular-nums mt-1 ${
                    wholesaleAnalysis.netBundleProfit >= 0 ? 'text-[#087C58]' : 'text-red-600'
                  }`}
                >
                  {formatIDR(wholesaleAnalysis.netBundleProfit)} ({wholesaleAnalysis.bundleMarginPct}%)
                </p>
              </div>
            </div>

            {wholesaleAnalysis.netBundleProfit < 0 && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>
                  Potongan harga grosir melebihi batas modal. Naikkan harga paket atau kurangi persentase diskon agar tidak rugi.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
