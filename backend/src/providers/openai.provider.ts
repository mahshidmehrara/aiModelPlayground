import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';
import { parse } from 'eventsource-parser';

@Injectable()
export class OpenAIProvider {
  async *stream(model: string, prompt: string) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      yield { type: 'error', error: 'OPENAI_API_KEY not set' };
      return;
    }
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], stream: true })
    });
    if (!res.ok || !res.body) {
      const txt = await res.text();
      yield { type: 'error', error: txt };
      return;
    }

    const queue: any[] = [];
    const parser = parse(event => {
      if (event.type === 'event') {
        if (event.data === '[DONE]') {
        } else {
          try {
            const json = JSON.parse(event.data);
            const delta = json.choices?.[0]?.delta?.content ?? '';
            if (delta) queue.push({ type: 'chunk', text: delta });
          } catch (e) {}
        }
      }
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const str = decoder.decode(value, { stream: true });
      parser.feed(str);
      while (queue.length) {
        yield queue.shift();
      }
    }

    yield { type: 'done', tokens: null, cost: null };
  }
}
