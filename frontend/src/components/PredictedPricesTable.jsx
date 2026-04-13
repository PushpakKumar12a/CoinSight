import React from 'react';
import { TrendingUp } from 'lucide-react';

const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const calculateChange = (current, previous) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

export const PredictedPricesTable = ({ dates, prices, currentPrice }) => {
  if (!Array.isArray(dates) || !Array.isArray(prices) || dates.length === 0) return null;

  return (
    <section className="panel table-panel">
      <div className="panel-header">
        <div>
          <span className="section-label">Forecast</span>
          <h3>Predicted prices</h3>
          <p>Future price predictions for the next {dates.length} days.</p>
        </div>
        <div className="panel-tally">
          <span>{dates.length} predicted days</span>
        </div>
      </div>

      <div className="table-wrap">
        <table className="raw-table prediction-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Date</th>
              <th>Predicted Price</th>
              <th>Change from Current</th>
              <th>Change %</th>
            </tr>
          </thead>
          <tbody>
            {dates.map((date, idx) => {
              const price = prices[idx];
              const change = currentPrice ? price - currentPrice : 0;
              const changePct = currentPrice ? calculateChange(price, currentPrice) : 0;
              const isPositive = change >= 0;

              return (
                <tr key={idx}>
                  <td className="day-column">{idx + 1}</td>
                  <td>{date}</td>
                  <td className="price-column">{formatCurrency(price)}</td>
                  <td className={`change-column ${isPositive ? 'positive' : 'negative'}`}>
                    {formatCurrency(change)}
                  </td>
                  <td className={`pct-column ${isPositive ? 'positive' : 'negative'}`}>
                    <TrendingUp size={14} style={{ transform: isPositive ? 'scaleY(1)' : 'scaleY(-1)' }} />
                    {Math.abs(changePct).toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

