

function createInferaIdempotencyKey(prefix) {
  const unique = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${unique}`.slice(0, 128);
}

export { createInferaIdempotencyKey };
