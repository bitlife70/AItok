export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;

export abstract class JsonRpcClient {
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (result: any) => void;
    reject: (error: JsonRpcError) => void;
    timeout: NodeJS.Timeout;
  }>();

  protected requestTimeout = 30000; // 30 seconds

  protected abstract sendMessage(message: JsonRpcMessage): Promise<void>;
  protected abstract onNotification(notification: JsonRpcNotification): void;

  protected handleMessage(message: JsonRpcMessage): void {
    if ('id' in message) {
      // Response
      const response = message as JsonRpcResponse;
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);
        
        if (response.error) {
          pending.reject(response.error);
        } else {
          pending.resolve(response.result);
        }
      }
    } else {
      // Notification
      const notification = message as JsonRpcNotification;
      this.onNotification(notification);
    }
  }

  protected async request(method: string, params?: any): Promise<any> {
    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject({
          code: -32603,
          message: `Request timeout: ${method}`
        } as JsonRpcError);
      }, this.requestTimeout);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      
      this.sendMessage(request).catch(error => {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      });
    });
  }

  protected async notify(method: string, params?: any): Promise<void> {
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params
    };

    await this.sendMessage(notification);
  }

  public disconnect(): void {
    // Clear all pending requests
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject({
        code: -32603,
        message: 'Connection closed'
      } as JsonRpcError);
    }
    this.pendingRequests.clear();
  }
}