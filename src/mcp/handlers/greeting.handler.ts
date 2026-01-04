import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import axios from 'axios';

const safeToolAnnotations = {
  destructiveHint: false,
  openWorldHint: false,
  readOnlyHint: true,
};

@Injectable()
export class GreetingHandler {
  private readonly baseURL = 'http://localhost:8000';

  register(server: McpServer) {
    // === 언어별 Resource 등록 ===

    // 한국어 Greet Widget
    server.registerResource(
        'greet-widget-ko',
        'ui://widget/greet-template-ko.html',
        {
          title: '인사하기 (한국어)',
          description: '사용자에게 한국어로 인사를 합니다',
          mimeType: 'text/html+skybridge',
          _meta: {
            'openai/widgetDescription': '한국어 인사 위젯',
            'openai/widgetPrefersBorder': true,
          },
        },
        async (uri) => {
          const html = await this.fetchNextJSHtml('/widgets/greet', 'ko');
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'text/html+skybridge',
                text: `<html lang="ko">${html}</html>`,
                _meta: {
                  'openai/widgetDescription': '한국어 인사 위젯',
                  'openai/widgetPrefersBorder': true,
                  'openai/widgetDomain': this.baseURL,
                },
              },
            ],
          };
        },
    );

    // 영어 Greet Widget
    server.registerResource(
        'greet-widget-en',
        'ui://widget/greet-template-en.html',
        {
          title: 'Greeting (English)',
          description: 'Greets the user in English',
          mimeType: 'text/html+skybridge',
          _meta: {
            'openai/widgetDescription': 'English greeting widget',
            'openai/widgetPrefersBorder': true,
          },
        },
        async (uri) => {
          const html = await this.fetchNextJSHtml('/widgets/greet', 'en');
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'text/html+skybridge',
                text: `<html lang="en">${html}</html>`,
                _meta: {
                  'openai/widgetDescription': 'English greeting widget',
                  'openai/widgetPrefersBorder': true,
                  'openai/widgetDomain': this.baseURL,
                },
              },
            ],
          };
        },
    );

    // === Tool에서 언어에 따라 다른 템플릿 지정 ===
    server.tool(
        'greet',
        '사용자에게 인사를 합니다',
        {
          name: z.string().describe('인사할 사람의 이름'),
          language: z
              .enum(['ko', 'en'])
              .default('en')
              .describe('Conversation language'),
        },
        safeToolAnnotations,
        ({ name, language }) => {
          const greetings = {
            ko: `안녕하세요, ${name}님! 만나서 반갑습니다! 🎉`,
            en: `Hello, ${name}! Nice to meet you! 🎉`,
          };

          // 언어에 따라 다른 템플릿 URI 사용
          const templateUri = language === 'ko'
              ? 'ui://widget/greet-template-ko.html'
              : 'ui://widget/greet-template-en.html';

          return {
            content: [
              {
                type: 'text' as const,
                text: greetings[language]
              }
            ],
            structuredContent: {
              toolType: 'greet',
              name,
              language,
              greeting: greetings[language],
              timestamp: new Date().toISOString(),
            },
            _meta: {
              'openai/outputTemplate': templateUri, // ← 동적으로 선택
              'openai/toolInvocation/invoking': language === 'ko' ? '인사 준비 중...' : 'Preparing greeting...',
              'openai/toolInvocation/invoked': language === 'ko' ? '인사 완료!' : 'Greeting complete!',
              'openai/widgetAccessible': false,
              'openai/resultCanProduceWidget': true,
            },
          };
        },
    );

    // === Calculate도 동일하게 처리 ===

    // 한국어 Calculate Widget
    server.registerResource(
        'calculate-widget-ko',
        'ui://widget/calculate-template-ko.html',
        {
          title: '계산기 (한국어)',
          description: '간단한 수학 계산을 수행합니다',
          mimeType: 'text/html+skybridge',
          _meta: {
            'openai/widgetDescription': '한국어 계산기 위젯',
            'openai/widgetPrefersBorder': true,
          },
        },
        async (uri) => {
          const html = await this.fetchNextJSHtml('/widgets/calculate', 'ko');
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'text/html+skybridge',
                text: `<html lang="ko">${html}</html>`,
                _meta: {
                  'openai/widgetDescription': '한국어 계산기 위젯',
                  'openai/widgetPrefersBorder': true,
                  'openai/widgetDomain': this.baseURL,
                },
              },
            ],
          };
        },
    );

    // 영어 Calculate Widget
    server.registerResource(
        'calculate-widget-en',
        'ui://widget/calculate-template-en.html',
        {
          title: 'Calculator (English)',
          description: 'Performs simple math calculations',
          mimeType: 'text/html+skybridge',
          _meta: {
            'openai/widgetDescription': 'English calculator widget',
            'openai/widgetPrefersBorder': true,
          },
        },
        async (uri) => {
          const html = await this.fetchNextJSHtml('/widgets/calculate', 'en');
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: 'text/html+skybridge',
                text: `<html lang="en">${html}</html>`,
                _meta: {
                  'openai/widgetDescription': 'English calculator widget',
                  'openai/widgetPrefersBorder': true,
                  'openai/widgetDomain': this.baseURL,
                },
              },
            ],
          };
        },
    );

    server.tool(
        'calculate',
        '간단한 수학 계산을 수행합니다',
        {
          operation: z
              .enum(['add', 'subtract', 'multiply', 'divide'])
              .describe('연산 종류'),
          a: z.number().describe('첫 번째 숫자'),
          b: z.number().describe('두 번째 숫자'),
          language: z
              .enum(['ko', 'en'])
              .default('en')
              .describe('Conversation language'),
        },
        safeToolAnnotations,
        ({ operation, a, b, language }) => {
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
                const errorMsg = language === 'ko'
                    ? '❌ 오류: 0으로 나눌 수 없습니다!'
                    : '❌ Error: Cannot divide by zero!';
                return {
                  content: [{ type: 'text' as const, text: errorMsg }],
                  isError: true,
                };
              }
              result = a / b;
              symbol = '÷';
              break;
          }

          const text = language === 'ko'
              ? `🧮 계산 결과: ${a} ${symbol} ${b} = ${result}`
              : `🧮 Result: ${a} ${symbol} ${b} = ${result}`;

          // 언어에 따라 다른 템플릿 URI 사용
          const templateUri = language === 'ko'
              ? 'ui://widget/calculate-template-ko.html'
              : 'ui://widget/calculate-template-en.html';

          return {
            content: [{ type: 'text' as const, text }],
            structuredContent: {
              toolType: 'calculate',
              operation,
              a,
              b,
              symbol,
              result,
              language,
              expression: `${a} ${symbol} ${b}`,
              timestamp: new Date().toISOString(),
            },
            _meta: {
              'openai/outputTemplate': templateUri, // ← 동적으로 선택
              'openai/toolInvocation/invoking': language === 'ko' ? '계산 중...' : 'Calculating...',
              'openai/toolInvocation/invoked': language === 'ko' ? '계산 완료!' : 'Calculation complete!',
              'openai/widgetAccessible': false,
              'openai/resultCanProduceWidget': true,
            },
          };
        },
    );
  }

  private async fetchNextJSHtml(path: string, language: string): Promise<string> {
    try {
      const url = `${this.baseURL}/${language}${path}`;
      const response = await axios.get(url, {
        headers: {
          'Accept-Language': language,
          'Cookie': `i18next=${language}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error(`[GreetingHandler] Failed to fetch HTML from ${path}:`, error);
      return '<div>Failed to load widget</div>';
    }
  }
}
