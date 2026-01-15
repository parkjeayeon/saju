import { Injectable, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import axios from 'axios';
import { z } from 'zod';

type SajuQueryParams = {
  birthType: 'SOLAR' | 'LUNAR';
  birthDay: string;
  time: string;
  gender: 'MALE' | 'FEMALE';
  language?: 'ko' | 'en';
};

const baseInputSchema = z.object({
  birthType: z.enum(['SOLAR', 'LUNAR']).describe('양력/음력'),
  birthDay: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'birthDay는 YYYY-MM-DD 형식이어야 합니다.'),
  time: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/,
      'time은 HH:mm 또는 HH:mm:ss 형식이어야 합니다.',
    )
    .transform((v) => (v.length === 5 ? `${v}:00` : v))
    .default('00:00:00'),
  gender: z.enum(['MALE', 'FEMALE']).describe('성별'),
});

const inputEnSchema = baseInputSchema.extend({
  language: z.enum(['ko', 'en']).default('en'),
});
const inputKoSchema = baseInputSchema.extend({
  language: z.enum(['ko', 'en']).default('ko'),
});

type InputEnType = z.infer<typeof inputEnSchema>;
type InputKoType = z.infer<typeof inputKoSchema>;

@Injectable()
export class SajuHandler {
  private readonly logger = new Logger(SajuHandler.name);
  private readonly nextjsUrl = process.env.NEXTJS_URL || 'https://refhubs.com';

  async register(server: McpServer) {
    await this.registerSaju(server);
    this.logger.log('✅ All handlers registered');
  }

  private async registerSaju(server: McpServer) {
    const widgetKo = {
      templateUri: 'ui://widget/saju-template-ko.html',
      invoking: '사주 분석 중...',
      invoked: '사주 분석 완료!',
      registerResourceId: 'saju-widget-ko',
      title: '사주 분석 (한국어)',
      description: '생년월일/시간/성별/음력양력 기반으로 사주를 분석합니다',
    };

    const widgetEn = {
      templateUri: 'ui://widget/saju-template-en.html',
      invoking: 'Analyzing saju...',
      invoked: 'Saju analysis complete!',
      registerResourceId: 'saju-widget-en',
      title: 'Saju analysis (English)',
      description: 'Analyze saju from birth info (solar/lunar, gender, time)',
    };

    const widgetCsp = {
      connect_domains: [this.nextjsUrl],
      resource_domains: [this.nextjsUrl],
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
          'openai/widgetCSP': widgetCsp,
        },
      },
      async (uri) => {
        const html = await this.fetchNextWidget({ locale: 'ko' });
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
                'openai/widgetCSP': widgetCsp,
              },
            },
          ],
        };
      },
    );

    // Resource: EN
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
          'openai/widgetCSP': widgetCsp,
        },
      },
      async (uri) => {
        const html = await this.fetchNextWidget({ locale: 'en' });
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
                'openai/widgetCSP': widgetCsp,
              },
            },
          ],
        };
      },
    );

    server.registerTool(
      'saju-ko',
      {
        title: widgetKo.title,
        description: widgetKo.description,
        inputSchema: { ...inputKoSchema },
        _meta: {
          'openai/outputTemplate': widgetKo.templateUri,
          'openai/toolInvocation/invoking': widgetKo.invoking,
          'openai/toolInvocation/invoked': widgetKo.invoked,
          'openai/WidgetAccessible': true,
        },
      },
      async (args: InputKoType) => this.returnWidgetData(args, widgetKo),
    );

    // Tool: EN
    server.registerTool(
      'saju-en',
      {
        title: widgetEn.title,
        description: widgetEn.description,
        inputSchema: { ...inputEnSchema },
        _meta: {
          'openai/outputTemplate': widgetEn.templateUri,
          'openai/toolInvocation/invoking': widgetEn.invoking,
          'openai/toolInvocation/invoked': widgetEn.invoked,
          'openai/WidgetAccessible': true,
        },
      },
      async (args: InputEnType) => this.returnWidgetData(args, widgetEn),
    );
  }

  async fetchNextWidget({ locale }: { locale: 'en' | 'ko' }) {
    const url = `${this.nextjsUrl}/${locale}/widgets/saju`;
    this.logger.log(`🌐 Fetching: ${url}`);

    const response = await axios.get(url, {
      timeout: 5000,
      headers: { Accept: 'text/html' },
    });

    return response.data;
  }

  async returnWidgetData(
    args: InputKoType | InputEnType,
    widget: {
      templateUri: string;
      invoking: string;
      invoked: string;
      description: string;
    },
  ) {
    const summaryText =
      args.language === 'ko'
        ? `✅ 사주 위젯을 열었습니다.`
        : `✅ Saju widget is ready.`;
    const fetchApi = await axios.post(
      'http://localhost:8080/api/v1/saju',
      args,
    );
    const data = fetchApi.data;
    console.log(data);
    return {
      structuredContent: data,
      content: [{ type: 'text' as const, text: summaryText }],
      _meta: {
        'openai/outputTemplate': widget.templateUri,
        'openai/toolInvocation/invoking': widget.invoking,
        'openai/toolInvocation/invoked': widget.invoked,
        'openai/WidgetAccessible': true,
      },
    };
  }
}
