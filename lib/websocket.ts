export interface BinanceTradeData {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  a: number; // Aggregate trade ID
  p: string; // Price
  q: string; // Quantity
  f: number; // First trade ID
  l: number; // Last trade ID
  T: number; // Trade time
  m: boolean; // Is the buyer the market maker?
  M: boolean; // Ignore
}

export interface BinanceTickerData {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  c: string; // Close price
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Volume
  q: string; // Quote volume
  P: string; // Price change percent
  p: string; // Price change
  C: number; // Close time
  x: string; // First trade(F)-1 price (first trade before the 24hr rolling window)
  Q: string; // Last quantity
  b: string; // Best bid price
  B: string; // Best bid quantity
  a: string; // Best ask price
  A: string; // Best ask quantity
}

export interface ProcessedTradeData {
  id: string;
  timestamp: number;
  symbol: string;
  price: number;
  quantity: number;
  side: "BUY" | "SELL";
  formattedTime: string;
}

export interface ProcessedTickerData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  high: number;
  low: number;
  volume: number;
  quoteVolume: number;
  timestamp: number;
}

export class BinanceWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private connectionStartTime = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastMessageTime = 0;
  private messageQueue: any[] = [];
  private processingQueue = false;
  private messageRateLimit = 10; // Increased for processing efficiency
  private lastProcessTime = 0;
  private connectionStartedAt = 0;
  private pendingReconnect = false;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(
    private onTradeData: (data: ProcessedTradeData) => void,
    private onTickerData: (data: ProcessedTickerData) => void,
    private onConnectionChange: (connected: boolean) => void,
    private onMaxReconnectAttemptsReached?: () => void
  ) {}

  connect() {
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      console.log("WebSocket already connecting or connected");
      return;
    }

    this.isConnecting = true;
    this.connectionStartTime = Date.now();
    this.connectionStartedAt = Date.now();

    console.log(
      `WebSocket connection attempt ${this.reconnectAttempts + 1}/${
        this.maxReconnectAttempts + 1
      }`
    );

    try {
      // FIXED: Use proper Binance stream format
      // For combined streams, use proper format with stream names
      const streams = [
        "btcusdt@aggTrade",
        // "ethusdt@aggTrade",
        // "btcusdt@ticker_24hr", // FIXED: Correct ticker stream name
        // "ethusdt@ticker_24hr", // FIXED: Correct ticker stream name
      ];

      // FIXED: Proper URL construction for combined streams
      const wsUrl = `wss://stream.binance.com:9443/stream?streams=btcusdt@aggTrade`;
      console.log("Connecting to:", wsUrl);

      this.ws = new WebSocket(wsUrl);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.error("WebSocket connection timeout");
          this.ws.close();
          this.handleConnectionFailure("Connection timeout");
        }
      }, 15000); // Increased timeout to 15 seconds

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        const connectionTime = Date.now() - this.connectionStartTime;
        console.log(`WebSocket connected successfully in ${connectionTime}ms`);

        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.lastMessageTime = Date.now();
        this.pendingReconnect = false;
        this.onConnectionChange(true);

        // Start heartbeat monitoring and ping
        this.startHeartbeat();
        this.startPing();
        this.schedule24HourReconnection();
      };

      this.ws.onmessage = (event) => {
        this.lastMessageTime = Date.now();

        // Handle ping/pong from server
        if (event.data === "ping") {
          console.log("Received ping from server, sending pong");
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send("pong");
          }
          return;
        }

        // Add to queue for processing
        this.messageQueue.push(event.data);
        this.processMessageQueue();
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.stopHeartbeat();
        this.stopPing();

        console.log(
          `WebSocket disconnected. Code: ${event.code}, Reason: ${
            event.reason || "No reason provided"
          }`
        );
        this.isConnecting = false;
        this.onConnectionChange(false);

        // Only attempt reconnect if it wasn't a manual close
        if (event.code !== 1000 && !this.pendingReconnect) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error("WebSocket error:", error);
        this.isConnecting = false;
        this.onConnectionChange(false);
        if (!this.pendingReconnect) {
          this.handleConnectionFailure("WebSocket error occurred");
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.isConnecting = false;
      this.handleConnectionFailure("Failed to create connection");
    }
  }

  // ADDED: Send periodic ping to keep connection alive
  private startPing() {
    this.stopPing();

    // Send ping every 3 minutes (Binance sends ping every 20s, we respond with pong)
    // We can also send our own ping to ensure connection stays alive
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log("Sending ping to server");
        this.ws.send("ping");
      }
    }, 180000); // 3 minutes
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private processMessageQueue() {
    if (this.processingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    const now = Date.now();
    const timeSinceLastProcess = now - this.lastProcessTime;
    const maxMessagesThisBatch = Math.min(
      this.messageQueue.length,
      Math.max(
        1,
        Math.floor((timeSinceLastProcess / 1000) * this.messageRateLimit)
      )
    );

    const messagesToProcess = this.messageQueue.splice(0, maxMessagesThisBatch);
    this.lastProcessTime = now;

    const processBatch = () => {
      const batchSize = 10; // Process more messages per batch
      const batch = messagesToProcess.splice(0, batchSize);

      batch.forEach((messageData) => {
        try {
          this.processMessage(messageData);
        } catch (error) {
          console.error(
            "Error processing message:",
            error,
            "Data:",
            messageData
          );
        }
      });

      if (messagesToProcess.length > 0) {
        setTimeout(processBatch, 50); // Faster processing
      } else {
        this.processingQueue = false;

        if (this.messageQueue.length > 0) {
          setTimeout(() => this.processMessageQueue(), 100);
        }
      }
    };

    processBatch();
  }

  private processMessage(messageData: string) {
    try {
      const message = JSON.parse(messageData);

      // FIXED: Handle both stream format and direct format properly
      if (message.stream && message.data) {
        // Combined stream format: {"stream":"btcusdt@aggTrade","data":{...}}
        const streamName = message.stream;
        const data = message.data;

        if (data.e === "aggTrade") {
          this.processTradeData(data);
        } else if (data.e === "24hrTicker") {
          this.processTickerData(data);
        }
      }
      // Direct format (single stream connections)
      else if (message.e) {
        console.log(`Processing direct event: ${message.e}`);

        if (message.e === "aggTrade") {
          this.processTradeData(message);
        } else if (message.e === "24hrTicker") {
          this.processTickerData(message);
        }
      } else {
        console.log("Unknown message format:", message);
      }
    } catch (error) {
      console.error(
        "Error parsing WebSocket data:",
        error,
        "Raw data:",
        messageData
      );
    }
  }

  private processTradeData(data: any) {
    const tradeData: ProcessedTradeData = {
      id: `${data.s}-${data.a}`,
      timestamp: data.T,
      symbol: data.s,
      price: parseFloat(data.p),
      quantity: parseFloat(data.q),
      side: data.m ? "SELL" : "BUY", // m=true means buyer is market maker (sell order filled)
      formattedTime: new Date(data.T).toLocaleTimeString(),
    };

    if (this.isValidTradeData(tradeData)) {
      this.onTradeData(tradeData);
    } else {
      console.warn("Invalid trade data:", tradeData);
    }
  }

  private processTickerData(data: any) {
    const tickerData: ProcessedTickerData = {
      symbol: data.s,
      price: parseFloat(data.c),
      priceChange: parseFloat(data.p),
      priceChangePercent: parseFloat(data.P),
      high: parseFloat(data.h),
      low: parseFloat(data.l),
      volume: parseFloat(data.v),
      quoteVolume: parseFloat(data.q),
      timestamp: data.E,
    };

    if (this.isValidTickerData(tickerData)) {
      this.onTickerData(tickerData);
    } else {
      console.warn("Invalid ticker data:", tickerData);
    }
  }

  private isValidTradeData(data: ProcessedTradeData): boolean {
    return !!(
      data.id &&
      data.timestamp > 0 &&
      data.symbol &&
      data.price > 0 &&
      data.quantity > 0 &&
      (data.side === "BUY" || data.side === "SELL")
    );
  }

  private isValidTickerData(data: ProcessedTickerData): boolean {
    return !!(
      data.symbol &&
      data.price > 0 &&
      data.timestamp > 0 &&
      !isNaN(data.priceChange) &&
      !isNaN(data.priceChangePercent)
    );
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      const timeSinceLastMessage = Date.now() - this.lastMessageTime;

      // Increased timeout since we have active ping/pong
      if (timeSinceLastMessage > 120000) {
        // 2 minutes
        console.warn("No messages received for 2 minutes, reconnecting...");
        this.disconnect();
        this.attemptReconnect();
      }
    }, 30000); // Check every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private schedule24HourReconnection() {
    setTimeout(() => {
      if (this.isConnected()) {
        console.log("Proactive reconnection after 23.5 hours");
        this.disconnect();
        setTimeout(() => {
          this.connect();
        }, 1000);
      }
    }, 23.5 * 60 * 60 * 1000);
  }

  private handleConnectionFailure(reason: string) {
    console.error(`Connection failed: ${reason}`);
    if (!this.pendingReconnect) {
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.pendingReconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      if (this.onMaxReconnectAttemptsReached) {
        this.onMaxReconnectAttemptsReached();
      }
      return;
    }

    this.pendingReconnect = true;
    this.reconnectAttempts++;

    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    );

    console.log(
      `Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );

    setTimeout(() => {
      this.pendingReconnect = false;
      if (!this.isConnected()) {
        console.log(
          `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );
        this.connect();
      }
    }, delay);
  }

  disconnect() {
    console.log("Disconnecting WebSocket...");
    this.stopHeartbeat();
    this.stopPing();
    this.pendingReconnect = false;

    this.messageQueue = [];
    this.processingQueue = false;

    if (this.ws) {
      this.ws.close(1000, "Manual disconnect");
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionInfo() {
    return {
      readyState: this.ws?.readyState,
      readyStateText: this.getReadyStateText(),
      reconnectAttempts: this.reconnectAttempts,
      isConnecting: this.isConnecting,
      lastMessageTime: this.lastMessageTime,
      timeSinceLastMessage: Date.now() - this.lastMessageTime,
      queueLength: this.messageQueue.length,
      processingQueue: this.processingQueue,
      connectionAge: this.connectionStartedAt
        ? Date.now() - this.connectionStartedAt
        : 0,
      pendingReconnect: this.pendingReconnect,
    };
  }

  private getReadyStateText(): string {
    if (!this.ws) return "No WebSocket";

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "CONNECTING";
      case WebSocket.OPEN:
        return "OPEN";
      case WebSocket.CLOSING:
        return "CLOSING";
      case WebSocket.CLOSED:
        return "CLOSED";
      default:
        return "UNKNOWN";
    }
  }

  getPerformanceStats() {
    return {
      messageQueueLength: this.messageQueue.length,
      isProcessingQueue: this.processingQueue,
      lastProcessTime: this.lastProcessTime,
      messageRateLimit: this.messageRateLimit,
      connectionUptime: this.connectionStartedAt
        ? Date.now() - this.connectionStartedAt
        : 0,
      messagesPerSecond: this.calculateMessageRate(),
    };
  }

  private calculateMessageRate(): number {
    const uptime = this.connectionStartedAt
      ? (Date.now() - this.connectionStartedAt) / 1000
      : 0;
    return uptime > 0 ? this.messageQueue.length / uptime : 0;
  }

  // Method to test with a single stream first
  connectSingleStream(
    symbol: string = "btcusdt",
    streamType: string = "ticker"
  ) {
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      console.log("WebSocket already connecting or connected");
      return;
    }

    this.isConnecting = true;
    this.connectionStartTime = Date.now();
    this.connectionStartedAt = Date.now();

    const stream =
      streamType === "ticker" ? `${symbol}@ticker_24hr` : `${symbol}@aggTrade`;
    const wsUrl = `wss://stream.binance.com:9443/ws/${stream}`;

    console.log("Connecting to single stream:", wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("Single stream connected successfully");
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.lastMessageTime = Date.now();
      this.onConnectionChange(true);
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      this.lastMessageTime = Date.now();

      if (event.data === "ping") {
        this.ws?.send("pong");
        return;
      }

      try {
        const data = JSON.parse(event.data);
        console.log("Received data:", data);

        if (data.e === "aggTrade") {
          this.processTradeData(data);
        } else if (data.e === "24hrTicker") {
          this.processTickerData(data);
        }
      } catch (error) {
        console.error("Error processing single stream message:", error);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`Single stream disconnected. Code: ${event.code}`);
      this.isConnecting = false;
      this.onConnectionChange(false);
    };

    this.ws.onerror = (error) => {
      console.error("Single stream error:", error);
      this.isConnecting = false;
      this.onConnectionChange(false);
    };
  }
}
