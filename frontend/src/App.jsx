import React, { useEffect, useState } from 'react';
import { BarChart3, BrainCircuit, Database, TriangleAlert, Zap } from 'lucide-react';
import { getCoins, predictPrices } from './api';
import './App.css';
import {
  ActualVsPredictedChart,
  ForecastChart,
  IndicatorChart,
  PriceVolumeChart,
  TrainingHistoryChart,
} from './components/ChartComponent';
import { MetricsPanel } from './components/MetricsPanel';
import { RawDataTable } from './components/RawDataTable';
import { PredictedPricesTable } from './components/PredictedPricesTable';

const FALLBACK_COINS = [
  'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'BNB', 'DOGE', 'TRX', 'DOT', 'MATIC',
  'LTC', 'LINK', 'AVAX', 'ATOM', 'UNI', 'SHIB', 'AAVE', 'NEAR', 'ARB', 'OP',
];

const normalizeCoins = (coinList) => Array.from(new Set(coinList.map((coin) => String(coin).toUpperCase())));

const formatError = (error) => error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'An unexpected error occurred while building the forecast.';

const formatDaysLabel = (days) => `${days} day${days === 1 ? '' : 's'}`;
const clampValue = (value, min, max) => Math.max(min, Math.min(max, value));

function App() {
  const [coins, setCoins] = useState(FALLBACK_COINS);
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [historyDays, setHistoryDays] = useState(365);
  const [predictionDays, setPredictionDays] = useState(7);
  const [lookback, setLookback] = useState(60);
  const [epochs, setEpochs] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [coinSourceState, setCoinSourceState] = useState('Using the built-in asset list');

  const updateNumberField = (setter, min, max) => (event) => {
    const parsed = Number(event.target.value);
    if (Number.isNaN(parsed)) {
      return;
    }
    setter(clampValue(parsed, min, max));
  };

  const adjustNumberField = (setter, min, max, step) => (delta) => {
    setter((prev) => clampValue(prev + delta * step, min, max));
  };

  useEffect(() => {
    let isActive = true;

    getCoins()
      .then((availableCoins) => {
        if (!isActive || !Array.isArray(availableCoins) || availableCoins.length === 0) {
          return;
        }

        const normalizedCoins = normalizeCoins(availableCoins);
        setCoins(normalizedCoins);
        setSelectedCoin((currentCoin) => (normalizedCoins.includes(currentCoin) ? currentCoin : normalizedCoins[0]));
        setCoinSourceState(`Connected to API with ${normalizedCoins.length} assets`);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setCoins(FALLBACK_COINS);
        setCoinSourceState('Backend unavailable, using local fallback coins');
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handlePredict = async () => {
    const coinSymbol = selectedCoin.trim().toUpperCase();
    if (!coinSymbol) {
      setError('Please enter a coin symbol, for example BTC or ETH.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        coin: coinSymbol,
        history_days: historyDays,
        prediction_days: predictionDays,
        lookback,
        epochs,
      };

      const response = await predictPrices(payload);
      setResult(response);
      setSelectedCoin(coinSymbol);
      setCoinSourceState(`Forecast ready for ${coinSymbol}`);
    } catch (predictError) {
      setError(formatError(predictError));
    } finally {
      setLoading(false);
    }
  };

  const futurePrices = result?.future_prices ?? [];
  const finalPrediction = futurePrices.length > 0 ? futurePrices[futurePrices.length - 1] : null;
  const currentPrice = result?.current_price ?? null;
  const prevPrice = result?.prev_price ?? null;
  const historicalCount = result?.historical?.length ?? 0;
  const chartRows = result?.historical ?? [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-icon">
            <BrainCircuit size={22} />
          </div>
          <div>
            <p className="brand-kicker">Crypto forecast studio</p>
            <h1>CryptoVision AI</h1>
          </div>
        </div>

        <div className="sidebar-panel">
          <div className="panel-copy">
            <span className="eyebrow">Model setup</span>
            <h2>Shape the forecast before training.</h2>
            <p>Pick the asset, history window, and model depth. The backend trains an LSTM and returns the forecast plus quality metrics.</p>
          </div>

          <div className="field">
            <label htmlFor="coin-input">Asset symbol</label>
            <input
              id="coin-input"
              className="control-input"
              type="text"
              list="coin-options"
              placeholder="Type symbol (e.g., BTC)"
              value={selectedCoin}
              onChange={(event) => setSelectedCoin(event.target.value.toUpperCase())}
              onBlur={() => setSelectedCoin((prev) => prev.trim().toUpperCase())}
            />
            <datalist id="coin-options">
              {coins.map((coin) => (
                <option key={coin} value={coin} />
              ))}
            </datalist>
            <span className="field-help">Suggestions loaded: {coins.length} symbols</span>
          </div>

          <div className="field">
            <div className="field-head">
              <label htmlFor="history-range">History window</label>
              <span>{historyDays} days</span>
            </div>
            <div className="stepper-control">
              <button
                type="button"
                className="stepper-button"
                onClick={() => adjustNumberField(setHistoryDays, 90, 365, 1)(-1)}
                aria-label="Decrease history window"
              >
                -
              </button>
              <input
                id="history-range"
                type="number"
                className="stepper-input"
                min={90}
                max={365}
                step={1}
                value={historyDays}
                onChange={updateNumberField(setHistoryDays, 90, 365)}
              />
              <button
                type="button"
                className="stepper-button"
                onClick={() => adjustNumberField(setHistoryDays, 90, 365, 1)(1)}
                aria-label="Increase history window"
              >
                +
              </button>
            </div>
          </div>

          <div className="field">
            <div className="field-head">
              <label htmlFor="prediction-range">Forecast horizon</label>
              <span>{formatDaysLabel(predictionDays)}</span>
            </div>
            <div className="stepper-control">
              <button
                type="button"
                className="stepper-button"
                onClick={() => adjustNumberField(setPredictionDays, 1, 30, 1)(-1)}
                aria-label="Decrease forecast horizon"
              >
                -
              </button>
              <input
                id="prediction-range"
                type="number"
                className="stepper-input"
                min={1}
                max={30}
                step={1}
                value={predictionDays}
                onChange={updateNumberField(setPredictionDays, 1, 30)}
              />
              <button
                type="button"
                className="stepper-button"
                onClick={() => adjustNumberField(setPredictionDays, 1, 30, 1)(1)}
                aria-label="Increase forecast horizon"
              >
                +
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="lookback-select">Lookback window</label>
            <select
              id="lookback-select"
              className="control-select"
              value={lookback}
              onChange={(event) => setLookback(Number(event.target.value))}
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>

          <div className="field">
            <div className="field-head">
              <label htmlFor="epochs-range">Training epochs</label>
              <span>{epochs}</span>
            </div>
            <div className="stepper-control">
              <button
                type="button"
                className="stepper-button"
                onClick={() => adjustNumberField(setEpochs, 10, 100, 10)(-1)}
                aria-label="Decrease training epochs"
              >
                -
              </button>
              <input
                id="epochs-range"
                type="number"
                className="stepper-input"
                min={10}
                max={100}
                step={10}
                value={epochs}
                onChange={updateNumberField(setEpochs, 10, 100)}
              />
              <button
                type="button"
                className="stepper-button"
                onClick={() => adjustNumberField(setEpochs, 10, 100, 10)(1)}
                aria-label="Increase training epochs"
              >
                +
              </button>
            </div>
          </div>

          <button className="submit-button" type="button" onClick={handlePredict} disabled={loading}>
            {loading ? 'Training model...' : <><Zap size={18} /> Train and predict</>}
          </button>

          <div className="sidebar-footer">
            <Database size={16} />
            <span>{coinSourceState}</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="hero-card">
          <div className="hero-copy">
            <span className="eyebrow"><BarChart3 size={14} /> Forecast workspace</span>
            <h2>Crypto price prediction</h2>
            <p>Train a daily price model, compare the forecast against recent history, and review error metrics in a calmer, more legible dashboard.</p>
          </div>

          <div className="hero-meta">
            <div className="meta-card">
              <span>Selected coin</span>
              <strong>{selectedCoin}</strong>
            </div>
            <div className="meta-card">
              <span>Forecast horizon</span>
              <strong>{formatDaysLabel(predictionDays)}</strong>
            </div>
            <div className="meta-card">
              <span>Lookback</span>
              <strong>{lookback} days</strong>
            </div>
            <div className="meta-card">
              <span>Status</span>
              <strong>{loading ? 'Training' : result ? 'Ready' : 'Idle'}</strong>
            </div>
          </div>
        </header>

        {error && (
          <div className="alert alert-error">
            <TriangleAlert size={18} />
            <div>
              <strong>Prediction failed.</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {result ? (
          <div className="content-stack">
            <MetricsPanel
              coin={selectedCoin}
              currentPrice={currentPrice}
              prevPrice={prevPrice}
              finalPrediction={finalPrediction}
              metrics={result.metrics}
            />

            <section className="panel chart-panel">
              <div className="panel-header">
                <div>
                  <span className="section-label">Forecast</span>
                  <h3>Historical + future forecast</h3>
                  <p>Recent trend connected to projected future prices.</p>
                </div>
                <div className="panel-tally">
                  <span>{historicalCount} historical rows</span>
                  <span>{futurePrices.length} predicted days</span>
                </div>
              </div>

              <div className="chart-frame">
                {loading && (
                  <div className="loading-overlay">
                    <div className="spinner" />
                    <h4>Training model and generating the forecast...</h4>
                    <p>This can take a moment while the LSTM fits to the selected coin.</p>
                  </div>
                )}

                <ForecastChart
                  data={chartRows}
                  futureDates={result.future_dates}
                  futurePrices={futurePrices}
                />
              </div>
            </section>

            <section className="panel chart-panel">
              <div className="panel-header">
                <div>
                  <span className="section-label">Notebook chart 1</span>
                  <h3>Price history + volume</h3>
                  <p>OHLC series with volume overlay from the latest training window.</p>
                </div>
              </div>
              <div className="chart-frame compact-chart-frame">
                <PriceVolumeChart data={chartRows} />
              </div>
            </section>

            <section className="panel chart-panel">
              <div className="panel-header">
                <div>
                  <span className="section-label">Notebook chart 2</span>
                  <h3>Close + technical indicators</h3>
                  <p>Close price, SMA bands, and Bollinger bands from feature engineering.</p>
                </div>
              </div>
              <div className="chart-frame compact-chart-frame">
                <IndicatorChart data={chartRows} />
              </div>
            </section>

            <section className="panel chart-panel">
              <div className="panel-header">
                <div>
                  <span className="section-label">Notebook chart 3</span>
                  <h3>Training history</h3>
                  <p>Loss and MAE curves across epochs.</p>
                </div>
              </div>
              <div className="chart-frame compact-chart-frame">
                <TrainingHistoryChart history={result.training_history} />
              </div>
            </section>

            <section className="panel chart-panel">
              <div className="panel-header">
                <div>
                  <span className="section-label">Notebook chart 4</span>
                  <h3>Actual vs predicted (test set)</h3>
                  <p>Model fit quality on held-out temporal test samples.</p>
                </div>
              </div>
              <div className="chart-frame compact-chart-frame">
                <ActualVsPredictedChart testEval={result.test_eval} />
              </div>
            </section>

            <RawDataTable title="Collected OHLCV rows" rows={result.raw_ohlcv_top20} />

            <PredictedPricesTable
              dates={result.future_dates}
              prices={futurePrices}
              currentPrice={currentPrice}
            />
          </div>
        ) : (
          <section className="panel empty-panel">
            {loading ? (
              <div className="loading-overlay">
                <div className="spinner" />
                <h4>Preparing data and neural network inputs...</h4>
                <p>Fetching historical prices and starting the training run.</p>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <BarChart3 size={28} />
                </div>
                <h3>Forecasts will appear here.</h3>
                <p>Choose a coin, adjust the training window, and launch the model to see the price path, metrics, and prediction curve.</p>
                <div className="empty-grid">
                  <div>
                    <strong>1. Select an asset</strong>
                    <span>Use the sidebar to choose the coin.</span>
                  </div>
                  <div>
                    <strong>2. Train the model</strong>
                    <span>Adjust the lookback and epochs if needed.</span>
                  </div>
                  <div>
                    <strong>3. Review the result</strong>
                    <span>Compare the forecast with the recent trend.</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
