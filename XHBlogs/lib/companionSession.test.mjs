import test from 'node:test';
import assert from 'node:assert/strict';
import { nextCompanionMessages } from './companionSession.mjs';

test('new questions preserve complete recent turns and add no system instructions', () => {
  const history = Array.from({ length: 8 }, (_, index) => ({ role: index % 2 === 0 ? 'user' : 'assistant', content: String(index) }));
  const result = nextCompanionMessages(history, '  新问题  ');
  assert.deepEqual(result, [...history.slice(2), { role: 'user', content: '新问题' }]);
  assert.equal(history.length, 8);
  assert.equal(result.length, 7);
});

test('oldest complete turns drop out before the 6000-character server budget is exceeded', () => {
  const history = Array.from({ length: 8 }, (_, index) => ({ role: index % 2 === 0 ? 'user' : 'assistant', content: 'x'.repeat(1000) }));
  const result = nextCompanionMessages(history, 'y'.repeat(1000));
  assert.equal(result.length, 5);
  assert.ok(result.reduce((sum, message) => sum + message.content.length, 0) <= 6000);
  assert.equal(result[0].role, 'user');
  assert.equal(result.at(-1).role, 'user');
});

for (const [label, content] of [
  ['Chinese UTF-8', '鲸'.repeat(950)],
  ['JSON escaping', '\u0001"\\\n'.repeat(230)],
]) {
  test(`oldest complete turns drop out when serialized ${label} exceeds 16KiB despite fitting the character budget`, () => {
    const history = Array.from({ length: 6 }, (_, index) => ({ role: index % 2 === 0 ? 'user' : 'assistant', content }));
    const input = '问'.repeat(100);
    const initial = [...history, { role: 'user', content: input }];
    const size = messages => new TextEncoder().encode(JSON.stringify({ messages })).byteLength;
    assert.ok(initial.reduce((sum, message) => sum + message.content.length, 0) <= 6000);
    assert.ok(size(initial) > 16 * 1024);
    const result = nextCompanionMessages(history, input);
    assert.deepEqual(result, [...history.slice(2), { role: 'user', content: input }]);
    assert.ok(size(result) <= 16 * 1024);
    assert.equal(history.length, 6);
  });
}

test('byte trimming can remove multiple old turns while retaining the full 1000-character question', () => {
  const history = Array.from({ length: 6 }, (_, index) => ({ role: index % 2 === 0 ? 'user' : 'assistant', content: '鲸'.repeat(1000) }));
  const input = '\u0000'.repeat(1000);
  const result = nextCompanionMessages(history, input);
  assert.deepEqual(result, [...history.slice(4), { role: 'user', content: input }]);
  assert.ok(new TextEncoder().encode(JSON.stringify({ messages: result })).byteLength <= 16 * 1024);
  assert.deepEqual(nextCompanionMessages([], input), [{ role: 'user', content: input }]);
});
