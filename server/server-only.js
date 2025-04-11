/**
 * Server-only utilities
 */

export function log(message, tag = 'server') {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} [${tag}] ${message}`);
}