import { Injectable, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';

@Injectable()
export class GreetingHandler {
  private readonly logger = new Logger(GreetingHandler.name);
  private readonly nextjsUrl = process.env.NEXTJS_URL || 'https://refhubs.com';
  private readonly htmlCache = new Map<string, string>();

  async register(server: McpServer) {
    this.registerResources(server);
    this.registerTools(server);
    this.logger.log('✅ All handlers registered');
  }

  private registerResources(server: McpServer) {
    // Greet Widget Resource (기본 템플릿)
    server.registerResource(
      'greet-widget-ko',
      'ui://widget/greet-template-ko.html',
      {
        title: '인사하기 (한국어)',
        description: '사용자에게 한국어로 인사를 합니다',
        mimeType: 'text/html+skybridge',
        _meta: {
          'openai/widgetDescription': '사용자에게 한국어로 인사를 합니다',
          'openai/widgetPrefersBorder': true,
          'openai/widgetCSP': {
            connect_domains: [this.nextjsUrl],
            resource_domains: [this.nextjsUrl],
          },
        },
      },
      async (uri) => {
        const html = await this.fetchNextWidget('/widgets/greet');
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/html+skybridge',
              text: html,
            },
          ],
        };
      },
    );

    // Calculate Widget Resource (기본 템플릿)
    server.registerResource(
      'calculate-widget-ko',
      'ui://widget/calculate-template-ko.html',
      {
        title: '계산기 (한국어)',
        description: '간단한 수학 계산을 수행합니다',
        mimeType: 'text/html+skybridge',
        _meta: {
          'openai/widgetDescription': '간단한 수학 계산을 수행합니다',
          'openai/widgetPrefersBorder': true,
          'openai/widgetCSP': {
            connect_domains: [this.nextjsUrl],
            resource_domains: [this.nextjsUrl],
          },
        },
      },
      async (uri) => {
        const html = await this.fetchNextWidget('/widgets/calculate');
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/html+skybridge',
              text: html,
            },
          ],
        };
      },
    );

    this.logger.log('✅ Resources registered');
  }

  private registerTools(server: McpServer) {
    // Greet Tool
    server.registerTool(
      'greet-ko',
      {
        title: '인사하기 (한국어)',
        description: '사용자에게 한국어로 인사를 합니다',
        inputSchema: {
          name: z.string().describe('인사할 사람의 이름'),
          language: z.enum(['en', 'ko']).default('ko'),
        },
        _meta: {
          'openai/outputTemplate': 'ui://widget/greet-template-ko.html',
          'openai/toolInvocation/invoking': '인사 준비 중...',
          'openai/toolInvocation/invoked': '인사 완료!',
          'openai/WidgetAccessible': true,
        },
      },
      async ({ name, language = 'ko' }) => {
        const greetings = {
          ko: `안녕하세요, ${name}님! 만나서 반갑습니다! 🎉`,
          en: `Hello, ${name}! Nice to meet you! 🎉`,
        };

        const toolData = {
          name,
          language,
          greeting: greetings[language],
        };

        const metadata = {
          timestamp: new Date().toISOString(),
        };

        return {
          structuredContent: {
            ...toolData,
            ...metadata,
          },
          content: [{ type: 'text' as const, text: greetings[language] }],
        };
      },
    );

    // Calculate Tool
    server.registerTool(
      'calculate-ko',
      {
        title: '계산기 (한국어)',
        description: '간단한 수학 계산을 수행합니다',
        inputSchema: {
          operation: z
            .enum(['add', 'subtract', 'multiply', 'divide'])
            .describe('연산 종류'),
          a: z.number().describe('첫 번째 숫자'),
          b: z.number().describe('두 번째 숫자'),
        },
        _meta: {
          'openai/outputTemplate': 'ui://widget/calculate-template-ko.html',
          'openai/toolInvocation/invoking': '계산 중...',
          'openai/toolInvocation/invoked': '계산 완료!',
          'openai/WidgetAccessible': true,
        },
      },
      async ({ operation, a, b }) => {
        let result: number;
        let symbol: string;

        switch (operation) {
          case 'add':
            result = a + b;
            symbol = '+';
            break;
          case 'subtract':
            result = a - b;
            symbol = '-';
            break;
          case 'multiply':
            result = a * b;
            symbol = '×';
            break;
          case 'divide':
            if (b === 0) {
              return {
                content: [
                  { type: 'text' as const, text: '❌ 0으로 나눌 수 없습니다!' },
                ],
                isError: true,
              };
            }
            result = a / b;
            symbol = '÷';
            break;
          default:
            result = 0;
            symbol = '?';
        }

        const toolData = {
          operation,
          a,
          b,
          result,
        };

        const metadata = {
          symbol,
          operationLabel: this.getOperationLabel(operation),
          timestamp: new Date().toISOString(),
        };

        return {
          structuredContent: {
            ...toolData,
            ...metadata,
          },
          content: [
            {
              type: 'text' as const,
              text: `🧮 ${a} ${symbol} ${b} = ${result}`,
            },
          ],
        };
      },
    );

    this.logger.log('✅ Tools registered');
  }

  /**
   * Next.js에서 HTML 가져오기 (캐싱 포함)
   */
  private async fetchNextWidget(path: string): Promise<string> {
    // 캐시 확인
    if (this.htmlCache.has(path)) {
      this.logger.log(`💾 Cache hit: ${path}`);
      return this.htmlCache.get(path)!;
    }

    try {
      const url = `${this.nextjsUrl}${path}`;
      this.logger.log(`🌐 Fetching: ${url}`);

      const response = await axios.get(url, {
        timeout: 5000,
        headers: { Accept: 'text/html' },
      });

      const html = response.data;

      // 캐싱 (개발 환경에서는 캐시 비활성화 가능)
      if (process.env.NODE_ENV === 'production') {
        this.htmlCache.set(path, html);
      }

      this.logger.log(`✅ Loaded ${path} (${html.length} bytes)`);
      return html;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch ${path}: ${error.message}`);
      return this.getFallbackHtml(path);
    }
  }

  /**
   * Fallback HTML
   */
  private getFallbackHtml(path: string): string {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Widget Error</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
  <div class="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">⚠️ Widget Loading Failed</h2>
      <p class="text-gray-600">Unable to load: ${path}</p>
    </div>
    
    <div class="bg-blue-50 rounded-lg p-4">
      <h3 class="font-semibold text-blue-900 mb-2">Debug Info:</h3>
      <pre id="debug-data" class="text-xs text-blue-800 overflow-auto"></pre>
    </div>
    
    <script>
      // window.openai 시뮬레이션
      if (typeof window.openai === 'undefined') {
        window.openai = {
          toolOutput: { error: 'Widget failed to load' },
          toolResponseMetadata: {}
        };
      }
      
      document.getElementById('debug-data').textContent = JSON.stringify({
        toolOutput: window.openai.toolOutput,
        metadata: window.openai.toolResponseMetadata,
        path: '${path}'
      }, null, 2);
    </script>
  </div>
</body>
</html>`;
  }

  private getOperationLabel(operation: string): string {
    const labels = {
      add: '더하기',
      subtract: '빼기',
      multiply: '곱하기',
      divide: '나누기',
    };
    return labels[operation] || '계산';
  }
}
