import { Module } from '@nestjs/common';
import { StreamingController } from './streaming.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [StreamingController],
  providers: [PrismaService]
})
export class StreamingModule {}
