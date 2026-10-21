import { Events } from 'phaser';

// Shared emitter for game events between scenes only (ADR 0010).
export const EventBus = new Events.EventEmitter();
