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
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

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

const baseOptions = (currency = true) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  scales: {
    x: {
      grid: { color: 'rgba(148, 163, 184, 0.18)' },
      ticks: { color: '#94a3b8', maxTicksLimit: 12, font: { size: 13 } },
    },
    y: {
      grid: { color: 'rgba(148, 163, 184, 0.18)' },
      ticks: {
        color: '#94a3b8',
        font: { size: 13 },
        callback: (value) => (currency ? '$' + Number(value).toLocaleString() : Number(value).toLocaleString()),
      },
    },
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#cbd5e1', usePointStyle: true, boxWidth: 10, boxHeight: 10, padding: 18, font: { size: 13 } },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.96)',
      titleColor: '#e2e8f0',
      bodyColor: '#cbd5e1',
      borderColor: 'rgba(148, 163, 184, 0.35)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 12,
      callbacks: {
        label(context) {
          const label = context.dataset.label ? `${context.dataset.label}: ` : '';
          if (context.parsed.y === null) return label;
          return currency
            ? `${label}${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y)}`
            : `${label}${Number(context.parsed.y).toLocaleString()}`;
        },
      },
    },
  },
});

export const PriceVolumeChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const labels = data.map((d) => d.date);
  const chartData = {
    labels,
    datasets: [
      {
        type: 'bar',
        label: 'Volume',
        data: data.map((d) => d.volume),
        backgroundColor: 'rgba(37, 99, 235, 0.25)',
        yAxisID: 'y1',
        borderRadius: 3,
      },
      {
        type: 'line',
        label: 'Close',
        data: data.map((d) => d.close),
        borderColor: '#0ea5e9',
        borderWidth: 2.2,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        type: 'line',
        label: 'Open',
        data: data.map((d) => d.open),
        borderColor: '#7c3aed',
        borderWidth: 1.4,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        type: 'line',
        label: 'High',
        data: data.map((d) => d.high),
        borderColor: '#16a34a',
        borderWidth: 1.2,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        type: 'line',
        label: 'Low',
        data: data.map((d) => d.low),
        borderColor: '#dc2626',
        borderWidth: 1.2,
        pointRadius: 0,
        tension: 0.3,
      },
    ],
  };

  const options = baseOptions(true);
  options.scales.y1 = {
    position: 'right',
    grid: { drawOnChartArea: false },
    ticks: { color: '#94a3b8', font: { size: 12 } },
  };
  return <Bar data={chartData} options={options} />;
};

export const IndicatorChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      { label: 'Close', data: data.map((d) => d.close), borderColor: '#0ea5e9', borderWidth: 2.2, pointRadius: 0, tension: 0.32 },
      { label: 'SMA 7', data: data.map((d) => d.SMA_7), borderColor: '#ef4444', borderDash: [5, 5], borderWidth: 1.6, pointRadius: 0, tension: 0.32 },
      { label: 'SMA 21', data: data.map((d) => d.SMA_21), borderColor: '#f59e0b', borderDash: [5, 5], borderWidth: 1.6, pointRadius: 0, tension: 0.32 },
      { label: 'BB Upper', data: data.map((d) => d.BB_upper), borderColor: 'rgba(100, 116, 139, 0.7)', borderWidth: 1.1, pointRadius: 0, tension: 0.28 },
      { label: 'BB Lower', data: data.map((d) => d.BB_lower), borderColor: 'rgba(100, 116, 139, 0.7)', backgroundColor: 'rgba(100, 116, 139, 0.08)', fill: '-1', borderWidth: 1.1, pointRadius: 0, tension: 0.28 },
    ],
  };
  return <Line data={chartData} options={baseOptions(true)} />;
};

export const TrainingHistoryChart = ({ history }) => {
  if (!history || (!history.loss?.length && !history.mae?.length)) return null;
  const epochs = Array.from({ length: Math.max(history.loss?.length || 0, history.mae?.length || 0) }, (_, i) => i + 1);

  const lossData = {
    labels: epochs,
    datasets: [
      { label: 'Train Loss', data: history.loss || [], borderColor: '#0ea5e9', borderWidth: 2, pointRadius: 0, tension: 0.3 },
      { label: 'Val Loss', data: history.val_loss || [], borderColor: '#ef4444', borderWidth: 2, pointRadius: 0, tension: 0.3 },
    ],
  };

  const maeData = {
    labels: epochs,
    datasets: [
      { label: 'Train MAE', data: history.mae || [], borderColor: '#0ea5e9', borderWidth: 2, pointRadius: 0, tension: 0.3 },
      { label: 'Val MAE', data: history.val_mae || [], borderColor: '#ef4444', borderWidth: 2, pointRadius: 0, tension: 0.3 },
    ],
  };

  return (
    <div className="split-chart-grid">
      <div className="mini-chart"><Line data={lossData} options={baseOptions(false)} /></div>
      <div className="mini-chart"><Line data={maeData} options={baseOptions(false)} /></div>
    </div>
  );
};

export const ActualVsPredictedChart = ({ testEval }) => {
  if (!testEval?.dates?.length) return null;
  const chartData = {
    labels: testEval.dates,
    datasets: [
      { label: 'Actual', data: testEval.actual || [], borderColor: '#0ea5e9', borderWidth: 2.2, pointRadius: 0, tension: 0.3 },
      { label: 'Predicted', data: testEval.predicted || [], borderColor: '#ef4444', borderWidth: 2.2, borderDash: [7, 5], pointRadius: 0, tension: 0.3 },
    ],
  };
  return <Line data={chartData} options={baseOptions(true)} />;
};

export const ForecastChart = ({ data, futureDates, futurePrices }) => {
  if (!data || data.length === 0) return null;

  const historicalColor = '#0ea5e9';
  const historicalFill = 'rgba(14, 165, 233, 0.1)';
  const forecastColor = '#0f766e';
  const forecastFill = 'rgba(15, 118, 110, 0.10)';

  const pastDates = data.map(d => d.date);
  const pastPrices = data.map(d => d.close);
  const hasFuture = futureDates && futureDates.length > 0;
  
  const labels = hasFuture ? [...pastDates, ...futureDates] : pastDates;
  
  const predictionDataset = hasFuture 
    ? [...Array(pastDates.length - 1).fill(null), pastPrices[pastPrices.length - 1], ...futurePrices]
    : [];

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Historical Price',
        data: pastPrices,
        borderColor: historicalColor,
        backgroundColor: historicalFill,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHitRadius: 10,
        borderWidth: 2.5,
      }
    ]
  };

  if (hasFuture) {
    chartData.datasets.push({
      label: 'Predicted Price',
      data: predictionDataset,
      borderColor: forecastColor,
      backgroundColor: forecastFill,
      fill: true,
      borderWidth: 2.5,
      borderDash: [7, 6],
      tension: 0.35,
      pointRadius: (ctx) => {
        return ctx.raw !== null && ctx.dataIndex >= pastDates.length - 1 ? 4 : 0;
      },
      pointBackgroundColor: forecastColor,
      pointBorderColor: '#ffffff',
    });
  }

  return <Line data={chartData} options={baseOptions(true)} />;
};
