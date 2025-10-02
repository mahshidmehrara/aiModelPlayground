import { Controller, Get, Param, Req, Res, Options } from '@nestjs/common';
import { Request, Response } from 'express';
import { STREAM_EVENTS } from '../events';

@Controller('sessions')
export class StreamingController {
  @Options(':id/stream/:modelKey')
  options(@Res() res: Response) {
    res.set({
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    });
    res.status(204).end();
  }

  @Get(':id/stream/:modelKey')
  async stream(@Param('id') id: string, @Param('modelKey') modelKey: string, @Req() req: Request, @Res() res: Response) {
    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Credentials': 'true',
    });

    res.flushHeaders?.();

    const send = (event: string, data: any) => {
      try {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
      }
    };

    const keyBase = `${id}:${modelKey}`;
    const chunkHandler = (payload: any) => send('chunk', payload);
    const statusHandler = (payload: any) => send('status', payload);
    const doneHandler = (payload: any) => {
      send('done', payload);
      cleanup();
    };
    const errorHandler = (payload: any) => {
      send('error', payload);
      cleanup();
    };

    STREAM_EVENTS.on(`chunk:${keyBase}`, chunkHandler);
    STREAM_EVENTS.on(`status:${keyBase}`, statusHandler);
    STREAM_EVENTS.on(`done:${keyBase}`, doneHandler);
    STREAM_EVENTS.on(`error:${keyBase}`, errorHandler);

    const heartbeat = setInterval(() => {
      try { res.write(': keep-alive\n\n'); } catch (e) {}
    }, 20000);

    req.on('close', () => {
      cleanup();
    });

    function cleanup() {
      clearInterval(heartbeat);
      STREAM_EVENTS.off(`chunk:${keyBase}`, chunkHandler);
      STREAM_EVENTS.off(`status:${keyBase}`, statusHandler);
      STREAM_EVENTS.off(`done:${keyBase}`, doneHandler);
      STREAM_EVENTS.off(`error:${keyBase}`, errorHandler);
      try { res.end(); } catch (e) {}
    }
  }
}
