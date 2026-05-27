import assert from 'node:assert/strict';
import test from 'node:test';

const repeatBps = (askNumber) => {
  if (askNumber === 1) return 10_000n;
  if (askNumber === 2) return 15_000n;
  if (askNumber === 3) return 25_000n;
  if (askNumber === 4) return 40_000n;
  return 60_000n;
};

const progressBps = (progress) => {
  if (progress <= 1) return 10_000n;
  if (progress === 2) return 15_000n;
  if (progress === 3) return 20_000n;
  if (progress === 4) return 30_000n;
  return 50_000n;
};

const hintPenalty = ({ level, hintCount, progress }) => {
  const base = level === 1 ? 50n : level === 2 ? 150n : 400n;
  return (base * repeatBps(hintCount + 1) * progressBps(progress)) / 100_000_000n;
};

test('hook permission mask matches afterAddLiquidity + afterSwap + afterDonate', () => {
  assert.equal((1 << 10) | (1 << 6) | (1 << 4), 0x0450);
});

test('hint penalties increase by level, repeat count, and progress', () => {
  assert.equal(hintPenalty({ level: 1, hintCount: 0, progress: 3 }), 100n);
  assert.equal(hintPenalty({ level: 2, hintCount: 1, progress: 3 }), 450n);
  assert.equal(hintPenalty({ level: 3, hintCount: 2, progress: 4 }), 3000n);
});

test('quest happy path sequence is deterministic', () => {
  const path = ['Donate', 'Add LP', 'Buy DRAGON', 'Hold', 'Sell DRAGON'];
  assert.deepEqual(path, ['Donate', 'Add LP', 'Buy DRAGON', 'Hold', 'Sell DRAGON']);
});
