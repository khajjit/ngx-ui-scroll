import { Workflow } from '../workflow';
import { Viewport } from '../classes/viewport';
import { Direction } from '../interfaces/direction';

export default class Clip {

  static run(workflow: Workflow) {
    if (!workflow.clip.shouldClip) {
      return workflow;
    }
    Clip.runByDirection(Direction.forward, workflow);
    Clip.runByDirection(Direction.backward, workflow);

    workflow.buffer.items = workflow.buffer.items.filter(item => {
      if (item.toRemove) {
        Viewport.hideItem(item.element);
        return false;
      }
      return true;
    });
    workflow.bindData();

    return workflow;
  }

  static runByDirection(direction: Direction, workflow: Workflow) {
    if (!workflow.clip[direction].shouldClip) {
      return;
    }
    const opposite = direction === Direction.forward ? Direction.backward : Direction.forward;
    workflow.viewport.padding[opposite].size += workflow.clip[direction].size;
  }

}