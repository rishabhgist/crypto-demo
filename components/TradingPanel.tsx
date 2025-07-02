"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";

export function TradingPanel() {
  const { state, exportTradesToCSV } = useDashboard();
  const { trades, isConnected } = state;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Trades</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Live Connection" : "No Connection"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={exportTradesToCSV}
              disabled={trades.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Download CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-1">
            {trades.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {isConnected
                  ? "Waiting for new trades to arrive..."
                  : "Trying to connect to live data..."}
              </div>
            ) : (
              trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-card/50 hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1 rounded ${
                        trade.side === "BUY"
                          ? "bg-green-500/10"
                          : "bg-red-500/10"
                      }`}
                    >
                      {trade.side === "BUY" ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{trade.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {trade.formattedTime}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono text-sm ${
                        trade.side === "BUY" ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      $
                      {trade.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8,
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {trade.quantity.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 6,
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
