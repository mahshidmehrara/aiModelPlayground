import { Body, Controller, Post, Param, NotFoundException } from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private svc: SessionsService) {}

  @Post()
  async create(@Body() body: { prompt: string; models: { key: string; provider: string }[] }) {
    return this.svc.createSession(body.prompt, body.models);
  }

  @Post(':id/start')
  async start(@Param('id') id: string) {
    const session = await this.svc.startSession(id);
    if (!session) throw new NotFoundException();
    return { ok: true };
  }
}
