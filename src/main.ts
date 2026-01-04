import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/mcp') {
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(
      `🚀 Server running on http://localhost:${process.env.PORT ?? 3000}`,
  );
  console.log(
      `📡 MCP endpoint: http://localhost:${process.env.PORT ?? 3000}/mcp`,
  );
  console.log(
      `📡 MCP debug: npx @modelcontextprotocol/inspector`,
  );
}

bootstrap();
