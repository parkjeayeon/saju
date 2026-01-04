// src/mcp/mcp.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { GreetingHandler } from './handlers/greeting.handler';
import { randomUUID } from 'crypto';

@Injectable()
export class McpService implements OnModuleDestroy {
  private transports = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

  constructor(
      private readonly greetingHandler: GreetingHandler,
  ) {
    setInterval(() => this.cleanupStaleSessions(), 10 * 60 * 1000);
  }

  async handleStreamableConnection(req: Request, res: Response) {
    const existingSessionId = req.headers['mcp-session-id'] as string;

    // 기존 세션이 있으면 재사용
    if (existingSessionId && this.transports.has(existingSessionId)) {
      const { transport } = this.transports.get(existingSessionId)!;
      await transport.handleRequest(req, res);
      return;
    }

    // 새 세션 생성
    const sessionId = randomUUID();
    const server = this.createMcpServer();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
    });

    console.log(`[MCP] Creating new session: ${sessionId}`);

    // transport close 핸들러
    transport.onclose = () => {
      console.log(`[MCP] Transport closed: ${sessionId}`);
      this.transports.delete(sessionId);
    };

    try {
      // 1. 먼저 서버와 transport 연결
      await server.connect(transport);
      console.log(`[MCP] Server connected: ${sessionId}`);

      // 2. 세션 저장
      this.transports.set(sessionId, { server, transport });

      // 3. 요청 처리
      await transport.handleRequest(req, res);
      console.log(`[MCP] Request handled: ${sessionId}`);
    } catch (error) {
      console.error(`[MCP] Connection failed: ${sessionId}`, error);
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
    const server = new McpServer({
      name: 'nestjs-mcp-demo',
      version: '1.0.0',
    });

    // 모든 핸들러 등록
    this.greetingHandler.register(server);
    // this.webScraperHandler.register(server);

    console.log('[MCP] Server created with handlers registered');
    return server;
  }

  private cleanupStaleSessions() {
    console.log(`[MCP] Active sessions: ${this.transports.size}`);
  }

  onModuleDestroy() {
    console.log('[MCP] Closing all sessions...');
    for (const [sessionId, { transport }] of this.transports.entries()) {
      transport.close();
      this.transports.delete(sessionId);
    }
  }
}