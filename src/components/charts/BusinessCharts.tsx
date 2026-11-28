import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { formatIDR, formatIDRCompact } from '../../utils/formatters';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SalesTrendChartProps {
  labels: string[];
  revenueSeries: number[];
  profitSeries: number[];
  heightClass?: string;
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
  labels,
  revenueSeries,
  profitSeries,
  heightClass = 'h-72',
}) => {
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Omzet Penjualan',
        data: revenueSeries,
        borderColor: '#047857',
        backgroundColor: 'rgba(4, 120, 87, 0.08)',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#047857',
        tension: 0.25,
        fill: true,
      },
      {
        label: 'Keuntungan Kotor',
        data: profitSeries,
        borderColor: '#0f172a',
        backgroundColor: 'rgba(15, 23, 42, 0.04)',
        borderWidth: 2,
        borderDash: [4, 4],
        pointRadius: 2.5,
        pointHoverRadius: 5,
        pointBackgroundColor: '#0f172a',
        tension: 0.25,
        fill: false,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          font: {
            family: 'Plus Jakarta Sans, sans-serif',
            size: 12,
          },
          color: '#475569',
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        titleFont: { family: 'Plus Jakarta Sans, sans-serif', size: 12 },
        bodyFont: { family: 'JetBrains Mono, monospace', size: 12 },
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatIDR(Number(ctx.parsed.y || 0))}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#64748b',
          font: { family: 'Plus Jakarta Sans, sans-serif', size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: '#e2e8f0' },
        ticks: {
          color: '#64748b',
          font: { family: 'JetBrains Mono, monospace', size: 11 },
          callback: (val) => formatIDRCompact(Number(val)),
        },
      },
    },
  };

  return (
    <div className={heightClass}>
      <Line data={chartData} options={options} />
    </div>
  );
};

interface CashflowBarChartProps {
  labels: string[];
  incomeSeries: number[];
  expenseSeries: number[];
  heightClass?: string;
}

export const CashflowBarChart: React.FC<CashflowBarChartProps> = ({
  labels,
  incomeSeries,
  expenseSeries,
  heightClass = 'h-64',
}) => {
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Pemasukan',
        data: incomeSeries,
        backgroundColor: '#047857',
        borderRadius: 4,
        barPercentage: 0.65,
      },
      {
        label: 'Pengeluaran',
        data: expenseSeries,
        backgroundColor: '#dc2626',
        borderRadius: 4,
        barPercentage: 0.65,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          font: { family: 'Plus Jakarta Sans, sans-serif', size: 12 },
          color: '#475569',
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        bodyFont: { family: 'JetBrains Mono, monospace', size: 12 },
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatIDR(Number(ctx.parsed.y || 0))}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#64748b',
          font: { family: 'Plus Jakarta Sans, sans-serif', size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: '#e2e8f0' },
        ticks: {
          color: '#64748b',
          font: { family: 'JetBrains Mono, monospace', size: 11 },
          callback: (val) => formatIDRCompact(Number(val)),
        },
      },
    },
  };

  return (
    <div className={heightClass}>
      <Bar data={chartData} options={options} />
    </div>
  );
};
