// greeting.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';

@Injectable()
export class GreetingHandler {
  private readonly logger = new Logger(GreetingHandler.name);
  private readonly baseURL = process.env.NEXTJS_URL || 'https://refhubs.com';

  async register(server: McpServer) {
    server.server.registerCapabilities({
      resources: { listChanged: true },
      tools: { listChanged: true },
    });

    await this.registerResourceHandlers(server);
    await this.registerToolHandlers(server);

    this.logger.log('✅ All handlers registered successfully');
  }

  private async registerResourceHandlers(server: McpServer) {
    // 기본 HTML 템플릿 가져오기 (데이터 없이)
    const [greetKoHtml, calculateKoHtml] = await Promise.all([
      this.fetchNextJSHtml('/widgets/greet', 'ko'),
      this.fetchNextJSHtml('/widgets/calculate', 'ko'),
    ]);

    const greetWidgetKo = {
      id: 'greet-ko',
      title: '인사하기 (한국어)',
      templateUri: 'ui://widget/greet-template-ko.html',
      invoking: '인사 준비 중...',
      invoked: '인사 완료!',
      description: '사용자에게 한국어로 인사를 합니다',
      language: 'ko',
    };

    server.registerResource(
      'greet-widget-ko',
      greetWidgetKo.templateUri,
      {
        title: greetWidgetKo.title,
        description: greetWidgetKo.templateUri,
        mimeType: 'text/html+skybridge',
        _meta: {
          'openai/widgetDescription': greetWidgetKo.description,
          'openai/widgetPrefersBorder': true,
          'openai/widgetCSP': {
            connect_domains: [this.baseURL],
            resource_domains: [this.baseURL],
          },
        },
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/html+skybridge',
            text: greetKoHtml,
            _meta: {
              'openai/widgetDescription': greetWidgetKo.description,
              'openai/widgetPrefersBorder': true,
              'openai/widgetDomain': this.baseURL,
              'openai/widgetCSP': {
                connect_domains: [this.baseURL],
                resource_domains: [this.baseURL],
              },
            },
          },
        ],
      }),
    );

    const calculateWidgetKo = {
      id: 'calculate-ko',
      title: '계산기 (한국어)',
      templateUri: 'ui://widget/calculate-template-ko.html',
      invoking: '계산 중...',
      invoked: '계산 완료!',
      description: '간단한 수학 계산을 수행합니다',
      language: 'ko',
    };

    server.registerResource(
      'calculate-widget-ko',
      calculateWidgetKo.templateUri,
      {
        title: calculateWidgetKo.title,
        description: calculateWidgetKo.templateUri,
        mimeType: 'text/html+skybridge',
        _meta: {
          'openai/widgetDescription': calculateWidgetKo.description,
          'openai/widgetPrefersBorder': true,
          'openai/widgetCSP': {
            connect_domains: [this.baseURL],
            resource_domains: [this.baseURL],
          },
        },
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/html+skybridge',
            text: calculateKoHtml,
            _meta: {
              'openai/widgetDescription': calculateWidgetKo.description,
              'openai/widgetPrefersBorder': true,
              'openai/widgetDomain': this.baseURL,
              'openai/widgetCSP': {
                connect_domains: [this.baseURL],
                resource_domains: [this.baseURL],
              },
            },
          },
        ],
      }),
    );

    this.logger.log('✅ Resource handlers registered');
  }

  private registerToolHandlers(server: McpServer) {
    const greetWidgetKo = {
      id: 'greet-ko',
      title: '인사하기 (한국어)',
      templateUri: 'ui://widget/greet-template-ko.html',
      invoking: '인사 준비 중...',
      invoked: '인사 완료!',
      description: '사용자에게 한국어로 인사를 합니다',
      language: 'ko',
    };

    server.registerTool(
      greetWidgetKo.id,
      {
        title: greetWidgetKo.title,
        description: greetWidgetKo.description,
        inputSchema: {
          name: z.string().describe('인사할 사람의 이름'),
          language: z.enum(['en', 'ko']).default('ko'),
        },
        _meta: this.widgetMeta(greetWidgetKo),
      },
      async ({ name, language = 'ko' }) => {
        const greetings = {
          ko: `안녕하세요, ${name}님! 만나서 반갑습니다! 🎉`,
          en: `Hello, ${name}! Nice to meet you! 🎉`,
        };

        const greeting = greetings[language];
        const timestamp = new Date().toISOString();

        // 🔥 핵심: HTML에 데이터를 직접 주입
        const htmlWithData = await this.injectDataIntoHtml(
          '/widgets/greet',
          language,
          {
            toolType: 'greet',
            name,
            language,
            greeting,
            timestamp,
          },
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: greeting,
            },
            {
              type: 'resource' as const,
              resource: {
                uri: greetWidgetKo.templateUri,
                mimeType: 'text/html+skybridge',
                text: htmlWithData,
              },
            },
          ],
          _meta: this.widgetMeta(greetWidgetKo),
        };
      },
    );

    const calculateWidgetKo = {
      id: 'calculate-ko',
      title: '계산기 (한국어)',
      templateUri: 'ui://widget/calculate-template-ko.html',
      invoking: '계산 중...',
      invoked: '계산 완료!',
      description: '간단한 수학 계산을 수행합니다',
      language: 'ko',
    };

    server.registerTool(
      calculateWidgetKo.id,
      {
        title: calculateWidgetKo.title,
        description: calculateWidgetKo.description,
        inputSchema: {
          operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
          a: z.number(),
          b: z.number(),
        },
        _meta: this.widgetMeta(calculateWidgetKo),
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
          toolType: 'calculate',
          operation,
          a,
          b,
          symbol,
          result,
          expression: `${a} ${symbol} ${b}`,
          timestamp: new Date().toISOString(),
        };

        // 🔥 HTML에 데이터 주입
        const htmlWithData = await this.injectDataIntoHtml(
          '/widgets/calculate',
          'ko',
          toolData,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: `🧮 ${a} ${symbol} ${b} = ${result}`,
            },
            {
              type: 'resource' as const,
              resource: {
                uri: calculateWidgetKo.templateUri,
                mimeType: 'text/html+skybridge',
                text: htmlWithData,
              },
            },
          ],
          _meta: this.widgetMeta(calculateWidgetKo),
        };
      },
    );

    this.logger.log('✅ Tool handlers registered');
  }

  /**
   * 🔥 핵심 함수: HTML에 데이터를 주입
   */
  private async injectDataIntoHtml(
    path: string,
    language: string,
    data: Record<string, any>,
  ): Promise<string> {
    const baseHtml = await this.fetchNextJSHtml(path, language);

    // <head> 태그에 데이터 주입 스크립트 추가
    const dataScript = `
      <script>
        window.__WIDGET_DATA__ = ${JSON.stringify(data)};
        if (typeof window.openai !== 'undefined') {
          window.openai.toolOutput = ${JSON.stringify(data)};
        }
      </script>
    `;

    // </head> 직전에 스크립트 삽입
    return baseHtml.replace('</head>', `${dataScript}</head>`);
  }

  private async fetchNextJSHtml(
    path: string,
    language: string,
  ): Promise<string> {
    try {
      const url = `${this.baseURL}/${language}${path}`;
      this.logger.log(`🌐 Fetching: ${url}`);

      const response = await axios.get(url, {
        headers: {
          Accept: 'text/html',
          'Accept-Language': language,
        },
        timeout: 5000,
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch ${path}:${language}`,
        error.message,
      );
      return `<div>Widget Loading Failed</div>`;
    }
  }

  widgetMeta(widget: any) {
    return {
      'openai/outputTemplate': widget.templateUri,
      'openai/toolInvocation/invoking': widget.invoking,
      'openai/toolInvocation/invoked': widget.invoked,
      'openai/widgetAccessible': false,
      'openai/resultCanProduceWidget': true,
    } as const;
  }
}
