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
