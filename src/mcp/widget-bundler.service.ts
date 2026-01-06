// src/mcp/services/widget-bundler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class WidgetBundlerService {
  private readonly logger = new Logger(WidgetBundlerService.name);
  private readonly cache = new Map<string, string>();

  /**
   * Next.js HTML을 완전히 자립적인 단일 파일로 변환
   */
  async bundleWidget(
    baseUrl: string,
    path: string,
    locale: string,
    data?: Record<string, any>,
  ): Promise<string> {
    const cacheKey = `${path}:${locale}`;

    try {
      // 1. Next.js HTML 가져오기
      const url = `${baseUrl}/${locale}${path}`;
      this.logger.log(`📦 Bundling: ${url}`);

      const response = await axios.get(url, {
        headers: { Accept: 'text/html' },
        timeout: 10000,
      });

      let html = response.data;

      // 2. Cheerio로 파싱
      const $ = cheerio.load(html);

      // 3. 모든 외부 리소스 인라인화
      await this.inlineStyles($, baseUrl);
      await this.inlineScripts($, baseUrl);

      // 4. 데이터 주입
      if (data) {
        this.injectData($, data);
      }

      // 5. 상대 경로를 절대 경로로 변환
      this.fixRelativePaths($, baseUrl);

      // 6. Next.js 특수 태그 제거
      $('script[src*="/_next/"]').remove();
      $('link[href*="/_next/"]').remove();
      $('base').remove();

      const bundled = $.html();
      this.logger.log(`✅ Bundled ${cacheKey} (${bundled.length} chars)`);

      return bundled;
    } catch (error) {
      this.logger.error(`❌ Bundle failed: ${cacheKey}`, error.message);
      return this.getFallbackHtml(data);
    }
  }

  /**
   * CSS를 <style> 태그로 인라인화
   */
  private async inlineStyles($: cheerio.CheerioAPI, baseUrl: string) {
    const links = $('link[rel="stylesheet"]');

    for (let i = 0; i < links.length; i++) {
      const link = links.eq(i);
      const href = link.attr('href');

      if (!href || href.startsWith('http')) continue;

      try {
        const cssUrl = new URL(href, baseUrl).href;
        const response = await axios.get(cssUrl, { timeout: 3000 });

        // <link>를 <style>로 교체
        link.replaceWith(`<style>${response.data}</style>`);

        this.logger.log(`  ✅ Inlined CSS: ${href}`);
      } catch (error) {
        this.logger.warn(`  ⚠️ Failed to inline CSS: ${href}`);
      }
    }
  }

  /**
   * JS를 <script> 태그로 인라인화
   */
  private async inlineScripts($: cheerio.CheerioAPI, baseUrl: string) {
    const scripts = $('script[src]');

    for (let i = 0; i < scripts.length; i++) {
      const script = scripts.eq(i);
      const src = script.attr('src');

      if (!src || src.startsWith('http')) continue;

      // Next.js 시스템 스크립트는 건너뛰기
      if (
        src.includes('/_next/static/chunks/webpack') ||
        src.includes('/_next/static/chunks/framework')
      ) {
        continue;
      }

      try {
        const jsUrl = new URL(src, baseUrl).href;
        const response = await axios.get(jsUrl, { timeout: 3000 });

        // <script src>를 <script> 내용으로 교체
        script.removeAttr('src');
        script.text(response.data);

        this.logger.log(`  ✅ Inlined JS: ${src}`);
      } catch (error) {
        this.logger.warn(`  ⚠️ Failed to inline JS: ${src}`);
      }
    }
  }

  /**
   * 데이터 주입
   */
  private injectData($: cheerio.CheerioAPI, data: Record<string, any>) {
    const dataScript = `
      <script id="widget-data">
        (function() {
          window.__WIDGET_DATA__ = ${JSON.stringify(data)};
          
          // ChatGPT 환경 감지 및 데이터 주입
          if (typeof window.openai !== 'undefined') {
            window.openai.toolOutput = ${JSON.stringify(data)};
          }
          
          // 데이터 변경 이벤트 발생
          window.dispatchEvent(new CustomEvent('widgetDataReady', {
            detail: ${JSON.stringify(data)}
          }));
          
          console.log('[Widget] Data injected:', window.__WIDGET_DATA__);
        })();
      </script>
    `;

    // <head> 끝에 추가
    $('head').append(dataScript);
  }

  /**
   * 상대 경로를 절대 경로로 변환
   */
  private fixRelativePaths($: cheerio.CheerioAPI, baseUrl: string) {
    // 이미지
    $('img[src]').each((_, elem) => {
      const $elem = $(elem);
      const src = $elem.attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        $elem.attr('src', new URL(src, baseUrl).href);
      }
    });

    // 링크
    $('a[href]').each((_, elem) => {
      const $elem = $(elem);
      const href = $elem.attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        $elem.attr('href', new URL(href, baseUrl).href);
      }
    });
  }

  /**
   * Fallback HTML (번들 실패 시)
   */
  private getFallbackHtml(data?: Record<string, any>): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
    }
    h2 { margin: 0 0 16px; color: #333; }
    pre {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      overflow: auto;
      font-size: 14px;
    }
  </style>
  <script>
    window.__WIDGET_DATA__ = ${JSON.stringify(data || {})};
    if (typeof window.openai !== 'undefined') {
      window.openai.toolOutput = ${JSON.stringify(data || {})};
    }
  </script>
</head>
<body>
  <div class="container">
    <h2>📦 Widget Data</h2>
    <pre id="data"></pre>
    <script>
      document.getElementById('data').textContent = 
        JSON.stringify(window.__WIDGET_DATA__, null, 2);
    </script>
  </div>
</body>
</html>
    `;
  }
}
