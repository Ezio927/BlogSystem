/** @typedef {{ role: 'user' | 'assistant'; content: string }} CompanionMessage */

const requestEncoder = new TextEncoder();

/** Keep complete recent turns, within the server's character and UTF-8 body budgets.
 * @param {CompanionMessage[]} history @param {string} input
 * @returns {CompanionMessage[]} */
export function nextCompanionMessages(history, input) {
  /** @type {CompanionMessage[]} */
  const messages = [...history.slice(-6), { role: 'user', content: input.trim() }];
  while (messages.length > 1 && (
    messages.reduce((size, message) => size + message.content.length, 0) > 6000 ||
    requestEncoder.encode(JSON.stringify({ messages })).byteLength > 16 * 1024
  )) {
    messages.splice(0, 2);
  }
  return messages;
}
