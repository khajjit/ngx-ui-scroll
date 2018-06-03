import { Direction } from '../src/component/interfaces';
import { makeTest } from './scaffolding/runner';

const min = 1, max = 100, scrollCount = 10;

describe('EOF/BOF Spec', () => {

  const config = {
    bof: {
      datasourceName: 'limited',
      datasourceSettings: { startIndex: min, bufferSize: 10, padding: 0.5 },
      templateSettings: { viewportHeight: 200 }
    },
    eof: {
      datasourceName: 'limited',
      datasourceSettings: { startIndex: max - 10 + 1, bufferSize: 10, padding: 0.5 },
      templateSettings: { viewportHeight: 200 }
    }
  };

  const expectLimit = (misc, direction: Direction, noscroll = false) => {
    const _forward = direction === Direction.forward;
    const elements = misc.getElements();
    expect(elements.length).toBeGreaterThan(config[_forward ? 'eof' : 'bof'].datasourceSettings.bufferSize);
    expect(misc.padding[_forward ? Direction.forward : Direction.backward].getSize()).toEqual(0);
    if (!noscroll) {
      expect(misc.padding[_forward ? Direction.backward : Direction.forward].getSize()).toBeGreaterThan(0);
    }
    expect(misc.checkElementId(elements[_forward ? elements.length - 1 : 0], _forward ? max : min)).toEqual(true);
    expect(misc.scroller.buffer.bof).toEqual(!_forward);
    expect(misc.scroller.buffer.eof).toEqual(_forward);
  };

  const runLimitSuite = (eof = 'bof') => {

    const isEOF = eof === 'eof';

    describe((isEOF ? 'End' : 'Begin') + ' of file', () => {

      const _eof = isEOF ? 'bof' : 'eof';
      const direction = isEOF ? Direction.forward : Direction.backward;
      const directionOpposite = isEOF ? Direction.backward : Direction.forward;
      const doScroll = (misc) => isEOF ? misc.scrollMin() : misc.scrollMax();
      const doScrollOpposite = (misc) => isEOF ? misc.scrollMax() : misc.scrollMin();

      makeTest({
        config: config[eof],
        title: `should get ${eof} on init`,
        it: (misc) => (done) =>
          spyOn(misc.workflow, 'finalize').and.callFake(() => {
            expectLimit(misc, direction, true);
            done();
          })
      });

      makeTest({
        config: config[eof],
        title: `should reset ${eof} after scroll`,
        it: (misc) => (done) =>
          spyOn(misc.workflow, 'finalize').and.callFake(() => {
            if (misc.workflow.cyclesDone === 1) {
              expect(misc.scroller.buffer[eof]).toEqual(true);
              doScroll(misc);
            } else {
              expect(misc.scroller.buffer[eof]).toEqual(false);
              expect(misc.scroller.buffer[_eof]).toEqual(false);
              done();
            }
          })
      });

      makeTest({
        config: config[eof],
        title: `should stop when ${eof} is reached again`,
        it: (misc) => (done) =>
          spyOn(misc.workflow, 'finalize').and.callFake(() => {
            if (misc.workflow.cyclesDone === 1) {
              doScroll(misc);
            }
            else if (misc.workflow.cyclesDone === 2) {
              doScrollOpposite(misc);
            } else {
              expectLimit(misc, direction);
              done();
            }
          })
      });

      makeTest({
        config: config[eof],
        title: `should reach ${_eof} after some scrolls`,
        it: (misc) => (done) =>
          spyOn(misc.workflow, 'finalize').and.callFake(() => {
            if (misc.workflow.cyclesDone < scrollCount) {
              doScroll(misc);
            } else {
              expectLimit(misc, directionOpposite);
              done();
            }
          })
      });
    });
  };

  runLimitSuite('bof');
  runLimitSuite('eof');

});
