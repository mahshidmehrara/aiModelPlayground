import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { OpenAIProvider } from './openai.provider';

@Module({
  providers: [ProvidersService, OpenAIProvider],
  exports: [ProvidersService],
})
export class ProvidersModule {}
