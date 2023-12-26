import { ServerWebSocket } from 'bun';

export type WebSocketData = {
  id: string;
};

export type WebSocket = ServerWebSocket<WebSocketData>;

export interface Client {
  id: string;
  isAlive: boolean;
  ws: WebSocket;
}
