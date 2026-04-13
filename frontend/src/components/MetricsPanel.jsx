import React from 'react';
import { Activity, Percent, Target, TrendingDown, TrendingUp } from 'lucide-react';

const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const getChange = (currentValue, previousValue) => {
  const current = Number(currentValue);
  const previous = Number(previousValue);

  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return { pct: 0, isPositive: true };
  }

  const pct = ((current - previous) / previous) * 100;
  return { pct, isPositive: pct >= 0 };
};

export const MetricsPanel = ({ currentPrice, prevPrice, finalPrediction, metrics, coin }) => {
  const currentChange = getChange(currentPrice, prevPrice);
  const forecastChange = getChange(finalPrediction, currentPrice);

  return (
    <div className="metrics-grid">
      <article className="metric-card">
        <div className="metric-kicker">Current price</div>
        <div className="metric-value">{formatCurrency(currentPrice)}</div>
        <div className={`metric-note ${currentChange.isPositive ? 'trend-positive' : 'trend-negative'}`}>
          {currentChange.isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {Math.abs(currentChange.pct).toFixed(2)}% vs previous day
        </div>
      </article>

      {finalPrediction !== null && finalPrediction !== undefined && (
        <article className="metric-card">
          <div className="metric-kicker">Forecast end</div>
          <div className="metric-value">{formatCurrency(finalPrediction)}</div>
          <div className={`metric-note ${forecastChange.isPositive ? 'trend-positive' : 'trend-negative'}`}>
            {forecastChange.isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {Math.abs(forecastChange.pct).toFixed(2)}% vs current price
          </div>
        </article>
      )}

      {metrics && (
        <>
          <article className="metric-card">
            <div className="metric-kicker">RMSE</div>
            <div className="metric-value">{formatCurrency(metrics.rmse)}</div>
            <div className="metric-note">
              <Activity size={16} /> Root mean square error
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-kicker">MAE</div>
            <div className="metric-value">{formatCurrency(metrics.mae)}</div>
            <div className="metric-note">
              <Target size={16} /> Mean absolute error
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-kicker">MAPE</div>
            <div className="metric-value">{Number(metrics.mape).toFixed(2)}%</div>
            <div className="metric-note">
              <Percent size={16} /> Mean absolute percentage error
            </div>
          </article>
        </>
      )}

      <article className="metric-card metric-card-subtle">
        <div className="metric-kicker">Asset</div>
        <div className="metric-value metric-asset">{coin}</div>
        <div className="metric-note">Configured for this training run</div>
      </article>
    </div>
  );
};
