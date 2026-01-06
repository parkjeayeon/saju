import { Injectable, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';

@Injectable()
export class GreetingHandler {
  private readonly logger = new Logger(GreetingHandler.name);
  private readonly nextjsUrl = process.env.NEXTJS_URL || 'https://refhubs.com';

  async register(server: McpServer) {
    this.registerResources(server);
    this.registerTools(server);
    this.logger.log('✅ All handlers registered');
  }

  private registerResources(server: McpServer) {
    // Greet Widget Resource
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
          'openai/widgetDomain': 'https://chatgpt.com',
          'openai/widgetCSP': {
            connect_domains: ['https://chatgpt.com', this.nextjsUrl],
            resource_domains: [
              'https://*.oaistatic.com',
              this.nextjsUrl,
              'https://cdn.tailwindcss.com',
            ],
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

    // Calculate Widget Resource
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
          'openai/widgetDomain': 'https://chatgpt.com',
          'openai/widgetCSP': {
            connect_domains: ['https://chatgpt.com', this.nextjsUrl],
            resource_domains: [
              'https://*.oaistatic.com',
              this.nextjsUrl,
              'https://cdn.tailwindcss.com',
            ],
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
          'openai/widgetAccessible': false,
          'openai/resultCanProduceWidget': true,
        },
      },
      async ({ name, language = 'ko' }) => {
        const greetings = {
          ko: `안녕하세요, ${name}님! 만나서 반갑습니다! 🎉`,
          en: `Hello, ${name}! Nice to meet you! 🎉`,
        };

        return {
          structuredContent: {
            name,
            language,
            greeting: greetings[language],
          },
          content: [{ type: 'text' as const, text: greetings[language] }],
          _meta: {
            timestamp: new Date().toISOString(),
          },
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
          'openai/widgetAccessible': false,
          'openai/resultCanProduceWidget': true,
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

        return {
          structuredContent: { operation, a, b, result },
          content: [
            {
              type: 'text' as const,
              text: `🧮 ${a} ${symbol} ${b} = ${result}`,
            },
          ],
          _meta: {
            symbol,
            operationLabel: this.getOperationLabel(operation),
            timestamp: new Date().toISOString(),
          },
        };
      },
    );

    this.logger.log('✅ Tools registered');
  }

  // Next.js에서 HTML 가져오기
  private async fetchNextWidget(path: string): Promise<string> {
    try {
      const url = `${this.nextjsUrl}${path}`;
      this.logger.log(`🌐 Fetching: ${url}`);

      const response = await axios.get(url, {
        timeout: 10000,
        headers: { Accept: 'text/html' },
      });

      this.logger.log(`✅ Loaded (${response.data.length} bytes)`);
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch: ${error.message}`);
      return this.getFallbackHtml();
    }
  }

  // Fallback HTML
  private getFallbackHtml(): string {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Widget Error</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
  <div class="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full">
    <h2 class="text-2xl font-bold mb-4">⚠️ Widget Loading Failed</h2>
    <p class="text-gray-600">Unable to load widget from Next.js server.</p>
    <div id="result" class="mt-4 p-4 bg-blue-50 rounded">
      <pre id="data"></pre>
    </div>
    <script>
      const data = window.openai?.toolOutput || {};
      document.getElementById('data').textContent = JSON.stringify(data, null, 2);
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
