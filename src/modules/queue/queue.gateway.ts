import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { QueueService } from './queue.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'queue',
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(QueueGateway.name);

  constructor(private readonly queueService: QueueService) {}

  handleConnection(client: Socket) {
    this.logger.log(`⚡ [Socket Connected] Client ID: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 [Socket Disconnected] Client ID: ${client.id}`);
  }

  @SubscribeMessage('joinQueue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { doctorClinicId: number; date?: string; mode?: 'DISPLAY' | 'STAFF' | 'PATIENT' },
  ) {
    const doctorClinicId = data.doctorClinicId;
    const date = data.date || new Date().toISOString().slice(0, 10);
    const room = `queue_${doctorClinicId}_${date}`;

    client.join(room);
    this.logger.log(`📡 Client ${client.id} joined room ${room} [Mode: ${data.mode || 'DISPLAY'}]`);

    // Send initial snapshot
    const state = await this.queueService.getSessionState(doctorClinicId, date);
    client.emit('queueSnapshot', this.filterStateForMode(state, data.mode));
    return { status: 'joined', room };
  }

  @SubscribeMessage('leaveQueue')
  handleLeaveQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { doctorClinicId: number; date?: string },
  ) {
    const room = `queue_${data.doctorClinicId}_${data.date || new Date().toISOString().slice(0, 10)}`;
    client.leave(room);
    return { status: 'left', room };
  }

  // Helper broadcast called by service or actions
  async broadcastQueueUpdate(doctorClinicId: number, date: string, eventName: string, payload: any) {
    const room = `queue_${doctorClinicId}_${date}`;
    if (this.server) {
      this.server.to(room).emit(eventName, payload);
      this.logger.log(`📢 [Broadcast -> ${room}] Event: ${eventName}`);
    }
  }

  private filterStateForMode(state: any, mode?: string) {
    if (mode === 'STAFF') {
      return state;
    }
    // Public TV display or Patient app mode: Mask PII (Personal Identifiable Information)
    const sanitizedWaiting = state.waitingTokens?.map((t: any) => ({
      id: t.id,
      tokenNumber: t.tokenNumber,
      tokenPrefix: t.tokenPrefix,
      tokenDisplay: `${t.tokenPrefix}-${t.tokenNumber}`,
      priority: t.priority,
      status: t.status,
    }));

    return {
      session: {
        id: state.session?.id,
        status: state.session?.status,
        version: state.session?.version,
      },
      currentToken: state.currentToken ? {
        id: state.currentToken.id,
        tokenNumber: state.currentToken.tokenNumber,
        tokenPrefix: state.currentToken.tokenPrefix,
        tokenDisplay: `${state.currentToken.tokenPrefix}-${state.currentToken.tokenNumber}`,
        status: state.currentToken.status,
      } : null,
      waitingCount: state.waitingCount,
      waitingTokens: sanitizedWaiting,
      calledToken: state.calledToken ? {
        tokenDisplay: `${state.calledToken.tokenPrefix}-${state.calledToken.tokenNumber}`,
        status: state.calledToken.status,
      } : null,
      totalTokens: state.totalTokens,
    };
  }
}
