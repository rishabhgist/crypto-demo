"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  BinanceWebSocketManager,
  ProcessedTradeData,
  ProcessedTickerData,
} from "@/lib/websocket";
import { toast } from "sonner";

interface MarketData {
  [symbol: string]: ProcessedTickerData;
}

interface DashboardState {
  trades: ProcessedTradeData[];
  marketData: MarketData;
  isConnected: boolean;
  selectedSymbol: string;
  theme: "light" | "dark";
  layout: any;
  connectionAttempts: number;
  lastConnectionTime: number | null;
  memoryUsage: {
    tradesCount: number;
    marketDataCount: number;
    lastCleanup: number;
  };
  isHydrated: boolean;
}

type DashboardAction =
  | { type: "ADD_TRADE"; payload: ProcessedTradeData }
  | { type: "ADD_TRADES_BATCH"; payload: ProcessedTradeData[] }
  | { type: "UPDATE_TICKER"; payload: ProcessedTickerData }
  | { type: "SET_CONNECTION"; payload: boolean }
  | { type: "SET_SELECTED_SYMBOL"; payload: string }
  | { type: "SET_THEME"; payload: "light" | "dark" }
  | { type: "SET_LAYOUT"; payload: any }
  | { type: "INCREMENT_CONNECTION_ATTEMPTS" }
  | { type: "RESET_CONNECTION_ATTEMPTS" }
  | { type: "SET_LAST_CONNECTION_TIME"; payload: number }
  | { type: "CLEANUP_MEMORY" }
  | { type: "SET_HYDRATED"; payload: boolean }
  | { type: "CLEAR_TRADES" };

const MAX_TRADES = 500;
const MAX_MARKET_DATA_AGE = 300000; // 5 minutes
const CLEANUP_INTERVAL = 60000; // 1 minute

const initialState: DashboardState = {
  trades: [],
  marketData: {},
  isConnected: false,
  selectedSymbol: "BTCUSDT",
  theme: "dark",
  layout: null,
  connectionAttempts: 0,
  lastConnectionTime: null,
  memoryUsage: {
    tradesCount: 0,
    marketDataCount: 0,
    lastCleanup: Date.now(),
  },
  isHydrated: false,
};

function dashboardReducer(
  state: DashboardState,
  action: DashboardAction
): DashboardState {
  switch (action.type) {
    case "ADD_TRADE":
      const newTrades = [
        action.payload,
        ...state.trades.slice(0, MAX_TRADES - 1),
      ];
      return {
        ...state,
        trades: newTrades,
        memoryUsage: {
          ...state.memoryUsage,
          tradesCount: newTrades.length,
        },
      };

    case "ADD_TRADES_BATCH":
      const batchedTrades = [...action.payload, ...state.trades].slice(
        0,
        MAX_TRADES
      );
      return {
        ...state,
        trades: batchedTrades,
        memoryUsage: {
          ...state.memoryUsage,
          tradesCount: batchedTrades.length,
        },
      };

    case "UPDATE_TICKER":
      const existingTicker = state.marketData[action.payload.symbol];
      const shouldUpdate =
        !existingTicker ||
        action.payload.timestamp > existingTicker.timestamp ||
        Math.abs(action.payload.price - existingTicker.price) > 0.01;

      if (!shouldUpdate) {
        return state;
      }

      return {
        ...state,
        marketData: {
          ...state.marketData,
          [action.payload.symbol]: action.payload,
        },
        memoryUsage: {
          ...state.memoryUsage,
          marketDataCount: Object.keys(state.marketData).length + 1,
        },
      };

    case "SET_CONNECTION":
      return {
        ...state,
        isConnected: action.payload,
        connectionAttempts: action.payload ? 0 : state.connectionAttempts,
        lastConnectionTime: action.payload
          ? Date.now()
          : state.lastConnectionTime,
      };

    case "SET_SELECTED_SYMBOL":
      return {
        ...state,
        selectedSymbol: action.payload,
      };

    case "SET_THEME":
      return {
        ...state,
        theme: action.payload,
      };

    case "SET_LAYOUT":
      return {
        ...state,
        layout: action.payload,
      };

    case "INCREMENT_CONNECTION_ATTEMPTS":
      return {
        ...state,
        connectionAttempts: state.connectionAttempts + 1,
      };

    case "RESET_CONNECTION_ATTEMPTS":
      return {
        ...state,
        connectionAttempts: 0,
      };

    case "SET_LAST_CONNECTION_TIME":
      return {
        ...state,
        lastConnectionTime: action.payload,
      };

    case "CLEANUP_MEMORY":
      const now = Date.now();
      const cleanedMarketData = Object.fromEntries(
        Object.entries(state.marketData).filter(
          ([_, data]) => now - data.timestamp < MAX_MARKET_DATA_AGE
        )
      );

      return {
        ...state,
        marketData: cleanedMarketData,
        memoryUsage: {
          tradesCount: state.trades.length,
          marketDataCount: Object.keys(cleanedMarketData).length,
          lastCleanup: now,
        },
      };

    case "SET_HYDRATED":
      return {
        ...state,
        isHydrated: action.payload,
      };

    case "CLEAR_TRADES":
      return {
        ...state,
        trades: [],
        memoryUsage: {
          ...state.memoryUsage,
          tradesCount: 0,
        },
      };

    default:
      return state;
  }
}

interface DashboardContextType {
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;
  exportTradesToCSV: () => void;
  wsManager: BinanceWebSocketManager | null;
  retryConnection: () => void;
  getMemoryStats: () => {
    tradesMemory: number;
    marketDataMemory: number;
    totalMemory: number;
  };
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const wsManagerRef = useRef<any | null>(null);
  const tradesBatchRef = useRef<any[]>([]);
  const batchTimeoutRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  // Stable callback references
  const processTradeBatch = useCallback(() => {
    if (tradesBatchRef.current.length > 0) {
      dispatch({ type: "ADD_TRADES_BATCH", payload: tradesBatchRef.current });
      tradesBatchRef.current = [];
    }
  }, []);

  const addTradeToQueue = useCallback(
    (tradeData: ProcessedTradeData) => {
      tradesBatchRef.current.push(tradeData);

      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      if (tradesBatchRef.current.length >= 10) {
        processTradeBatch();
      } else {
        batchTimeoutRef.current = setTimeout(processTradeBatch, 100);
      }
    },
    [processTradeBatch]
  );

  const handleTickerUpdate = useCallback((tickerData: ProcessedTickerData) => {
    dispatch({ type: "UPDATE_TICKER", payload: tickerData });
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    dispatch({ type: "SET_CONNECTION", payload: connected });
    if (connected) {
      dispatch({ type: "RESET_CONNECTION_ATTEMPTS" });
      dispatch({ type: "SET_LAST_CONNECTION_TIME", payload: Date.now() });
      toast.success("Connected to Market Data", {
        description: "Real-time cryptocurrency data is now streaming.",
        duration: 3000,
      });
    } else {
      dispatch({ type: "INCREMENT_CONNECTION_ATTEMPTS" });
    }
  }, []);

  const handleMaxReconnectAttempts = useCallback(() => {
    toast.error("Connection Lost", {
      description: "Unable to connect to live market data. Click to retry.",
      duration: 10000,
      action: {
        label: "Retry",
        onClick: () => {
          if (wsManagerRef.current) {
            wsManagerRef.current.connect();
          }
        },
      },
    });
  }, []);

  const retryConnection = useCallback(() => {
    if (wsManagerRef.current) {
      console.log("Manual retry connection...");
      wsManagerRef.current.connect();
    }
  }, []);

  const getMemoryStats = useCallback(() => {
    const tradesMemory = state.trades.length * 200;
    const marketDataMemory = Object.keys(state.marketData).length * 300;
    return {
      tradesMemory,
      marketDataMemory,
      totalMemory: tradesMemory + marketDataMemory,
    };
  }, [state.trades.length, state.marketData]);

  // Hydration effect
  useEffect(() => {
    dispatch({ type: "SET_HYDRATED", payload: true });
  }, []);

  // Initialize WebSocket manager only once after hydration
  useEffect(() => {
    if (!state.isHydrated || isInitializedRef.current) return;

    isInitializedRef.current = true;

    // Load saved preferences
    try {
      const savedTheme = localStorage.getItem("dashboard-theme") as
        | "light"
        | "dark"
        | null;
      const savedLayout = localStorage.getItem("dashboard-layout");

      if (savedTheme && savedTheme !== state.theme) {
        dispatch({ type: "SET_THEME", payload: savedTheme });
      }

      if (savedLayout) {
        const parsedLayout = JSON.parse(savedLayout);
        if (parsedLayout && typeof parsedLayout === "object") {
          dispatch({ type: "SET_LAYOUT", payload: parsedLayout });
        }
      }
    } catch (error) {
      console.error("Failed to load saved preferences:", error);
    }

    // Initialize WebSocket manager
    try {
      const manager = new BinanceWebSocketManager(
        addTradeToQueue,
        handleTickerUpdate,
        handleConnectionChange,
        handleMaxReconnectAttempts
      );

      wsManagerRef.current = manager;

      // Connect after a brief delay
      const connectionTimeout = setTimeout(() => {
        console.log("Initializing WebSocket connection...");
        manager.connect();
      }, 1000);

      return () => {
        clearTimeout(connectionTimeout);
        if (batchTimeoutRef.current) {
          clearTimeout(batchTimeoutRef.current);
        }
        manager.disconnect();
        wsManagerRef.current = null;
      };
    } catch (error) {
      console.error("Failed to initialize WebSocket manager:", error);
      toast.error("Initialization Error", {
        description: "Failed to initialize market data connection.",
      });
    }
  }, [
    state.isHydrated,
    addTradeToQueue,
    handleTickerUpdate,
    handleConnectionChange,
    handleMaxReconnectAttempts,
  ]);

  // Memory cleanup interval
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      if (now - state.memoryUsage.lastCleanup > CLEANUP_INTERVAL) {
        dispatch({ type: "CLEANUP_MEMORY" });
      }
    }, CLEANUP_INTERVAL);

    return () => clearInterval(cleanupInterval);
  }, [state.memoryUsage.lastCleanup]);

  // Theme persistence
  useEffect(() => {
    if (state.isHydrated) {
      localStorage.setItem("dashboard-theme", state.theme);
      document.documentElement.classList.toggle("dark", state.theme === "dark");
    }
  }, [state.theme, state.isHydrated]);

  // Layout persistence
  useEffect(() => {
    if (state.isHydrated && state.layout) {
      try {
        localStorage.setItem("dashboard-layout", JSON.stringify(state.layout));
      } catch (error) {
        console.error("Failed to save layout:", error);
      }
    }
  }, [state.layout, state.isHydrated]);

  // Memory monitoring
  useEffect(() => {
    const stats = getMemoryStats();
    if (stats.totalMemory > 5000000) {
      console.warn("High memory usage detected:", stats);
      toast.warning("High Memory Usage", {
        description:
          "Dashboard is using significant memory. Consider refreshing if performance degrades.",
        duration: 5000,
      });
    }
  }, [getMemoryStats]);

  const exportTradesToCSV = useCallback(() => {
    if (state.trades.length === 0) {
      toast.error("No Data to Export", {
        description: "No trade data available for export.",
      });
      return;
    }

    try {
      const headers = [
        "Timestamp",
        "Symbol",
        "Price",
        "Quantity",
        "Side",
        "Time",
      ];
      const csvContent = [
        headers.join(","),
        ...state.trades.map((trade) =>
          [
            trade.timestamp,
            trade.symbol,
            trade.price,
            trade.quantity,
            trade.side,
            `"${trade.formattedTime}"`,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `trades_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Export Successful", {
        description: `Exported ${state.trades.length} trades to CSV file.`,
      });
    } catch (error) {
      console.error("Failed to export trades:", error);
      toast.error("Export Failed", {
        description: "Failed to export trade data. Please try again.",
      });
    }
  }, [state.trades]);

  // Memoize context value
  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      exportTradesToCSV,
      wsManager: wsManagerRef.current,
      retryConnection,
      getMemoryStats,
    }),
    [state, exportTradesToCSV, retryConnection, getMemoryStats]
  );

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
