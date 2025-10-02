import { Injectable, OnModuleInit } from '@nestjs/common';
import { OpenAIProvider } from './openai.provider';

@Injectable()
export class ProvidersService implements OnModuleInit {
  private providers: Record<string, any> = {};

  constructor(private openai: OpenAIProvider) {}

  onModuleInit() {
    this.providers['openai'] = this.openai;
  }

  get(key: string) {
    const p = this.providers[key];
    if (!p) throw new Error('Unknown provider ' + key);
    return p;
  }
}
