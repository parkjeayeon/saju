import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { GreetingHandler } from './handlers/greeting.handler';
import { randomUUID } from 'crypto';

@Injectable()
export class McpService implements OnModuleDestroy {
  private readonly logger = new Logger(McpService.name);
  private readonly sessions = new Map<
    string,
    {
      server: McpServer;
      transport: StreamableHTTPServerTransport;
      lastActivity: Date;
    }
  >();

  constructor(private readonly greetingHandler: GreetingHandler) {
    // 30분마다 세션 정리
    setInterval(() => this.cleanupStaleSessions(), 30 * 60 * 1000);
  }

  async handleStreamableConnection(req: Request, res: Response) {
    const sessionId = (req.headers['mcp-session-id'] as string) || randomUUID();

    // 기존 세션 재사용
    if (this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      session.lastActivity = new Date();
      this.logger.log(`♻️ Reusing session: ${sessionId}`);
      await session.transport.handleRequest(req, res);
      return;
    }

    // 새 세션 생성
    this.logger.log(`🆕 Creating session: ${sessionId}`);

    const server = new McpServer({
      name: 'nestjs-mcp-demo',
      version: '1.0.0',
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
    });

    transport.onclose = () => {
      this.logger.log(`🔒 Session closed: ${sessionId}`);
      this.sessions.delete(sessionId);
    };

    try {
      // 🔥 Handler 등록 (connect 전에!)
      await this.greetingHandler.register(server);

      // 서버 연결
      await server.connect(transport);

      // 세션 저장
      this.sessions.set(sessionId, {
        server,
        transport,
        lastActivity: new Date(),
      });

      // 요청 처리
      await transport.handleRequest(req, res);

      this.logger.log(
        `✅ Session active: ${sessionId} (Total: ${this.sessions.size})`,
      );
    } catch (error) {
      this.logger.error(`❌ Session failed: ${sessionId}`, error);
      this.sessions.delete(sessionId);
      throw error;
    }
  }

  private cleanupStaleSessions() {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30분
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > timeout) {
        this.logger.log(`🗑️ Cleaning session: ${sessionId}`);
        session.transport.close();
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(
        `🧹 Cleaned ${cleaned} sessions (Active: ${this.sessions.size})`,
      );
    }
  }

  onModuleDestroy() {
    this.logger.log('🛑 Closing all sessions...');
    for (const [sessionId, { transport }] of this.sessions) {
      this.logger.log(`🔒 Closing session: ${sessionId}`);
      transport.close();
    }
    this.sessions.clear();
  }
}
