import app from '@/app';
import Controller from '@/controllers/base';
import { Client, WebSocket } from '@/types';
import { Server } from 'bun';

class WebsocketController extends Controller {
  clients: Record<string, Client> = {};

  upgrade(req: Request, server: Server) {
    this.logger.info('Client requesting upgrade');
    if (
      server.upgrade(req, {
        data: {
          id: crypto.randomUUID()
        }
      })
    ) {
      return new Response('Upgrade successful', {
        status: 101
      });
    }
    return new Response('Upgrade failed :(', { status: 500 });
  }

  open(ws: WebSocket) {
    this.logger.info('Client connected', ws.data.id);
    this.clients[ws.data.id] = {
      id: ws.data.id,
      isAlive: true,
      ws
    };
  }

  close(ws: WebSocket) {
    this.logger.info('Client disconnected', ws.data.id);
    delete this.clients[ws.data.id];
  }

  message(ws: WebSocket, message: string) {
    const payload = JSON.parse(message as string);
    if (app.debug) this.logger.debug('Message received from', ws.data.id, payload);
    //   app.handlers.forEach((handler) handler.listen(ws, payload));
  }

  pong(ws: WebSocket) {
    if (app.debug) this.logger.debug('Pong received from', ws.data.id);
    const client = this.clients[ws.data.id];
    if (!client) return;
    this.clients[ws.data.id].isAlive = true;
  }

  exec(handler: (client: Client) => void) {
    Object.values(this.clients).forEach(handler);
  }

  send(client: Client, payload: unknown) {
    client.ws.send(JSON.stringify(payload));
  }

  broadcast(payload: unknown) {
    this.exec((client) => this.send(client, payload));
  }

  disconnect(clientId: Client['id']) {
    const client = this.clients[clientId];
    if (!client) return;
    try {
      client.ws.close();
    } catch (e) {
      // Ignore
    }
    delete this.clients[clientId];
  }
}

export default new WebsocketController();
