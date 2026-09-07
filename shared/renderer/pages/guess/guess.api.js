import { requestInfera } from "../../services/infera.js";
import { GUESS_ITEMS_PATH, GUESS_LIST_PATH, GUESS_PAGE_SIZE, GUESS_REGISTRY_PATH } from "./guess.constants.js";

async function fetchLongTermMemoryGuesses(token, { limit = GUESS_PAGE_SIZE, cursor } = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", String(cursor));
  return requestInfera(`${GUESS_LIST_PATH}?${params.toString()}`, { token });
}

async function fetchLongTermMemoryRegistry(token) {
  return requestInfera(GUESS_REGISTRY_PATH, { token });
}

async function fetchLongTermMemoryItem(token, itemId) {
  return requestInfera(`${GUESS_ITEMS_PATH}/${encodeURIComponent(itemId)}`, { token });
}

async function respondToLongTermMemoryGuess(token, guessId, body, idempotencyKey) {
  return requestInfera(`${GUESS_LIST_PATH}/${encodeURIComponent(guessId)}/respond`, {
    method: "POST",
    token,
    body,
    headers: { "Idempotency-Key": idempotencyKey }
  });
}

export { fetchLongTermMemoryGuesses, fetchLongTermMemoryRegistry, fetchLongTermMemoryItem, respondToLongTermMemoryGuess };
