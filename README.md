# Crypto Price Prediction App

> A full-stack web application that forecasts cryptocurrency prices using LSTM neural networks — built with a Python/FastAPI backend and a React frontend.

---

## Overview

This application uses **Long Short-Term Memory (LSTM)** neural networks to analyze historical price data and technical indicators, projecting future crypto price trajectories.

- The **React frontend** displays financial predictions, evaluation metrics, and raw data in a modern, responsive interface.
- The **FastAPI backend** handles data collection, feature engineering, and on-the-fly model training.

---

## Architecture & Tech Stack

### Backend

| Component | Technology |
|-----------|-----------|
| Framework | FastAPI (Python) on Uvicorn |
| Machine Learning | TensorFlow & Keras (Sequential LSTM) |
| Data Processing | Pandas, NumPy, Scikit-Learn (MinMaxScaler) |
| Data Source | CoinGecko API (live & historical OHLCV) |

**Core Files:**

- `main.py` — FastAPI server exposing REST endpoints (`/api/coins`, `/api/predict`)
- `src/model.py` — Builds the LSTM architecture and configures Keras callbacks (EarlyStopping, ReduceLROnPlateau)
- `src/utils.py` — Feature engineering (SMA, RSI, MACD, Bollinger Bands) and sequence scaling
- `src/data_fetcher.py` — Fetches historical market data from CoinGecko

---

### Frontend

| Component | Technology |
|-----------|-----------|
| Framework | React + Vite |
| Styling | Tailwind CSS |
| Package Manager | Bun |

**Core Files:**

- `App.jsx`, `main.jsx` — Global app state and layout
- `components/ChartComponent.jsx` — Visualizes actual vs. predicted prices and historical bounds
- `components/MetricsPanel.jsx` — Displays real-time evaluation metrics (RMSE, MAE, MAPE)
- `components/PredictedPricesTable.jsx` — Tabular view of predicted price timelines
- `components/RawDataTable.jsx` — Tabular view of ingested historical features

---

## Getting Started

### Prerequisites

- Python 3.9+
- Bun (or Node.js / npm)

---

### 1. Backend Setup

Navigate to the backend directory:
```bash
cd backend
```

Install Python dependencies:
```bash
pip install -r requirements.txt
```

Start the FastAPI server:
```bash
python main.py
```

> The backend API runs on **http://localhost:8000** by default (check Uvicorn logs).

---

### 2. Frontend Setup

Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
bun install
```

Start the development server:
```bash
bun run dev
```

> The frontend runs on **http://localhost:5173** — open this in your browser to use the app.

---

## How It Works

1. **Coin Selection** — The frontend fetches trending coins from the backend. The user picks a cryptocurrency (e.g., BTC, ETH) and sets a prediction window (e.g., next 7 days).

2. **Data Pipeline** — The frontend POSTs to `/api/predict`. The backend fetches the required historical timeline from CoinGecko.

3. **Feature Engineering** — Raw data is enhanced with 7 technical indicators (RSI, MACD, Bollinger Bands, SMAs) and normalized using `MinMaxScaler` to a `[0, 1]` range.

4. **On-the-Fly Training** — A new LSTM model is initialized, data is split chronologically (80/20), trained on historical sequences, and evaluated against the hold-out test set.

5. **Results & Rendering** — The backend generates future N-day price trajectories via iterative prediction and returns the full payload — chart points, future price arrays, and evaluation metrics (RMSE, MAE, MAPE) — to the React UI for visualization.