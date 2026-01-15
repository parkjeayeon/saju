import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { GreetingHandler } from './handlers/greeting.handler';
import { SajuHandler } from './handlers/saju.handler';

@Module({
  controllers: [McpController],
  providers: [McpService, GreetingHandler, SajuHandler],
})
export class McpModule {}
