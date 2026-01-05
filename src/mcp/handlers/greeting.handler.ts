import { Injectable, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';

type ContentWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  description: string;
  language: 'ko' | 'en';
};

@Injectable()
export class GreetingHandler {
  private readonly logger = new Logger(GreetingHandler.name);
  private readonly baseURL = process.env.NEXTJS_URL || 'https://refhubs.com';

  // Widget 정의
  private readonly widgets: ContentWidget[] = [
    {
      id: 'greet-ko',
      title: '인사하기 (한국어)',
      templateUri: 'ui://widget/greet-template-ko.html',
      invoking: '인사 준비 중...',
      invoked: '인사 완료!',
      description: '사용자에게 한국어로 인사를 합니다',
      language: 'ko',
    },
    {
      id: 'greet-en',
      title: 'Greeting (English)',
      templateUri: 'ui://widget/greet-template-en.html',
      invoking: 'Preparing greeting...',
      invoked: 'Greeting complete!',
      description: 'Greets the user in English',
      language: 'en',
    },
    {
      id: 'calculate-ko',
      title: '계산기 (한국어)',
      templateUri: 'ui://widget/calculate-template-ko.html',
      invoking: '계산 중...',
      invoked: '계산 완료!',
      description: '간단한 수학 계산을 수행합니다',
      language: 'ko',
    },
    {
      id: 'calculate-en',
      title: 'Calculator (English)',
      templateUri: 'ui://widget/calculate-template-en.html',
      invoking: 'Calculating...',
      invoked: 'Calculation complete!',
      description: 'Performs simple math calculations',
      language: 'en',
    },
  ];

  // URI로 위젯 찾기
  private widgetsByUri = new Map<string, ContentWidget>();

  // HTML 캐시
  private htmlCache = new Map<string, string>();

  constructor() {
    // 위젯 맵 초기화
    this.widgets.forEach((widget) => {
      this.widgetsByUri.set(widget.templateUri, widget);
    });
  }

  async register(server: McpServer) {
    // capabilities 설정
    server.server.registerCapabilities({
      resources: { listChanged: true },
      tools: { listChanged: true },
    });

    // 리소스와 툴을 먼저 등록
    await this.registerResourceHandlers(server);
    await this.registerToolHandlers(server);

    this.logger.log('✅ All handlers registered successfully');
  }

  private async registerResourceHandlers(server: McpServer) {
    const [greetEnHtml, greetKoHtml, calculateEnHtml, calculateKoHtml] =
      await Promise.all([
        this.fetchNextJSHtml('/widgets/greet', 'en'),
        this.fetchNextJSHtml('/widgets/greet', 'ko'),
        this.fetchNextJSHtml('/widgets/calculate', 'en'),
        this.fetchNextJSHtml('/widgets/calculate', 'ko'),
      ]);

    const greetWidgetKo: ContentWidget = {
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
            text: `<html lang="en">${greetKoHtml}</html>`,
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
    const greetWidgetEn: ContentWidget = {
      id: 'greet-en',
      title: 'Greeting (English)',
      templateUri: 'ui://widget/greet-template-en.html',
      invoking: 'Preparing greeting...',
      invoked: 'Greeting complete!',
      description: 'Greets the user in English',
      language: 'en',
    };
    server.registerResource(
      'greet-widget-en',
      greetWidgetEn.templateUri,
      {
        title: greetWidgetEn.title,
        description: greetWidgetEn.templateUri,
        mimeType: 'text/html+skybridge',
        _meta: {
          'openai/widgetDescription': greetWidgetEn.description,
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
            text: `<html lang="en">${greetEnHtml}</html>`,
            _meta: {
              'openai/widgetDescription': greetWidgetEn.description,
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

    const calculateWidgetKo: ContentWidget = {
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
            text: `<html lang="en">${calculateKoHtml}</html>`,
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

    const calculateWidgetEn: ContentWidget = {
      id: 'calculate-en',
      title: 'Calculator (English)',
      templateUri: 'ui://widget/calculate-template-en.html',
      invoking: 'Calculating...',
      invoked: 'Calculation complete!',
      description: 'Performs simple math calculations',
      language: 'en',
    };
    server.registerResource(
      'calculate-widget-en',
      calculateWidgetEn.templateUri,
      {
        title: calculateWidgetEn.title,
        description: calculateWidgetEn.templateUri,
        mimeType: 'text/html+skybridge',
        _meta: {
          'openai/widgetDescription': calculateWidgetEn.description,
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
            text: `<html lang="en">${calculateEnHtml}</html>`,
            _meta: {
              'openai/widgetDescription': calculateWidgetEn.description,
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
    const greetWidgetKo: ContentWidget = {
      id: 'greet-ko',
      title: '인사하기 (한국어)',
      templateUri: 'ui://widget/greet-template-ko.html',
      invoking: '인사 준비 중...',
      invoked: '인사 완료!',
      description: '사용자에게 한국어로 인사를 합니다',
      language: 'ko',
    };
    const greetWidgetEn: ContentWidget = {
      id: 'greet-en',
      title: 'Greeting (English)',
      templateUri: 'ui://widget/greet-template-en.html',
      invoking: 'Preparing greeting...',
      invoked: 'Greeting complete!',
      description: 'Greets the user in English',
      language: 'en',
    };

    const calculateWidgetKo: ContentWidget = {
      id: 'calculate-ko',
      title: '계산기 (한국어)',
      templateUri: 'ui://widget/calculate-template-ko.html',
      invoking: '계산 중...',
      invoked: '계산 완료!',
      description: '간단한 수학 계산을 수행합니다',
      language: 'ko',
    };

    const calculateWidgetEn: ContentWidget = {
      id: 'calculate-en',
      title: 'Calculator (English)',
      templateUri: 'ui://widget/calculate-template-en.html',
      invoking: 'Calculating...',
      invoked: 'Calculation complete!',
      description: 'Performs simple math calculations',
      language: 'en',
    };

    // 1. ListTools - 사용 가능한 도구 목록
    server.registerTool(
      greetWidgetKo.id,
      {
        title: greetWidgetKo.title,
        description: greetWidgetKo.templateUri,
        inputSchema: {
          name: z.string().describe('인사할 사람의 이름'),
          language: z
            .enum(['en', 'ko'])
            .default('ko')
            .describe('Conversation language'),
        },
        _meta: this.widgetMeta(greetWidgetKo),
      },
      async ({ name, language = 'ko' }) => {
        this.logger.log('🔧 ListTools requested');

        const greetings = {
          ko: `안녕하세요, ${name}님! 만나서 반갑습니다! 🎉`,
          en: `Hello, ${name}! Nice to meet you! 🎉`,
        };
        const locale = language === 'ko' ? 'ko' : 'en';

        const greeting = greetings[locale as keyof typeof greetings];

        return {
          content: [{ type: 'text' as const, text: greeting }],
          structuredContent: {
            toolType: 'greet',
            name,
            language,
            greeting,
            timestamp: new Date().toISOString(),
          },
          _meta: this.widgetMeta(greetWidgetKo),
        };
      },
    );
    server.registerTool(
      greetWidgetEn.id,
      {
        title: greetWidgetEn.title,
        description: greetWidgetEn.templateUri,
        inputSchema: {
          name: z.string().describe('인사할 사람의 이름'),
          language: z
            .enum(['en', 'ko'])
            .default('en')
            .describe('Conversation language'),
        },
        _meta: this.widgetMeta(greetWidgetEn),
      },
      async ({ name, language = 'en' }) => {
        this.logger.log('🔧 ListTools requested');

        const greetings = {
          ko: `안녕하세요, ${name}님! 만나서 반갑습니다! 🎉`,
          en: `Hello, ${name}! Nice to meet you! 🎉`,
        };
        const locale = language === 'ko' ? 'ko' : 'en';

        const greeting = greetings[locale as keyof typeof greetings];

        return {
          content: [{ type: 'text' as const, text: greeting }],
          structuredContent: {
            toolType: 'greet',
            name,
            language,
            greeting,
            timestamp: new Date().toISOString(),
          },
          _meta: this.widgetMeta(greetWidgetEn),
        };
      },
    );

    // 2. CallTool - 도구 실행
    server.registerTool(
      calculateWidgetKo.id,
      {
        title: calculateWidgetKo.title,
        description: calculateWidgetKo.templateUri,
        inputSchema: {
          operation: z
            .enum(['add', 'subtract', 'multiply', 'divide'])
            .describe('연산 종류'),
          a: z.number().describe('첫 번째 숫자'),
          b: z.number().describe('두 번째 숫자'),
        },
        _meta: this.widgetMeta(calculateWidgetKo),
      },
      async ({ operation, a, b }) => {
        this.logger.log('🔧 ListTools requested');

        let result: number;
        let symbol: string;
        let isError = false;
        let errorMessage = '';

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
              isError = true;
              errorMessage = '❌ 오류: 0으로 나눌 수 없습니다!';
              result = 0;
              symbol = '÷';
            } else {
              result = a / b;
              symbol = '÷';
            }
            break;
          default:
            result = 0;
            symbol = '?';
        }

        if (isError) {
          return {
            content: [{ type: 'text' as const, text: errorMessage }],
            isError: true,
          };
        }

        const text = `🧮 계산 결과: ${a} ${symbol} ${b} = ${result}`;

        return {
          content: [{ type: 'text' as const, text }],
          structuredContent: {
            toolType: 'calculate',
            operation,
            a,
            b,
            symbol,
            result,
            expression: `${a} ${symbol} ${b}`,
            timestamp: new Date().toISOString(),
          },
          _meta: this.widgetMeta(calculateWidgetKo),
        };
      },
    );
    server.registerTool(
      calculateWidgetEn.id,
      {
        title: calculateWidgetEn.title,
        description: calculateWidgetEn.templateUri,
        inputSchema: {
          operation: z
            .enum(['add', 'subtract', 'multiply', 'divide'])
            .describe('연산 종류'),
          a: z.number().describe('첫 번째 숫자'),
          b: z.number().describe('두 번째 숫자'),
        },
        _meta: this.widgetMeta(calculateWidgetEn),
      },
      async ({ operation, a, b }) => {
        this.logger.log('🔧 ListTools requested');

        let result: number;
        let symbol: string;
        let isError = false;
        let errorMessage = '';

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
              isError = true;
              errorMessage = '❌ 오류: 0으로 나눌 수 없습니다!';
              result = 0;
              symbol = '÷';
            } else {
              result = a / b;
              symbol = '÷';
            }
            break;
          default:
            result = 0;
            symbol = '?';
        }

        if (isError) {
          return {
            content: [{ type: 'text' as const, text: errorMessage }],
            isError: true,
          };
        }

        const text = `🧮 계산 결과: ${a} ${symbol} ${b} = ${result}`;

        return {
          content: [{ type: 'text' as const, text }],
          structuredContent: {
            toolType: 'calculate',
            operation,
            a,
            b,
            symbol,
            result,
            expression: `${a} ${symbol} ${b}`,
            timestamp: new Date().toISOString(),
          },
          _meta: this.widgetMeta(calculateWidgetEn),
        };
      },
    );

    this.logger.log('✅ Tool handlers registered');
  }

  private async fetchNextJSHtml(
    path: string,
    language: string,
  ): Promise<string> {
    const cacheKey = `${path}:${language}`;

    if (this.htmlCache.has(cacheKey)) {
      return this.htmlCache.get(cacheKey)!;
    }

    try {
      // Next.js 라우팅: /ko/widgets/greet 또는 /en/widgets/greet
      const url = `${this.baseURL}/${language}${path}`;
      this.logger.log(`🌐 Fetching: ${url}`);

      const response = await axios.get(url, {
        headers: {
          Accept: 'text/html',
          'Accept-Language': language,
        },
        timeout: 5000,
        validateStatus: (status) => status < 500,
      });

      if (response.status === 404) {
        this.logger.warn(`⚠️ 404 Not Found: ${url}`);
        throw new Error(`Widget not found: ${url}`);
      }

      const html = response.data;
      this.htmlCache.set(cacheKey, html);

      this.logger.log(`✅ Fetched ${cacheKey} (${html.length} chars)`);
      return html;
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch ${path}:${language}`,
        error.message,
      );

      const fallbackHtml = `
        <div style="padding: 20px; text-align: center; font-family: sans-serif;">
          <h3>⚠️ Widget Loading Failed</h3>
          <p>Unable to load widget from ${this.baseURL}/${language}${path}</p>
          <p style="color: #666; font-size: 14px;">Error: ${error.message}</p>
        </div>
      `;

      this.htmlCache.set(cacheKey, fallbackHtml);
      return fallbackHtml;
    }
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
