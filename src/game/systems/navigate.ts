// The only way scenes leave (ADR 0007): an action of the flow table, always through a transition.
import type Phaser from 'phaser';
import { nextStep, type FlowAction } from '../domain/flow';
import { transitionTo } from './transitions';

export function go(scene: Phaser.Scene, action: FlowAction, data: object = {}): void {
  const step = nextStep(scene.scene.key, action);
  if (!step) throw new Error(`La escena ${scene.scene.key} no tiene la acción "${action}"`);
  transitionTo(scene, step.scene, data, step.transition);
}
