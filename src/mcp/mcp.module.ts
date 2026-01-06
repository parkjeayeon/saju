import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { GreetingHandler } from './handlers/greeting.handler';
import { WidgetBundlerService } from './widget-bundler.service';

@Module({
  controllers: [McpController],
  providers: [McpService, GreetingHandler, WidgetBundlerService],
})
export class McpModule {}
