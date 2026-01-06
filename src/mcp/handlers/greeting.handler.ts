// src/mcp/handlers/greeting.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  getCalculateWidgetHtml,
  getGreetWidgetHtml,
} from '../templates/widget-templates';

@Injectable()
export class GreetingHandler {
  private readonly logger = new Logger(GreetingHandler.name);
  private readonly baseURL = process.env.NEXTJS_URL || 'https://refhubs.com';

  async register(server: McpServer) {
    server.server.registerCapabilities({
      resources: { listChanged: true },
      tools: { listChanged: true },
    });

    this.registerResourceHandlers(server);
    this.registerToolHandlers(server);

    this.logger.log('✅ All handlers registered successfully');
  }

  private registerResourceHandlers(server: McpServer) {
    // Greet Widget (한국어) - 기본 템플릿
    const greetWidgetKo = {
      id: 'greet-ko',
      title: '인사하기 (한국어)',
      templateUri: 'ui://widget/greet-template-ko.html',
      invoking: '인사 준비 중...',
      invoked: '인사 완료!',
      description: '사용자에게 한국어로 인사를 합니다',
    };

    server.registerResource(
      'greet-widget-ko',
      greetWidgetKo.templateUri,
      {
        title: greetWidgetKo.title,
        description: greetWidgetKo.description,
        mimeType: 'text/html+skybridge',
        _meta: {
          'openai/widgetDescription': greetWidgetKo.description,
          'openai/widgetPrefersBorder': true,
        },
      },
      async (uri) => {
        // 데이터 없는 기본 템플릿
        const html = getGreetWidgetHtml();

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/html+skybridge',
              text: html,
              _meta: {
                'openai/widgetDescription': greetWidgetKo.description,
                'openai/widgetPrefersBorder': true,
              },
            },
          ],
        };
      },
    );

    // Calculate Widget (한국어) - 기본 템플릿
    const calculateWidgetKo = {
      id: 'calculate-ko',
      title: '계산기 (한국어)',
      templateUri: 'ui://widget/calculate-template-ko.html',
      invoking: '계산 중...',
      invoked: '계산 완료!',
      description: '간단한 수학 계산을 수행합니다',
    };

    server.registerResource(
      'calculate-widget-ko',
      calculateWidgetKo.templateUri,
      {
        title: calculateWidgetKo.title,
        description: calculateWidgetKo.description,
        mimeType: 'text/html+skybridge',
        _meta: {
          'openai/widgetDescription': calculateWidgetKo.description,
          'openai/widgetPrefersBorder': true,
        },
      },
      async (uri) => {
        // 데이터 없는 기본 템플릿
        const html = getCalculateWidgetHtml();
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/html+skybridge',
              text: html,
              _meta: {
                'openai/widgetDescription': calculateWidgetKo.description,
                'openai/widgetPrefersBorder': true,
              },
            },
          ],
        };
      },
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
    };

    // Greet Tool
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

        const toolData = {
          toolType: 'greet',
          name,
          language,
          greeting: greetings[language],
          timestamp: new Date().toISOString(),
        };

        // 🔥 데이터가 주입된 HTML 즉시 생성 (네트워크 요청 없음)
        const htmlWithData = getGreetWidgetHtml(toolData);

        return {
          content: [
            { type: 'text' as const, text: toolData.greeting },
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
    };

    // Calculate Tool
    server.registerTool(
      calculateWidgetKo.id,
      {
        title: calculateWidgetKo.title,
        description: calculateWidgetKo.description,
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

        // 🔥 데이터가 주입된 HTML 즉시 생성 (네트워크 요청 없음)
        const htmlWithData = getCalculateWidgetHtml(toolData);

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
