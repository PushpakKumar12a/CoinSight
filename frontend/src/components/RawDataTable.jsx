import React from 'react';

const formatCell = (value) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—';
    return Math.abs(value) >= 1000 ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value.toFixed(4);
  }
  return String(value);
};

export const RawDataTable = ({ title, rows }) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const columns = Object.keys(rows[0]);

  return (
    <section className="panel table-panel">
      <div className="panel-header">
        <div>
          <span className="section-label">Raw data</span>
          <h3>{title}</h3>
          <p>Showing the first 20 rows used during this training run.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="raw-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                {columns.map((column) => (
                  <td key={`${idx}-${column}`}>{formatCell(row[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

