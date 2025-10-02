import { Module } from '@nestjs/common';
import { SessionsModule } from './sessions/sessions.module';
import { StreamingModule } from './streaming/streaming.module';
import { PrismaService } from './prisma.service';
import { ProvidersModule } from './providers/providers.module';

@Module({
  imports: [SessionsModule, StreamingModule, ProvidersModule],
  providers: [PrismaService],
})
export class AppModule {}
