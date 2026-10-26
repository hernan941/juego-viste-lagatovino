// The only way scenes leave (ADR 0007): an action of the flow table, always through a transition.
import type Phaser from 'phaser';
import { backStep, nextStep, type FlowAction } from '../domain/flow';
import { SceneKeys } from '../constants';
import { transitionTo } from './transitions';

export function go(scene: Phaser.Scene, action: FlowAction, data: object = {}): void {
  // `back` is the one action with a dynamic destination: the album says where it came from (ADR 0019).
  if (action === 'back' && scene.scene.key === SceneKeys.Album) {
    const back = backStep(data);
    transitionTo(scene, back.scene, back.data, back.transition);
    return;
  }
  const step = nextStep(scene.scene.key, action);
  if (!step) throw new Error(`La escena ${scene.scene.key} no tiene la acción "${action}"`);
  transitionTo(scene, step.scene, data, step.transition);
}
