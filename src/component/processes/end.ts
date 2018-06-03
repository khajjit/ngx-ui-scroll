import { Scroller } from '../scroller';
import { Direction, Process, ProcessSubject, Run } from '../interfaces/index';

export default class End {

  static run(scroller: Scroller, isFail?: boolean) {
    scroller.state.endCycle();
    scroller.adapter.isLoading = false;
    scroller.viewport.saveScrollPosition();
    scroller.purgeCycleSubscriptions();
    scroller.finalize();

    let next: Run;
    if (isFail) {
      scroller.log(`---=== Workflow ${scroller.settings.instanceIndex}-${scroller.state.cycleCount } fail`);
    } else {
      scroller.log(`---=== Workflow ${scroller.settings.instanceIndex}-${scroller.state.cycleCount } done`);
      next = End.getNextRun(scroller);
    }

    scroller.callWorkflow(<ProcessSubject>{
      process: Process.end,
      status: next ? 'next' : 'done',
      payload: next
    });
  }

  static getNextRun(scroller: Scroller): Run {
    let nextRun: Run = null;
    if (scroller.state.fetch.hasNewItems || scroller.state.clip.shouldClip) {
      nextRun = {
        direction: scroller.state.direction,
        scroll: scroller.state.scroll
      };
    } else if (!scroller.buffer.size && scroller.state.fetch.shouldFetch && !scroller.state.fetch.hasNewItems) {
      nextRun = {
        direction: scroller.state.direction === Direction.forward ? Direction.backward : Direction.forward,
        scroll: false
      };
    } else if (scroller.state.isInitial) {
      scroller.state.isInitial = false;
      nextRun = {
        direction: Direction.backward,
        scroll: false
      };
    }
    return nextRun;
  }
}
