import { makeTest } from './scaffolding/runner';

const customDefault = { startIndex: null, scrollCount: 0, preLoad: false };

const configList = [{
  datasourceSettings: { startIndex: 100, bufferSize: 5, padding: 0.2 },
  templateSettings: { viewportHeight: 100 },
  custom: { ...customDefault }
}, {
  datasourceSettings: { startIndex: -50, bufferSize: 4, padding: 0.49 },
  templateSettings: { viewportHeight: 70 },
  custom: { ...customDefault }
}, {
  datasourceSettings: { startIndex: -33, bufferSize: 5, padding: 0.3, horizontal: true },
  templateSettings: { viewportWidth: 300, itemWidth: 100, horizontal: true },
  custom: { ...customDefault }
}];

const indexedConfigList = configList.map((config, i) => ({
  ...config,
  custom: {
    ...config.custom,
    startIndex: [-10, 1255, 2][i]
  }
}));

const scrolledConfigList = configList.map((config, i) => ({
  ...config,
  custom: {
    ...config.custom,
    startIndex: [-20, null, 4][i],
    scrollCount: [3, 5, 2][i]
  }
}));

const preLoadConfigList = configList.map((config, i) => ({
  ...config,
  custom: {
    ...config.custom,
    startIndex: [-30, null, 12][i],
    preLoad: true
  }
}));

const interruptConfigList = configList.map((config, i) => ({
  ...config,
  datasourceName: 'infinite-callback-delay-150',
  custom: {
    ...config.custom,
    startIndex: [null, 1025, -40][i]
  }
}));

const checkExpectation = (config, misc) => {
  const startIndex = config.custom.startIndex === null ?
    config.datasourceSettings.startIndex : config.custom.startIndex;
  const bufferSize = config.datasourceSettings.bufferSize;
  const firstIndex = startIndex - bufferSize;
  const nextIndex = firstIndex + bufferSize + 1;
  const firstItem = misc.scroller.buffer.getFirstVisibleItem();

  expect(firstItem.$index).toEqual(firstIndex);
  expect(misc.getElementText(firstIndex)).toEqual(`${firstIndex} : item #${firstIndex}`);
  expect(misc.getElementText(nextIndex)).toEqual(`${nextIndex} : item #${nextIndex}`);
};

const doReload = (config, misc) => {
  if (config.custom.startIndex !== null) {
    misc.datasource.adapter.reload(config.custom.startIndex);
  } else {
    misc.datasource.adapter.reload();
  }
};

const shouldReload = (config) => (misc) => (done) => {
  const startWFCount = config.custom.preLoad ? 0 : 1;
  spyOn(misc.workflow, 'finalize').and.callFake(() => {
    if (misc.workflow.cyclesDone < startWFCount + config.custom.scrollCount) {
      misc.scrollMax();
    } else if (misc.workflow.cyclesDone === startWFCount + config.custom.scrollCount) {
      doReload(config, misc);
    } else {
      checkExpectation(config, misc);
      done();
    }
  });

  if (config.custom.preLoad) {
    spyOn(misc.scroller, 'finalize').and.callFake(() => {
      if (misc.scroller.state.cycleCount === 2) {
        doReload(config, misc);
      }
    });
  }
};

const shouldReloadBeforeLoad = (config) => (misc) => (done) => {
  spyOn(misc.workflow, 'finalize').and.callFake(() => {
    expect(misc.scroller.cycleSubscriptions.length).toEqual(0);
    if (misc.workflow.cyclesDone === 1) {
      checkExpectation(config, misc);
      done();
    }
  });
  spyOn(misc.scroller, 'finalize').and.callFake(() => {
    if (misc.scroller.state.cycleCount === 2) {
      setTimeout(() => doReload(config, misc));
    }
  });
};

const shouldReloadInterruption = (config) => (misc) => (done) => {
  spyOn(misc.workflow, 'finalize').and.callFake(() => {
    expect(misc.scroller.cycleSubscriptions.length).toEqual(0);
    if (misc.workflow.cyclesDone === 1) {
      checkExpectation(config, misc);
      done();
    }
  });
  spyOn(misc.scroller, 'finalize').and.callFake(() => {
    if (misc.scroller.state.cycleCount === 1) {
      setTimeout(() => doReload(config, misc), 75);
    }
  });
};

describe('Adapter Reload Spec', () => {

  describe('simple reload', () =>
    configList.forEach(config =>
      makeTest({
        config,
        title: 'should reload at initial position',
        it: shouldReload(config)
      })
    )
  );

  describe('reload with parameter', () =>
    indexedConfigList.forEach(config =>
      makeTest({
        config,
        title: 'should reload at param position',
        it: shouldReload(config)
      })
    )
  );

  describe('reload after scroll', () =>
    scrolledConfigList.forEach(config =>
      makeTest({
        config,
        title: 'should reload at proper position',
        it: shouldReload(config)
      })
    )
  );

  describe('reload before load', () =>
    preLoadConfigList.forEach(config =>
      makeTest({
        config,
        title: 'should reload at proper position',
        it: shouldReloadBeforeLoad(config)
      })
    )
  );

  describe('reload interruption', () =>
    interruptConfigList.forEach(config =>
      makeTest({
        config,
        title: 'should reload before second datasource.get done',
        it: shouldReloadInterruption(config)
      })
    )
  );

});
