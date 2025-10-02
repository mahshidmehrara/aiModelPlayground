import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ProvidersService } from '../providers/providers.service';
import { STREAM_EVENTS } from '../events';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService, private providers: ProvidersService) {}
  private logger = new Logger('SessionsService');

  async createSession(prompt: string, models: { key: string; provider: string }[]) {
    const session = await this.prisma.session.create({
      data: {
        prompt,
        models: { create: models.map(m => ({ modelKey: m.key, provider: m.provider })) },
      },
      include: { models: true },
    });
    return session;
  }

  async startSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId }, include: { models: true } });
    if (!session) return null;
    await this.prisma.session.update({ where: { id: sessionId }, data: { startedAt: new Date() } });

    for (const run of session.models) {
      this.runModel(sessionId, run);
    }
    return session;
  }

  async runModel(sessionId: string, run) {
    (async () => {
      const now = new Date();
      await this.prisma.modelRun.update({ where: { id: run.id }, data: { status: 'running', startedAt: now } });
      try {
        const provider = this.providers.get(run.provider);
        const prompt = sessionId ? (await this.prisma.session.findUnique({ where: { id: sessionId } })).prompt : '';
        const iter = provider.stream(run.modelKey, prompt);
        let totalTokens = 0;
        const start = Date.now();
        for await (const ev of iter) {
          if (ev.type === 'chunk') {
            const current = await this.prisma.modelRun.findUnique({ where: { id: run.id } });
            const newText = (current.streamedText || '') + ev.text;
            await this.prisma.modelRun.update({ where: { id: run.id }, data: { streamedText: newText } });
            STREAM_EVENTS.emit(`chunk:${sessionId}:${run.modelKey}`, { text: ev.text });
          } else if (ev.type === 'meta') {
            if (ev.tokens) totalTokens = ev.tokens;
            STREAM_EVENTS.emit(`status:${sessionId}:${run.modelKey}`, { status: 'running', tokens: ev.tokens });
          } else if (ev.type === 'done') {
            const latencyMs = Date.now() - start;
            await this.prisma.modelRun.update({ where: { id: run.id }, data: { status: 'complete', finishedAt: new Date(), tokens: ev.tokens ?? totalTokens, latencyMs, estimatedCost: ev.cost ?? null } });
            STREAM_EVENTS.emit(`done:${sessionId}:${run.modelKey}`, { tokens: ev.tokens ?? totalTokens, cost: ev.cost ?? null, latencyMs });
          } else if (ev.type === 'error') {
            await this.prisma.modelRun.update({ where: { id: run.id }, data: { status: 'error', errorMsg: ev.error } });
            STREAM_EVENTS.emit(`error:${sessionId}:${run.modelKey}`, { error: ev.error });
          }
        }
      } catch (err) {
        this.logger.error('runModel error', err as any);
        await this.prisma.modelRun.update({ where: { id: run.id }, data: { status: 'error', errorMsg: `${(err as Error).message}` } });
        STREAM_EVENTS.emit(`error:${sessionId}:${run.modelKey}`, { error: (err as Error).message });
      }
    })();
  }
}
