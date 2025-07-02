"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";

export function MarketOverview() {
  const { state, dispatch } = useDashboard();
  const { marketData, selectedSymbol } = state;

  const marketDataArray = Object.values(marketData);
  const topGainers = marketDataArray
    .filter((data) => data.priceChangePercent > 0)
    .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
    .slice(0, 3);

  const topLosers = marketDataArray
    .filter((data) => data.priceChangePercent < 0)
    .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
    .slice(0, 3);

  const selectedMarketData = marketData[selectedSymbol];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* Selected Symbol Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Market Overview
            </CardTitle>
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
                <SelectItem value="BTCUSDT">Bitcoin (BTC/USDT)</SelectItem>
                <SelectItem value="ETHUSDT">Ethereum (ETH/USDT)</SelectItem>
                <SelectItem value="BNBUSDT">Binance Coin (BNB/USDT)</SelectItem>
                <SelectItem value="ADAUSDT">Cardano (ADA/USDT)</SelectItem>
                <SelectItem value="SOLUSDT">Solana (SOL/USDT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {selectedMarketData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold font-mono">
                    $
                    {selectedMarketData.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8,
                    })}
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      selectedMarketData.priceChangePercent >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {selectedMarketData.priceChangePercent >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {selectedMarketData.priceChangePercent.toFixed(2)}%
                  </div>
                </div>
                <Badge
                  variant={
                    selectedMarketData.priceChangePercent >= 0
                      ? "default"
                      : "destructive"
                  }
                >
                  {selectedMarketData.priceChangePercent >= 0 ? "+" : ""}$
                  {selectedMarketData.priceChange.toFixed(2)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">24h High</div>
                  <div className="font-mono">
                    ${selectedMarketData.high.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">24h Low</div>
                  <div className="font-mono">
                    ${selectedMarketData.low.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">24h Volume</div>
                  <div className="font-mono">
                    {selectedMarketData.volume.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Quote Volume</div>
                  <div className="font-mono">
                    $
                    {selectedMarketData.quoteVolume.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Waiting for the latest market data...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Gainers & Losers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Top Movers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Top Gainers */}
            <div>
              <h4 className="text-sm font-medium text-green-500 mb-2 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Biggest Gainers Today
              </h4>
              <div className="space-y-2">
                {topGainers.length > 0 ? (
                  topGainers.map((data) => (
                    <div
                      key={data.symbol}
                      className="flex items-center justify-between p-2 rounded bg-green-500/5"
                    >
                      <div className="font-medium text-sm">{data.symbol}</div>
                      <div className="text-right">
                        <div className="font-mono text-sm">
                          ${data.price.toLocaleString()}
                        </div>
                        <div className="text-xs text-green-500">
                          +{data.priceChangePercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No coins are up right now
                  </div>
                )}
              </div>
            </div>

            {/* Top Losers */}
            <div>
              <h4 className="text-sm font-medium text-red-500 mb-2 flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />
                Biggest Losers Today
              </h4>
              <div className="space-y-2">
                {topLosers.length > 0 ? (
                  topLosers.map((data) => (
                    <div
                      key={data.symbol}
                      className="flex items-center justify-between p-2 rounded bg-red-500/5"
                    >
                      <div className="font-medium text-sm">{data.symbol}</div>
                      <div className="text-right">
                        <div className="font-mono text-sm">
                          ${data.price.toLocaleString()}
                        </div>
                        <div className="text-xs text-red-500">
                          {data.priceChangePercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No coins are down right now
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
