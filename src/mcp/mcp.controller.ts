import {
  Controller,
  Post,
  Get,
  Delete,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Post()
  async handlePost(@Req() req: Request, @Res() res: Response) {
    try {
      await this.mcpService.handleStreamableConnection(req, res);
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
            data: error instanceof Error ? error.message : 'Unknown error',
          },
          id: null,
        });
      }
    }
  }

  @Get()
  handleGet(@Res() res: Response) {
    res.status(HttpStatus.METHOD_NOT_ALLOWED).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed. Use POST for MCP requests.',
      },
      id: null,
    });
  }

  @Delete()
  handleDelete(@Res() res: Response) {
    res.status(HttpStatus.OK).json({
      jsonrpc: '2.0',
      result: { message: 'Session terminated' },
      id: null,
    });
  }
}
