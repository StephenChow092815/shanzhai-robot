import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`[Socket] 客户端连接: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[Socket] 客户端断开: ${client.id}`);
  }

  /**
   * Broadcast a volatility alert to all connected clients
   */
  broadcastVolatility(data: {
    symbol: string;
    change: number;
    price: number;
    direction: 'up' | 'down';
    timestamp: string;
  }) {
    this.logger.log(`[Socket] 播报波动预警: ${data.symbol} (${data.change}%)`);
    this.server.emit('volatility_pulse', data);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket, data: any) {
    return { event: 'pong', data: 'alive' };
  }
}
