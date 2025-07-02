'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Moon, Sun, Wifi, WifiOff, Activity, BarChart3, AlertTriangle } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';

export function DashboardHeader() {
  const { state, dispatch, getMemoryStats } = useDashboard();
  const { isConnected, theme, trades, isHydrated } = state;

  const toggleTheme = () => {
    dispatch({ type: 'SET_THEME', payload: theme === 'dark' ? 'light' : 'dark' });
  };

  const memoryStats = getMemoryStats();
  const isHighMemoryUsage = memoryStats.totalMemory > 3000000; // 3MB threshold

  // Don't render until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">CryptoTrader Pro</h1>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3 w-3 animate-pulse" />
              Loading...
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-6 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">CryptoTrader Pro</h1>
          </div>
          
          <Badge variant={isConnected ? 'default' : 'destructive'} className="gap-1">
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>{trades.length.toLocaleString()} trades</span>
          </div>

          {/* Memory usage indicator */}
          {isHighMemoryUsage && (
            <Badge variant="outline" className="gap-1 text-orange-500 border-orange-500">
              <AlertTriangle className="h-3 w-3" />
              High Memory
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Memory stats (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-muted-foreground">
              Memory: {Math.round(memoryStats.totalMemory / 1024)}KB
            </div>
          )}

          <div className="flex items-center gap-2">
            <Label htmlFor="theme-switch" className="text-sm">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </Label>
            <Switch
              id="theme-switch"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
            {theme === 'dark' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}