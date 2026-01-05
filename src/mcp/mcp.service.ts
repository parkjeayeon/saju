// src/mcp/mcp.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { GreetingHandler } from './handlers/greeting.handler';
import { randomUUID } from 'crypto';

@Injectable()
export class McpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(McpService.name);
  private transports = new Map<
      string,
      {
        server: McpServer;
        transport: StreamableHTTPServerTransport;
        lastActivity: Date;
      }
  >();

  constructor(private readonly greetingHandler: GreetingHandler) {}

  async onModuleInit() {
    this.logger.log('🚀 MCP Service initializing...');

    // 세션 정리 (10분마다)
    setInterval(() => this.cleanupStaleSessions(), 10 * 60 * 1000);

    this.logger.log('✅ MCP Service ready');
  }

  async handleStreamableConnection(req: Request, res: Response) {
    const existingSessionId = req.headers['mcp-session-id'] as string;

    // 기존 세션이 있으면 재사용
    if (existingSessionId && this.transports.has(existingSessionId)) {
      const session = this.transports.get(existingSessionId)!;
      session.lastActivity = new Date();

      this.logger.log(`♻️ Reusing session: ${existingSessionId}`);

      await session.transport.handleRequest(req, res);
      return;
    }

    // 새 세션 생성
    const sessionId = randomUUID();
    this.logger.log(`🆕 Creating new session: ${sessionId}`);

    // MCP 서버 생성
    const server = this.createMcpServer();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
    });

    // transport close 핸들러
    transport.onclose = () => {
      this.logger.log(`🔒 Transport closed: ${sessionId}`);
      this.transports.delete(sessionId);
    };

    try {
      // 🔧 CRITICAL: connect() 전에 핸들러 등록!
      await this.greetingHandler.register(server);
      this.logger.log(`✅ Handlers registered for session: ${sessionId}`);

      // 서버와 transport 연결
      await server.connect(transport);
      this.logger.log(`🔗 Server connected: ${sessionId}`);

      // 세션 저장
      this.transports.set(sessionId, {
        server,
        transport,
        lastActivity: new Date(),
      });

      // 요청 처리
      await transport.handleRequest(req, res);
      this.logger.log(`✅ Request handled: ${sessionId}`);

      // 세션 정보 로깅
      this.logger.log(`📊 Active sessions: ${this.transports.size}`);
    } catch (error) {
      this.logger.error(`❌ Connection failed: ${sessionId}`, error.stack);
      this.transports.delete(sessionId);

      // 에러 응답
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: `MCP initialization failed: ${error.message}`,
          },
          id: null,
        });
      }
      throw error;
    }
  }

  private createMcpServer(): McpServer {
    // McpServer 생성 (capabilities는 registerResource/Tool에서 자동 설정됨)
    const server = new McpServer(
        {
          name: 'nestjs-mcp-demo',
          version: '1.0.0',
        },
        {
          capabilities: {}, // 빈 객체 - registerResource/Tool이 자동으로 채움
        },
    );

    this.logger.log('🔧 McpServer created');

    return server;
  }

  private cleanupStaleSessions() {
    const now = new Date();
    const timeout = 30 * 60 * 1000; // 30분

    let cleaned = 0;

    for (const [sessionId, session] of this.transports.entries()) {
      const timeSinceLastActivity =
          now.getTime() - session.lastActivity.getTime();

      if (timeSinceLastActivity > timeout) {
        this.logger.log(`🗑️ Cleaning up stale session: ${sessionId}`);
        session.transport.close();
        this.transports.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`🧹 Cleaned up ${cleaned} stale session(s)`);
    }

    this.logger.log(`📊 Active sessions: ${this.transports.size}`);
  }

  onModuleDestroy() {
    this.logger.log('🛑 Closing all sessions...');

    for (const [sessionId, { transport }] of this.transports.entries()) {
      this.logger.log(`🔒 Closing session: ${sessionId}`);
      transport.close();
      this.transports.delete(sessionId);
    }

    this.logger.log('✅ All sessions closed');
  }
}