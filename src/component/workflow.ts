import { Subscription } from 'rxjs/Subscription';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import { Scroller } from './scroller';
import { ScrollHelper } from './classes/scrollHelper';
import { Process, ProcessSubject } from './interfaces/index';
import {
  Init, Scroll, Reload, Start, PreFetch, Fetch, PostFetch, Render, PostRender, PreClip, Clip, End
} from './processes/index';

export class Workflow {

  readonly context;
  private onScrollUnsubscribe: Function;
  private itemsSubscription: Subscription;
  private workflowSubscription: Subscription;

  public scroller: Scroller;
  public process$: BehaviorSubject<ProcessSubject>;
  public cyclesDone: number;

  private scrollHelper: ScrollHelper;

  constructor(context) {
    this.context = context;
    this.scroller = new Scroller(this.context, this.callWorkflow.bind(this));
    this.scrollHelper = new ScrollHelper(this.scroller);
    this.process$ = new BehaviorSubject(<ProcessSubject>{
      process: Process.init,
      status: 'start'
    });
    this.cyclesDone = 0;
    setTimeout(() => this.initListeners());
  }

  initListeners() {
    const scroller = this.scroller;
    this.itemsSubscription = scroller.buffer.$items.subscribe(items => this.context.items = items);
    this.workflowSubscription = this.process$.subscribe(this.process.bind(this));
    this.onScrollUnsubscribe =
      this.context.renderer.listen(scroller.viewport.scrollable, 'scroll', this.scrollHelper.run.bind(this.scrollHelper));
  }

  dispose() {
    this.onScrollUnsubscribe();
    this.itemsSubscription.unsubscribe();
    this.process$.complete();
    this.workflowSubscription.unsubscribe();
    this.scroller.dispose();
  }

  callWorkflow(processSubject: ProcessSubject) {
    this.process$.next(processSubject);
  }

  process(data: ProcessSubject) {
    const scroller = this.scroller;
    const pl = typeof data.payload === 'string' ? ` (${data.payload})` : '';
    scroller.log(`process ${data.process}, ${data.status + pl}`);
    if (data.status === 'error') {
      End.run(scroller, true);
      return;
    }
    switch (data.process) {
      case Process.init:
        if (data.status === 'start') {
          Init.run(scroller);
        }
        if (data.status === 'next') {
          Start.run(scroller);
        }
        break;
      case Process.scroll:
        if (data.status === 'start') {
          Scroll.run(this, data.payload);
        }
        if (data.status === 'next') {
          Start.run(scroller, data.payload);
        }
        break;
      case Process.reload:
        if (data.status === 'start') {
          Reload.run(scroller, data.payload);
        }
        if (data.status === 'next') {
          Init.run(scroller);
        }
        break;
      case Process.start:
        if (data.status === 'next') {
          PreFetch.run(scroller);
        }
        break;
      case Process.preFetch:
        if (data.status === 'next') {
          Fetch.run(scroller);
        }
        if (data.status === 'done') {
          End.run(scroller);
        }
        break;
      case Process.fetch:
        if (data.status === 'next') {
          PostFetch.run(scroller);
        }
        break;
      case Process.postFetch:
        if (data.status === 'next') {
          Render.run(scroller);
        }
        if (data.status === 'done') {
          End.run(scroller);
        }
        break;
      case Process.render:
        if (data.status === 'next') {
          PostRender.run(scroller);
        }
        break;
      case Process.postRender:
        if (data.status === 'next') {
          PreClip.run(scroller);
        }
        break;
      case Process.preClip:
        if (data.status === 'next') {
          Clip.run(scroller);
        }
        if (data.status === 'done') {
          End.run(scroller);
        }
        break;
      case Process.clip:
        if (data.status === 'next') {
          End.run(scroller);
        }
        break;
      case Process.end:
        if (data.status === 'next') {
          Start.run(scroller, data.payload);
        }
        if (data.status === 'done') {
          this.done();
        }
        break;
    }
  }

  done() {
    this.cyclesDone++;
    this.scroller.log(`~~~~~~ WF Run ${this.scroller.settings.instanceIndex}-${this.cyclesDone} FINALIZED ~~~~~~`);
    this.finalize();
  }

  finalize() {
  }

}
