import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL's built-in auto-cleanup checks `globalThis.afterEach`, which vitest only
// sets when `test.globals: true` — this project imports `afterEach` from
// 'vitest' explicitly instead, so auto-cleanup silently never ran. Without
// this, DOM from one test leaks into the next within the same file.
afterEach(() => {
  cleanup();
});

// jsdom has no layout engine: it reports 0x0 for every element and has no
// ResizeObserver at all. Recharts' <ResponsiveContainer> needs both to give
// its chart a real pixel size, so without these stubs it silently renders
// nothing in tests.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect(): DOMRect {
  return { width: 320, height: 160, top: 0, left: 0, right: 320, bottom: 160, x: 0, y: 0, toJSON() {} } as DOMRect;
};

if (!SVGGraphicsElement.prototype.getBBox) {
  SVGGraphicsElement.prototype.getBBox = function getBBox(): DOMRect {
    return { x: 0, y: 0, width: 20, height: 14, top: 0, left: 0, right: 20, bottom: 14, toJSON() {} } as DOMRect;
  };
}

// jsdom doesn't implement the object URL registry — stub it so components
// that preview locally attached files (e.g. the slide deck) don't crash.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock-url';
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {};
}
