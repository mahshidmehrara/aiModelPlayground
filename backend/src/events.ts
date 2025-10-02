import { EventEmitter } from 'events';
export const STREAM_EVENTS = new EventEmitter();
STREAM_EVENTS.setMaxListeners(1000);
