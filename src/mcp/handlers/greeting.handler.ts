import { Injectable, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';
type ContentWidget = {
  templateUri: string;
  invoking: string;
  invoked: string;
};
@Injectable()
export class GreetingHandler {
  private readonly logger = new Logger(GreetingHandler.name);
  private readonly nextjsUrl = process.env.NEXTJS_URL || 'https://refhubs.com';
  private readonly htmlCache = new Map<string, string>();

  async register(server: McpServer) {
    await this.registerGreeting(server);
    await this.registerCalculation(server);
    this.logger.log('✅ All handlers registered');
  }

  private async registerGreeting(server: McpServer) {
    const widgetKo = {
      templateUri: 'ui://widget/greet-template-ko.html',
      invoking: '인사 준비 중...',
      invoked: '인사 완료!',
      registerResourceId: 'greet-widget-ko',
      title: '인사하기 (한국어)',
      description: '사용자에게 한국어로 인사를 합니다',
    };
    server.registerResource(
      widgetKo.registerResourceId,
      widgetKo.templateUri,
      {
        title: widgetKo.title,
        description: widgetKo.description,
        mimeType: 'text/html+skybridge',
        _meta: {
          'openai/widgetDescription': widgetKo.description,
          'openai/widgetPrefersBorder': true,
          'openai/widgetCSP': {
            connect_domains: [this.nextjsUrl],
            resource_domains: [this.nextjsUrl],
          },
        },
      },
      async (uri) => {
        const html = await this.fetchNextWidget('/widgets/greet', 'ko');
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/html+skybridge',
              text: html,
              _meta: {
                'openai/widgetDescription': widgetKo.description,
                'openai/widgetPrefersBorder': true,
                'openai/widgetDomain': this.nextjsUrl,
                'openai/widgetCSP': {
                  connect_domains: [this.nextjsUrl],
                  resource_domains: [this.nextjsUrl],
                },
              },
            },
          ],
        };
      },
    );

    server.registerTool(
      'greet-ko',
      {
        title: widgetKo.title,
        description: widgetKo.description,
        inputSchema: {
          name: z.string().describe('인사할 사람의 이름'),
          language: z.enum(['ko']).default('ko'),
        },
        _meta: {
          'openai/outputTemplate': widgetKo.templateUri,
          'openai/toolInvocation/invoking': widgetKo.invoking,
          'openai/toolInvocation/invoked': widgetKo.invoked,
          'openai/WidgetAccessible': true,
        },
      },
      async ({ name, language = 'ko' }) => {
        const greeting = `안녕하세요, ${name}님! 만나서 반갑습니다! 🎉`;
        console.log('greetings-language::', language);
        const toolData = {
          name,
          language,
          greeting,
        };

        const metadata = {
          timestamp: new Date().toISOString(),
        };

        return {
          structuredContent: {
            ...toolData,
            ...metadata,
          },
          content: [{ type: 'text' as const, text: greeting }],
          _meta: this.widgetMeta({
            templateUri: widgetKo.templateUri,
            invoking: widgetKo.invoking,
            invoked: widgetKo.invoked,
          }),
        };
      },
    );

    const widgetEn = {
      templateUri: 'ui://widget/greet-template-en.html',
      invoking: 'Saying hello...',
      invoked: 'ready to say hello',
      registerResourceId: 'greet-widget-en',
      title: 'hello (English)',
      description: 'say hello to user',
    };
    server.registerResource(
      widgetEn.registerResourceId,
      widgetEn.templateUri,
      {
        title: widgetEn.title,
        description: widgetEn.description,
        mimeType: 'text/html+skybridge',
        _meta: {
          'openai/widgetDescription': widgetEn.description,
          'openai/widgetPrefersBorder': true,
          'openai/widgetCSP': {
            connect_domains: [this.nextjsUrl],
            resource_domains: [this.nextjsUrl],
          },
        },
      },
      async (uri) => {
        const html = await this.fetchNextWidget('/widgets/greet', 'en');
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/html+skybridge',
              text: html,
              _meta: {
                'openai/widgetDescription': widgetEn.description,
                'openai/widgetPrefersBorder': true,
                'openai/widgetDomain': this.nextjsUrl,
                'openai/widgetCSP': {
                  connect_domains: [this.nextjsUrl],
                  resource_domains: [this.nextjsUrl],
                },
              },
            },
          ],
        };
      },
    );

    server.registerTool(
      'greet-en',
      {
        title: widgetEn.title,
        description: widgetEn.description,
        inputSchema: {
          name: z.string().describe('Name of the person to greet'),
          language: z.enum(['en']).default('en'),
        },
        _meta: {
          'openai/outputTemplate': widgetEn.templateUri,
          'openai/toolInvocation/invoking': widgetEn.invoking,
          'openai/toolInvocation/invoked': widgetEn.invoked,
          'openai/WidgetAccessible': true,
        },
      },
      async ({ name, language = 'en' }) => {
        const greeting = `hello, ${name}! nice to meet you! 🎉`;
        console.log('greetings-language::', language);
        const toolData = {
          name,
          language,
          greeting,
        };

        const metadata = {
          timestamp: new Date().toISOString(),
        };

        return {
          structuredContent: {
            ...toolData,
            ...metadata,
          },
          content: [{ type: 'text' as const, text: greeting }],
          _meta: this.widgetMeta({
            templateUri: widgetEn.templateUri,
            invoking: widgetEn.invoking,
            invoked: widgetEn.invoked,
          }),
        };
      },
    );

    this.logger.log('✅ Greeting registered');
  }

  private async registerCalculation(server: McpServer) {
    const widgetKo = {
      templateUri: 'ui://widget/calculate-template-ko.html',
      invoking: '계산 중...',
      invoked: '계산 완료!',
      registerResourceId: 'calculate-widget-ko',
      title: '계산기 (한국어)',
      description: '간단한 수학 계산을 수행합니다',
    };
    const widgetEn = {
      templateUri: 'ui://widget/calculate-template-en.html',
      invoking: 'preparing calculation',
      invoked: 'ready to calculate',
      registerResourceId: 'calculate-widget-en',
      title: 'calculator (English)',
      description: 'Doing a simple calculation',
    };

    server.registerResource(
      widgetKo.registerResourceId,
      widgetKo.templateUri,
      {
        title: widgetKo.title,
        description: widgetKo.description,
        mimeType: 'text/html+skybridge',
        _meta: {
          'openai/widgetDescription': widgetKo.description,
          'openai/widgetPrefersBorder': true,
          'openai/widgetCSP': {
            connect_domains: [this.nextjsUrl],
            resource_domains: [this.nextjsUrl],
          },
        },
      },
      async (uri) => {
        const html = await this.fetchNextWidget('/widgets/calculate', 'ko');
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/html+skybridge',
              text: html,
              _meta: {
                'openai/widgetDescription': widgetKo.description,
                'openai/widgetPrefersBorder': true,
                'openai/widgetDomain': this.nextjsUrl,
                'openai/widgetCSP': {
                  connect_domains: [this.nextjsUrl],
                  resource_domains: [this.nextjsUrl],
                },
              },
            },
          ],
        };
      },
    );
    server.registerTool(
      'calculate-ko',
      {
        title: widgetKo.title,
        description: widgetKo.description,
        inputSchema: {
          language: z.enum(['ko']).default('ko'),
          operation: z
            .enum(['add', 'subtract', 'multiply', 'divide'])
            .describe('연산 종류'),
          a: z.number().describe('첫 번째 숫자'),
          b: z.number().describe('두 번째 숫자'),
        },
        _meta: {
          'openai/outputTemplate': 'ui://widget/calculate-template-ko.html',
          'openai/toolInvocation/invoking': widgetKo.invoking,
          'openai/toolInvocation/invoked': widgetKo.invoked,
          'openai/WidgetAccessible': true,
        },
      },
      async ({ operation, language, a, b }) => {
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
          language,
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
    console.log(this.nextjsUrl);
    server.registerResource(
      widgetEn.registerResourceId,
      widgetEn.templateUri,
      {
        title: widgetEn.title,
        description: widgetEn.description,
        mimeType: 'text/html+skybridge',
        _meta: {
          'openai/widgetDescription': widgetEn.description,
          'openai/widgetPrefersBorder': true,
          'openai/widgetCSP': {
            connect_domains: [this.nextjsUrl],
            resource_domains: [this.nextjsUrl],
          },
        },
      },
      async (uri) => {
        const html = await this.fetchNextWidget('/widgets/calculate', 'en');
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/html+skybridge',
              text: html,
              _meta: {
                'openai/widgetDescription': widgetEn.description,
                'openai/widgetPrefersBorder': true,
                'openai/widgetDomain': [this.nextjsUrl],
                'openai/widgetCSP': {
                  connect_domains: [this.nextjsUrl],
                  resource_domains: [this.nextjsUrl],
                },
              },
            },
          ],
        };
      },
    );
    server.registerTool(
      'calculate-en',
      {
        title: widgetEn.title,
        description: widgetEn.description,
        inputSchema: {
          language: z.enum(['en']).default('en'),
          operation: z
            .enum(['add', 'subtract', 'multiply', 'divide'])
            .describe('Types of Operations'),
          a: z.number().describe('first number'),
          b: z.number().describe('second number'),
        },
        _meta: {
          'openai/outputTemplate': widgetEn.templateUri,
          'openai/toolInvocation/invoking': widgetEn.invoking,
          'openai/toolInvocation/invoked': widgetEn.invoked,
          'openai/WidgetAccessible': true,
        },
      },
      async ({ operation, language, a, b }) => {
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
          language,
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

    this.logger.log('✅ Calc registered');
  }

  /**
   * Next.js에서 HTML 가져오기 (캐싱 포함)
   */
  private async fetchNextWidget(
    path: string,
    lang: 'en' | 'ko',
  ): Promise<string> {
    // 캐시 확인
    if (this.htmlCache.has(path)) {
      this.logger.log(`💾 Cache hit: ${path}`);
      return this.htmlCache.get(path)!;
    }

    try {
      const url = `${this.nextjsUrl}/${lang}${path}`;
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

  widgetMeta(widget: ContentWidget) {
    return {
      'openai/outputTemplate': widget.templateUri,
      'openai/toolInvocation/invoking': widget.invoking,
      'openai/toolInvocation/invoked': widget.invoked,
      'openai/widgetAccessible': false,
      'openai/resultCanProduceWidget': true,
    } as const;
  }
}
