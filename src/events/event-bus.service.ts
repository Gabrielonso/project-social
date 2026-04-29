import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventBus {
  constructor(private readonly emitter: EventEmitter2) {}

  emit(event: string, payload: any) {
    this.emitter.emit(event, payload);
  }
}
