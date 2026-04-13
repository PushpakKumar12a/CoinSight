# Crypto Price Prediction Notebook

> A complete machine learning pipeline — from raw historical crypto data to deep learning-powered price forecasts.

---

## Overview

This notebook (`train_model.ipynb`) walks through every stage of the ML pipeline: fetching historical price data, engineering financial features, training an LSTM-based model, and generating future price predictions.

---

## Pipeline Steps & Techniques

---

### 1. Data Collection

- **Source:** CoinGecko API
- **Format:** OHLCV — Open, High, Low, Close, Volume
- **Duration:** ~365 days of historical data

CoinGecko provides enough historical context for the model to identify trends and seasonal patterns reliably.

---

### 2. Exploratory Data Analysis (EDA)

- **Tool:** Plotly (`plotly.graph_objects`, `plotly.subplots`)
- **Charts:** Interactive Candlestick and Bar charts

EDA helps visualize raw price histories, understand trading volumes, and detect anomalies or seasonal patterns before modeling.

---

### 3. Feature Engineering

Technical indicators calculated using **Pandas** (`src/utils.py`):

| Indicator | Purpose |
|-----------|---------|
| SMA 7 & 21 | Smooths price data to identify primary trends |
| RSI 14 | Detects overbought or oversold conditions |
| MACD & Signal | Tracks trend strength, direction, and momentum |
| Bollinger Bands | Measures volatility and breakout levels |
| Volatility & Price Change | Captures short-window percentage fluctuations |

All features are normalized using **MinMaxScaler** (scikit-learn) to a `[0, 1]` range. A sliding window (`make_sequences`) then frames the data as a time-series forecasting task.

---

### 4. Model Training

- **Framework:** Keras / TensorFlow (`src/model.py`)
- **Architecture:** LSTM (Long Short-Term Memory) Neural Network

LSTMs retain long-term dependencies and avoid the vanishing gradient problem, making them ideal for sequential financial data.

---

### 5. Evaluation

- **Test set:** Most recent **20%** of data
- **Approach:** Strictly chronological — no look-ahead bias or data leakage

Validating on unseen historical data confirms the model has learned genuine patterns rather than overfitting.

---

### 6. Prediction

The trained LSTM takes the most recent historical window (lookback period) and **recursively forecasts prices** into the future — e.g., the next 7 days — delivering the core value of the application.

---

## Model Creation — Step by Step

---

### Step 1 — Data Preprocessing & Sequence Generation

- Features normalized via `MinMaxScaler` → range `[0, 1]`
- Sliding window of **60 days** converts the 2D table into 3D sequential chunks
- Each sequence maps to a target label: the **next day's scaled closing price**

---

### Step 2 — Sequential (Chronological) Split

- **80%** training / **20%** validation
- Split is strictly chronological to prevent any data leakage from future states

---

### Step 3 — Network Architecture

Built using the Keras `Sequential` API:

| Layer | Type | Config |
|-------|------|--------|
| 1 | LSTM | 128 units, `return_sequences=True` |
| 2 | Dropout | 20% |
| 3 | LSTM | 64 units, `return_sequences=False` |
| 4 | Dropout | 20% |
| 5 | Dense | 32 units, ReLU activation |
| 6 | Dense (Output) | 1 unit, Linear activation |

---

### Step 4 — Model Compilation

| Parameter | Value |
|-----------|-------|
| Optimizer | Adam (`lr = 0.001`) |
| Loss Function | Mean Squared Error (`mse`) |
| Tracked Metric | Mean Absolute Error (`mae`) |

> MSE heavily penalizes large outlier errors — appropriate for financial price tracking. MAE provides more interpretable feedback as the average absolute deviation.

---

### Step 5 — Callbacks

**EarlyStopping**
- Monitors `val_loss`
- Halts training if no improvement for **10 consecutive epochs**
- Automatically restores best-performing weights

**ReduceLROnPlateau**
- Triggers if `val_loss` stalls for **5 epochs**
- Halves the learning rate, enabling finer gradient descent steps

---

### Step 6 — Model Fitting

| Parameter | Value |
|-----------|-------|
| Batch Size | 32 |
| Max Epochs | 50 |

The model processes mini-batches of historical sequences, iteratively fine-tuning its weights while validating strictly against the chronological hold-out set.