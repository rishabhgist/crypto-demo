```markdown
# 🪙 CryptoDemo App

A modern, developer-friendly crypto market dashboard built with **Next.js**, **DockView**, **Highcharts**, and **Perspective**. It provides real-time trade data, candlestick price charts, and mock market insights.

---

## 🚀 Live Demo

> Hosted on [Vercel/Netlify] — *(add your deployment link here)*

---

## 🛠️ Setup Instructions

```bash
# 1. Clone the repository
git clone https://github.com/your-username/crypto-demo.git
cd crypto-demo

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Run the app locally
npm run dev
```

> ⚠️ Requires Node.js 16+

---

## 🔗 Data Sources

- **Live Trades**:  
  Powered by the [Binance WebSocket API](https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md) for real-time trade data.

- **Price Data**:  
  Candlestick and volume charts are generated using mock data for demo purposes.

- **Market Data**:  
  Order book and market metrics are mock-generated snapshots.

---

## 🧩 Features

### 📐 DockView Layout
- Multi-panel layout using `DockView`
- Dynamic resizing and tab support

### 📊 Panel 1: Live Trades
- Streamed in real-time from Binance
- Rendered using [`@finos/perspective`](https://perspective.finos.org/)
- Styled with theme-aware colors

### 💹 Panel 2: Price Chart with Volume
- Candlestick chart with mock data
- Volume overlay below price
- Built with **Highcharts Stock**
- Supports light/dark mode based on app theme

### 📈 Panel 3: Market Data
- Displays mock market metrics
- Useful for showing order book or ticker data

---

## ⚠️ Known Issues / Limitations

- ❗ **Perspective Integration**
  - `<perspective-viewer>` causes TypeScript + SSR issues in Next.js.
  - Requires use of `//@ts-ignore` or dynamic imports to bypass.

- 🎨 **Theme Compatibility**
  - Highcharts doesn’t fully adapt to theme changes without forcing remount.

- 🧪 **Mock Data**
  - No real backend except WebSocket.
  - Price chart and market data reset on refresh.

- 🏗️ **TypeScript**
  - Some third-party components (like `perspective-viewer`) lack type definitions.

---

## 📁 Project Structure

```
/components
  ├── CandleStickChart.tsx
  ├── LiveTradesPanel.tsx
  └── MarketDataPanel.tsx

/contexts
  └── DashboardContext.tsx

/pages
  └── index.tsx

/utils
  └── generateMockData.ts
```

---

## 🧪 Tech Stack

- **Next.js 13+** (App Router)
- **TypeScript**
- **Highcharts + Highstock**
- **@finos/perspective**
- **DockView** (Layout Engine)
- **Binance WebSocket API**
- **Mock data generators**

---
```
