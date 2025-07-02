"use client";

import React, { useState, useEffect, useMemo } from "react";
import { IDockviewPanelProps } from "dockview";
import { useDashboard } from "@/contexts/DashboardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import TradeFeed from "../tradefeed/TradeFeed";

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

// Helper function to validate and normalize timestamp
const normalizeTimestamp = (timestamp: number): number => {
  if (!timestamp || typeof timestamp !== "number") return 0;

  // If timestamp looks like seconds (10 digits), convert to milliseconds
  if (timestamp.toString().length === 10) {
    return timestamp * 1000;
  }

  return timestamp;
};

// Helper function to validate market data
const isValidMarketData = (data: any): boolean => {
  return (
    data &&
    typeof data.price === "number" &&
    data.price > 0 &&
    typeof data.priceChangePercent === "number" &&
    !isNaN(data.price) &&
    !isNaN(data.priceChangePercent)
  );
};

// Helper function to validate trade data
const isValidTrade = (trade: any): boolean => {
  return (
    trade &&
    typeof trade.price === "number" &&
    typeof trade.quantity === "number" &&
    trade.price > 0 &&
    trade.quantity > 0 &&
    trade.symbol &&
    trade.side &&
    !isNaN(trade.price) &&
    !isNaN(trade.quantity)
  );
};

export function MarketDataPanel(props: IDockviewPanelProps) {
  const { state, dispatch } = useDashboard();
  const { marketData, selectedSymbol, trades } = state;
  const [orderBook, setOrderBook] = useState<{
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
  }>({
    bids: [],
    asks: [],
  });
  const [orderBookError, setOrderBookError] = useState<string | null>(null);

  // Memoize filtered and validated market data
  const validatedMarketData = useMemo(() => {
    const validated: typeof marketData = {};

    Object.entries(marketData || {}).forEach(([symbol, data]) => {
      if (isValidMarketData(data)) {
        validated[symbol] = {
          ...data,
          // Ensure numeric values are properly formatted
          price: Number(data.price) || 0,
          high: Number(data.high) || 0,
          low: Number(data.low) || 0,
          volume: Number(data.volume) || 0,
          quoteVolume: Number(data.quoteVolume) || 0,
          priceChangePercent: Number(data.priceChangePercent) || 0,
        };
      } else {
        console.warn(`Invalid market data for ${symbol}:`, data);
      }
    });

    return validated;
  }, [marketData]);

  // Memoize filtered and validated trades
  const validatedTrades = useMemo(() => {
    if (!Array.isArray(trades)) return [];

    return trades
      .map((trade) => ({
        ...trade,
        timestamp: normalizeTimestamp(trade.timestamp),
        price: Number(trade.price) || 0,
        quantity: Number(trade.quantity) || 0,
      }))
      .filter((trade) => {
        const isValid = isValidTrade(trade);
        if (!isValid) {
          console.warn("Invalid trade data:", trade);
        }
        return isValid;
      })
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent first
  }, [trades]);

  // Generate mock order book data based on current price
  useEffect(() => {
    const currentPrice = validatedMarketData[selectedSymbol]?.price;
    if (!currentPrice || currentPrice <= 0) {
      setOrderBook({ bids: [], asks: [] });
      setOrderBookError("No valid price data available");
      return;
    }

    const generateOrderBook = () => {
      try {
        setOrderBookError(null);
        const bids: OrderBookEntry[] = [];
        const asks: OrderBookEntry[] = [];

        // Generate bids (buy orders) below current price
        let totalBids = 0;
        for (let i = 0; i < 10; i++) {
          const priceStep = currentPrice * 0.001 * (i + 1);
          const price = Math.max(0.01, currentPrice - priceStep); // Ensure price doesn't go negative
          const quantity = Math.random() * 100 + 10;
          totalBids += quantity;
          bids.push({
            price: Number(price.toFixed(8)),
            quantity: Number(quantity.toFixed(4)),
            total: Number(totalBids.toFixed(4)),
          });
        }

        // Generate asks (sell orders) above current price
        let totalAsks = 0;
        for (let i = 0; i < 10; i++) {
          const priceStep = currentPrice * 0.001 * (i + 1);
          const price = currentPrice + priceStep;
          const quantity = Math.random() * 100 + 10;
          totalAsks += quantity;
          asks.push({
            price: Number(price.toFixed(8)),
            quantity: Number(quantity.toFixed(4)),
            total: Number(totalAsks.toFixed(4)),
          });
        }

        setOrderBook({ bids, asks });
      } catch (error) {
        console.error("Error generating order book:", error);
        setOrderBookError("Failed to generate order book data");
        setOrderBook({ bids: [], asks: [] });
      }
    };

    generateOrderBook();
    const interval = setInterval(generateOrderBook, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [validatedMarketData, selectedSymbol]);

  // Memoize top movers calculations
  const { topGainers, topLosers } = useMemo(() => {
    const marketDataArray = Object.values(validatedMarketData);

    const gainers = marketDataArray
      .filter((data) => data.priceChangePercent > 0)
      .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
      .slice(0, 5);

    const losers = marketDataArray
      .filter((data) => data.priceChangePercent < 0)
      .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
      .slice(0, 5);

    return { topGainers: gainers, topLosers: losers };
  }, [validatedMarketData]);

  const selectedMarketData = validatedMarketData[selectedSymbol];
  const recentTrades = validatedTrades
    .filter((trade) => trade.symbol === selectedSymbol)
    .slice(0, 10);

  // Format price with appropriate decimal places
  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else if (price >= 1) {
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });
    } else {
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Market Data</h3>
          <Select
            value={selectedSymbol}
            onValueChange={(value) =>
              dispatch({ type: "SET_SELECTED_SYMBOL", payload: value })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
              <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
              <SelectItem value="BNBUSDT">BNB/USDT</SelectItem>
              <SelectItem value="ADAUSDT">ADA/USDT</SelectItem>
              <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4  h-full space-y-4">
        {/* Recent Trades */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentTrades.length > 0 ? (
                recentTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between text-xs p-1 rounded hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          trade.side === "BUY" ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                      <span className="font-mono">
                        ${formatPrice(trade.price)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">
                        {trade.quantity.toFixed(4)}
                      </span>
                      {trade.timestamp > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(trade.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground text-center py-4">
                  No recent trades
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
