'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useDashboard } from '@/contexts/DashboardContext';

interface ChartDataPoint {
  timestamp: number;
  price: number;
  time: string;
  volume: number;
}

const timeRanges = [
  { value: '1H', label: '1H', minutes: 60 },
  { value: '4H', label: '4H', minutes: 240 },
  { value: '1D', label: '1D', minutes: 1440 },
  { value: '1W', label: '1W', minutes: 10080 },
];

export function PriceChart() {
  const { state } = useDashboard();
  const { trades, selectedSymbol, marketData } = state;
  const [timeRange, setTimeRange] = useState('1H');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    // Filter trades for selected symbol and time range
    const now = Date.now();
    const selectedRange = timeRanges.find(r => r.value === timeRange);
    const rangeMs = (selectedRange?.minutes || 60) * 60 * 1000;
    const startTime = now - rangeMs;

    const symbolTrades = trades
      .filter(trade => trade.symbol === selectedSymbol && trade.timestamp >= startTime)
      .sort((a, b) => a.timestamp - b.timestamp);

    // Group trades by time intervals (e.g., 5 minutes)
    const intervalMs = Math.max(300000, rangeMs / 100); // 5 minutes or range/100
    const groupedData: { [key: number]: ChartDataPoint } = {};

    symbolTrades.forEach(trade => {
      const intervalStart = Math.floor(trade.timestamp / intervalMs) * intervalMs;
      
      if (!groupedData[intervalStart]) {
        groupedData[intervalStart] = {
          timestamp: intervalStart,
          price: trade.price,
          time: new Date(intervalStart).toLocaleTimeString(),
          volume: trade.quantity
        };
      } else {
        // Update with latest price in interval
        if (trade.timestamp > groupedData[intervalStart].timestamp) {
          groupedData[intervalStart].price = trade.price;
        }
        groupedData[intervalStart].volume += trade.quantity;
      }
    });

    const processedData = Object.values(groupedData).sort((a, b) => a.timestamp - b.timestamp);
    setChartData(processedData);
  }, [trades, selectedSymbol, timeRange]);

  const currentPrice = marketData[selectedSymbol]?.price || 0;
  const priceChange = marketData[selectedSymbol]?.priceChangePercent || 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Price Chart</CardTitle>
            <div className="text-sm text-muted-foreground">{selectedSymbol}</div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeRanges.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {currentPrice > 0 && (
          <div className="flex items-center gap-4">
            <div className="font-mono text-xl font-bold">
              ${currentPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 8
              })}
            </div>
            <div className={`text-sm ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full p-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={['dataMin - 100', 'dataMax + 100']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={priceChange >= 0 ? '#10b981' : '#ef4444'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: priceChange >= 0 ? '#10b981' : '#ef4444', strokeWidth: 2 }}
                />
                {currentPrice > 0 && (
                  <ReferenceLine 
                    y={currentPrice} 
                    stroke={priceChange >= 0 ? '#10b981' : '#ef4444'}
                    strokeDasharray="5 5"
                    opacity={0.5}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-lg mb-2">No chart data available</div>
                <div className="text-sm">Start trading to see price movements</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}