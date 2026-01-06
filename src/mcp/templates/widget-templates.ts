// src/mcp/templates/widget-templates.ts

/**
 * 계산기 위젯 HTML 템플릿
 */
export function getCalculateWidgetHtml(data?: {
  operation?: string;
  a?: number;
  b?: number;
  symbol?: string;
  result?: number;
  expression?: string;
}): string {
  // 기본값 설정
  const operation = data?.operation || 'add';
  const a = data?.a ?? 0;
  const b = data?.b ?? 0;
  const symbol = data?.symbol || '+';
  const result = data?.result ?? 0;
  const expression = data?.expression || `${a} ${symbol} ${b}`;

  const operationConfig: Record<string, any> = {
    add: {
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      emoji: '➕',
      label: '더하기',
    },
    subtract: {
      gradient: 'from-rose-500 via-pink-500 to-red-500',
      emoji: '➖',
      label: '빼기',
    },
    multiply: {
      gradient: 'from-amber-500 via-orange-500 to-yellow-500',
      emoji: '✖️',
      label: '곱하기',
    },
    divide: {
      gradient: 'from-sky-500 via-blue-500 to-indigo-500',
      emoji: '➗',
      label: '나누기',
    },
  };

  const config = operationConfig[operation] || operationConfig.add;

  // 🔥 데이터를 직접 HTML에 하드코딩
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>계산기</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
  </style>
</head>
<body>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
    <div class="w-full max-w-sm">
      <!-- 메인 카드 -->
      <div class="relative">
        <!-- 글로우 효과 -->
        <div class="absolute -inset-1 bg-gradient-to-r ${config.gradient} rounded-3xl opacity-50 blur-lg"></div>
        
        <!-- 카드 본체 -->
        <div class="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-xl">
          <!-- 헤더 -->
          <div class="bg-gradient-to-r ${config.gradient} p-4">
            <div class="flex items-center justify-center gap-3">
              <span class="text-4xl">${config.emoji}</span>
              <span class="text-xl font-bold text-white">${config.label}</span>
            </div>
          </div>
          
          <!-- 계산기 디스플레이 -->
          <div class="p-6">
            <!-- 수식 -->
            <div class="mb-6 rounded-2xl bg-slate-800/80 p-6 font-mono">
              <div class="mb-3 text-center text-lg tracking-wider text-slate-400">
                ${expression}
              </div>
              <div class="text-center text-5xl font-bold tracking-tight text-white">
                = ${typeof result === 'number' ? result.toLocaleString() : result}
              </div>
            </div>
            
            <!-- 숫자 뱃지들 -->
            <div class="flex items-center justify-center gap-4">
              <div class="text-center">
                <div class="mb-2 rounded-xl bg-slate-800 px-6 py-3">
                  <span class="text-2xl font-bold text-white">${a}</span>
                </div>
                <span class="text-xs tracking-wider text-slate-500 uppercase">첫 번째</span>
              </div>
              
              <div class="h-12 w-12 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg">
                <span class="text-xl font-bold text-white">${symbol}</span>
              </div>
              
              <div class="text-center">
                <div class="mb-2 rounded-xl bg-slate-800 px-6 py-3">
                  <span class="text-2xl font-bold text-white">${b}</span>
                </div>
                <span class="text-xs tracking-wider text-slate-500 uppercase">두 번째</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 푸터 -->
      <p class="mt-6 text-center text-sm text-slate-500">
        MCP Tool: <code class="rounded bg-slate-800/50 px-2 py-1">calculate</code>
      </p>
    </div>
  </div>
  
  <script>
    // 디버깅용 데이터 로그
    console.log('[Widget] Data:', {
      operation: '${operation}',
      a: ${a},
      b: ${b},
      symbol: '${symbol}',
      result: ${result},
      expression: '${expression}'
    });
  </script>
</body>
</html>`;
}

/**
 * 인사 위젯 HTML 템플릿
 */
export function getGreetWidgetHtml(data?: {
  name?: string;
  language?: string;
  greeting?: string;
  timestamp?: string;
}): string {
  // 기본값 설정
  const name = data?.name || '사용자';
  const language = data?.language || 'ko';
  const greeting = data?.greeting || `안녕하세요, ${name}님!`;
  const timestamp = data?.timestamp || new Date().toISOString();
  const formattedDate = new Date(timestamp).toLocaleString('ko-KR');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>인사하기</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
  </style>
</head>
<body>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-6">
    <div class="w-full max-w-md">
      <!-- 메인 카드 -->
      <div class="relative">
        <!-- 글로우 -->
        <div class="absolute -inset-1 bg-gradient-to-r from-pink-500 to-violet-500 rounded-3xl opacity-50 blur-lg"></div>
        
        <!-- 카드 -->
        <div class="relative rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl p-8">
          <div class="text-center">
            <!-- 이모지 -->
            <div class="mb-6 text-7xl">👋</div>
            
            <!-- 인사말 -->
            <h2 class="mb-4 text-3xl font-bold text-white">
              ${greeting}
            </h2>
            
            <!-- 이름 뱃지 -->
            <div class="inline-block rounded-full bg-white/20 px-6 py-2">
              <span class="text-xl font-semibold text-white">${name}</span>
            </div>
            
            <!-- 타임스탬프 -->
            <p class="mt-6 text-sm text-white/60">
              ${formattedDate}
            </p>
          </div>
        </div>
      </div>
      
      <!-- 푸터 -->
      <p class="mt-6 text-center text-sm text-white/60">
        MCP Tool: <code class="rounded bg-white/10 px-2 py-1">greet</code>
      </p>
    </div>
  </div>
  
  <script>
    console.log('[Widget] Data:', {
      name: '${name}',
      language: '${language}',
      greeting: '${greeting}',
      timestamp: '${timestamp}'
    });
  </script>
</body>
</html>`;
}
