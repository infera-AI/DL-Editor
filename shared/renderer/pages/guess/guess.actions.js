import { createInferaIdempotencyKey } from "../../services/request-id.js";
import { indexGuessRegistry, isGuessConflictError, isVisibleGuess } from "./guess-value.js";
import { fetchLongTermMemoryGuesses, fetchLongTermMemoryItem, fetchLongTermMemoryRegistry, respondToLongTermMemoryGuess } from "./guess.api.js";
import { GUESS_PAGE_SIZE } from "./guess.constants.js";
import { selectGuessAfterRemoval, sortGuessItems } from "./guess.utils.js";

function createGuessActions({
  authState,
  guessRequestRef,
  setGuessState,
  setShowLogin
}) {
  async function loadGuesses(authOverride = authState) {
    const token = authOverride?.token;
    const requestId = ++guessRequestRef.current;
    if (!token) {
      setGuessState({
        status: "auth",
        items: [],
        itemMap: {},
        registryMap: {},
        selectedId: null,
        nextCursor: null,
        message: "请先登录后查看 Guess",
        notice: ""
      });
      return;
    }

    setGuessState((current) => ({ ...current, status: "loading", message: "" }));
    try {
      const [page, registry] = await Promise.all([
        fetchLongTermMemoryGuesses(token, { limit: GUESS_PAGE_SIZE }),
        fetchLongTermMemoryRegistry(token).catch(() => null)
      ]);
      if (requestId !== guessRequestRef.current) return;
      const items = sortGuessItems((page?.items || []).filter(isVisibleGuess));
      const itemIds = [...new Set(items.map((guess) => guess.resulting_item_id).filter(Boolean))];
      const itemEntries = await Promise.all(
        itemIds.map(async (itemId) => {
          try {
            return [itemId, await fetchLongTermMemoryItem(token, itemId)];
          } catch (error) {
            return [itemId, { error: error.message || "无法读取这条记忆" }];
          }
        })
      );
      if (requestId !== guessRequestRef.current) return;
      const itemMap = Object.fromEntries(itemEntries);
      const registryMap = indexGuessRegistry(registry);
      setGuessState((current) => ({
        status: items.length ? "ready" : "empty",
        items,
        itemMap,
        registryMap: Object.keys(registryMap).length ? registryMap : current.registryMap || {},
        selectedId: items.some((item) => item.id === current.selectedId) ? current.selectedId : items[0]?.id ?? null,
        nextCursor: page?.next_cursor ?? null,
        message: "",
        notice: ""
      }));
    } catch (error) {
      if (requestId !== guessRequestRef.current) return;
      setGuessState((current) => ({
        ...current,
        status: "error",
        message: error.message || "无法读取 Guess"
      }));
    }
  }

  async function respondToGuess(guess, payload) {
    const token = authState?.token;
    if (!token) {
      setShowLogin(true);
      throw new Error("请先登录后再反馈 Guess");
    }

    try {
      const result = await respondToLongTermMemoryGuess(
        token,
        guess.id,
        {
          response_type: payload.responseType,
          expected_row_version: guess.row_version,
          ...(payload.correctedValue ? { corrected_value: payload.correctedValue } : {}),
          ...(payload.comment ? { comment: payload.comment } : {})
        },
        createInferaIdempotencyKey(`guess-respond-${guess.id}`)
      );
      const nextGuess = result?.guess;
      const nextItem = result?.item;
      setGuessState((current) => {
        const previous = current.items;
        const keepCurrent = nextGuess && isVisibleGuess(nextGuess);
        const items = sortGuessItems(
          keepCurrent
            ? previous.map((row) => (row.id === guess.id ? nextGuess : row))
            : previous.filter((row) => row.id !== guess.id)
        );
        const itemMap = { ...current.itemMap };
        if (nextItem?.id) itemMap[nextItem.id] = nextItem;
        return {
          ...current,
          status: items.length ? "ready" : "empty",
          items,
          itemMap,
          selectedId: keepCurrent ? guess.id : selectGuessAfterRemoval(items, guess.id, previous),
          notice: nextItem
            ? "已写入记忆"
            : nextGuess?.status === "rejected"
              ? "已拒绝该推测"
              : nextGuess?.status === "unsure"
                ? "已标记为不确定"
                : "已提交反馈"
        };
      });
    } catch (error) {
      if (isGuessConflictError(error)) {
        await loadGuesses(authState);
        throw new Error(error.message || "Guess 已变化，已重新加载");
      }
      throw error;
    }
  }

  return { loadGuesses, respondToGuess };
}

export { createGuessActions };
