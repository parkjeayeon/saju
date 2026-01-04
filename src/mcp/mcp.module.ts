import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { GreetingHandler } from './handlers/greeting.handler';

@Module({
  controllers: [McpController],
  providers: [McpService, GreetingHandler],
})
export class McpModule {}
