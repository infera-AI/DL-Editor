import { GuessListButton } from "./components/GuessListButton.jsx";
import { GuessValueEditor } from "./components/GuessValueEditor.jsx";
import { GuessValueView } from "./components/GuessValueView.jsx";
import { getGuessChoiceOptions, getGuessDraftConfig, getGuessDraftError, parseGuessValueDraft, toGuessClaimValue } from "./guess-value.js";
import { GUESS_STATUS_FILTERS, GUESS_TIME_FILTERS } from "./guess.constants.js";
import { filterGuessItems, formatGuessDate, getGuessStatusLabel, sortGuessItems } from "./guess.utils.js";
import { CheckCheck, HelpCircle, LockKeyhole, Pencil, RotateCcw, Sparkles, TriangleAlert, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

function GuessPage({ authState, onLogin, onRefresh, onRespond, onSelect, state }) {
  const allItems = sortGuessItems(state.items || []);
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const items = filterGuessItems(allItems, { status: statusFilter, time: timeFilter, from: fromDate, to: toDate });
  const pendingItems = items.filter((item) => item.status === "pending");
  const resolvedItems = items.filter((item) => item.status === "confirmed" || item.status === "corrected");
  const unsureItems = items.filter((item) => item.status === "unsure");
  const pendingTotal = allItems.filter((item) => item.status === "pending").length;
  const resolvedTotal = allItems.filter((item) => item.status === "confirmed" || item.status === "corrected").length;
  const unsureTotal = allItems.filter((item) => item.status === "unsure").length;
  const selected = items.find((item) => item.id === state.selectedId) || items[0] || null;
  const relatedItem = selected?.resulting_item_id ? state.itemMap?.[selected.resulting_item_id] : null;
  const isPending = selected?.status === "pending";
  const isUnsure = selected?.status === "unsure";
  const sourceValue = isPending ? selected?.proposed_value : relatedItem && !relatedItem.error ? relatedItem.value : selected?.corrected_value || selected?.proposed_value;
  const claimValue = toGuessClaimValue(sourceValue);
  const registryEntry = selected?.memory_key ? state.registryMap?.[selected.memory_key] : null;
  const choiceOptions = getGuessChoiceOptions(selected?.memory_key, registryEntry, claimValue);
  const [draftMode, setDraftMode] = useState("simple");
  const [draftText, setDraftText] = useState("");
  const [comment, setComment] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [formError, setFormError] = useState("");
  const draftError = getGuessDraftError(draftMode, draftText, claimValue);
  const canSubmitDraft = !draftError;

  useEffect(() => {
    const value = isPending ? selected?.proposed_value : relatedItem && !relatedItem.error ? relatedItem.value : selected?.corrected_value || selected?.proposed_value;
    const draft = getGuessDraftConfig(value);
    setDraftMode(draft.mode);
    setDraftText(draft.text);
    setComment("");
    setCorrecting(false);
    setBusyAction("");
    setFormError("");
  }, [isPending, relatedItem, selected?.corrected_value, selected?.id, selected?.proposed_value, selected?.row_version, relatedItem?.row_version]);

  async function runAction(action, handler) {
    setBusyAction(action);
    setFormError("");
    try {
      await handler();
    } catch (error) {
      setFormError(error.message || "操作失败");
    } finally {
      setBusyAction("");
    }
  }

  async function submitResponse(responseType) {
    if (!selected) return;
    let correctedValue;
    if (responseType === "correct") {
      if (draftError) throw new Error(draftError);
      correctedValue = parseGuessValueDraft(draftMode, draftText, selected.proposed_value, choiceOptions);
    }
    await onRespond(selected, {
      responseType,
      correctedValue,
      comment: comment.trim() || undefined
    });
    setCorrecting(false);
  }

  if (!authState?.token || state.status === "auth") {
    return (
      <section className="research-login-page">
        <div className="research-login-card">
          <div className="research-login-icon">
            <LockKeyhole size={24} />
          </div>
          <div className="research-login-copy">
            <h1>登录后查看 Guess</h1>
            <p>使用当前账号查看系统推测，并对未反馈的条目做出选择。</p>
          </div>
          <button className="primary-button" onClick={onLogin} type="button">
            <UserRound size={16} />
            <span>登录</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="guess-page">
      <div className="guess-workspace">
        <header className="guess-toolbar">
          <div className="guess-toolbar-top">
            <div className="guess-toolbar-copy">
              <h1>Guess</h1>
              <p>
                {pendingTotal} 条待反馈
                {resolvedTotal ? ` · ${resolvedTotal} 条已确认` : ""}
                {unsureTotal ? ` · ${unsureTotal} 条不确定` : ""}
                {items.length !== allItems.length ? ` · 当前显示 ${items.length} 条` : ""}
              </p>
            </div>
            <button className="ghost-button" disabled={state.status === "loading"} onClick={onRefresh} type="button">
              <RotateCcw size={15} />
              <span>{state.status === "loading" ? "刷新中" : "刷新"}</span>
            </button>
          </div>
          <div className="guess-filters">
            <div className="guess-filter-chips" role="tablist" aria-label="按状态筛选">
              {GUESS_STATUS_FILTERS.map((filter) => (
                <button
                  aria-selected={statusFilter === filter.id}
                  className={statusFilter === filter.id ? "guess-filter-chip active" : "guess-filter-chip"}
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <select
              aria-label="按时间筛选"
              className="guess-filter-select"
              onChange={(event) => setTimeFilter(event.target.value)}
              value={timeFilter}
            >
              {GUESS_TIME_FILTERS.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
            {timeFilter === "custom" ? (
              <>
                <label className="guess-date-input">
                  <span>从</span>
                  <input onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} />
                </label>
                <label className="guess-date-input">
                  <span>到</span>
                  <input onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} />
                </label>
              </>
            ) : null}
          </div>
        </header>

        {state.status === "error" ? (
          <div className="guess-empty">
            <TriangleAlert size={28} />
            <h2>无法读取 Guess</h2>
            <p>{state.message || "请稍后重试。"}</p>
            <button className="primary-button" onClick={onRefresh} type="button">
              重新加载
            </button>
          </div>
        ) : state.status === "loading" && !allItems.length ? (
          <div className="guess-empty">
            <Sparkles size={28} />
            <h2>正在加载 Guess</h2>
            <p>正在读取当前账号的推测和已写入记忆。</p>
          </div>
        ) : !allItems.length ? (
          <div className="guess-empty">
            <HelpCircle size={28} />
            <h2>暂无 Guess</h2>
            <p>后台会根据已有记忆自动生成推测。稍后刷新即可。</p>
          </div>
        ) : (
          <div className="guess-body">
            <aside className="guess-list">
              {!items.length ? (
                <p className="guess-list-empty">没有符合筛选条件的条目</p>
              ) : (
                <>
                  {pendingItems.length > 0 && (
                    <div className="guess-list-group">
                      <span className="guess-list-label">待反馈</span>
                      {pendingItems.map((guess) => (
                        <GuessListButton
                          active={selected?.id === guess.id}
                          guess={guess}
                          item={null}
                          key={guess.id}
                          onSelect={onSelect}
                        />
                      ))}
                    </div>
                  )}
                  {resolvedItems.length > 0 && (
                    <div className="guess-list-group">
                      <span className="guess-list-label">已确认</span>
                      {resolvedItems.map((guess) => (
                        <GuessListButton
                          active={selected?.id === guess.id}
                          guess={guess}
                          item={state.itemMap?.[guess.resulting_item_id]}
                          key={guess.id}
                          onSelect={onSelect}
                        />
                      ))}
                    </div>
                  )}
                  {unsureItems.length > 0 && (
                    <div className="guess-list-group">
                      <span className="guess-list-label">不确定</span>
                      {unsureItems.map((guess) => (
                        <GuessListButton
                          active={selected?.id === guess.id}
                          guess={guess}
                          item={null}
                          key={guess.id}
                          onSelect={onSelect}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </aside>

            <section className="guess-detail">
              {selected ? (
                <>
                  {formatGuessDate(selected) ? <p className="guess-detail-date">{formatGuessDate(selected)}</p> : null}
                  <div className="guess-detail-head">
                    <span className={`guess-status ${selected.status}`}>{getGuessStatusLabel(selected.status)}</span>
                    <h2>{selected.question_text || "系统推测"}</h2>
                  </div>
                  {registryEntry?.description ? <p className="guess-key-hint">{registryEntry.description}</p> : null}
                  {selected.rationale_text ? (
                    <details className="guess-why" open>
                      <summary>为什么会这么问</summary>
                      <p>{selected.rationale_text}</p>
                    </details>
                  ) : null}

                  {isPending ? (
                    <div className="guess-editor">
                      <label>{correcting ? "纠正后的值" : "推测值"}</label>
                      {correcting ? (
                        <>
                          <GuessValueEditor
                            disabled={Boolean(busyAction)}
                            mode={draftMode}
                            onChange={setDraftText}
                            options={choiceOptions}
                            originalValue={selected.proposed_value}
                            text={draftText}
                          />
                          <label>备注（可选）</label>
                          <input
                            className="text-input"
                            disabled={Boolean(busyAction)}
                            maxLength={500}
                            onChange={(event) => setComment(event.target.value)}
                            placeholder="这次纠正的说明，保存后会显示在这里"
                            value={comment}
                          />
                        </>
                      ) : (
                        <GuessValueView value={claimValue} />
                      )}

                      {formError && <p className="guess-error">{formError}</p>}
                      {correcting && !formError && draftError && <p className="guess-error">{draftError}</p>}
                      {state.notice && !formError && !(correcting && draftError) && <p className="guess-notice">{state.notice}</p>}

                      <div className="guess-actions">
                        {correcting ? (
                          <>
                            <button
                              className="primary-button"
                              disabled={Boolean(busyAction) || !canSubmitDraft}
                              onClick={() => runAction("correct", () => submitResponse("correct"))}
                              type="button"
                            >
                              <Pencil size={15} />
                              <span>{busyAction === "correct" ? "提交中" : "提交纠正"}</span>
                            </button>
                            <button className="ghost-button" disabled={Boolean(busyAction)} onClick={() => setCorrecting(false)} type="button">
                              取消
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="primary-button"
                              disabled={Boolean(busyAction)}
                              onClick={() => runAction("confirm", () => submitResponse("confirm"))}
                              type="button"
                            >
                              <CheckCheck size={15} />
                              <span>{busyAction === "confirm" ? "提交中" : "确认"}</span>
                            </button>
                            <button className="ghost-button" disabled={Boolean(busyAction)} onClick={() => setCorrecting(true)} type="button">
                              <Pencil size={15} />
                              <span>纠正</span>
                            </button>
                            <button
                              className="ghost-button guess-danger-button"
                              disabled={Boolean(busyAction)}
                              onClick={() => runAction("reject", () => submitResponse("reject"))}
                              type="button"
                            >
                              <span>{busyAction === "reject" ? "提交中" : "拒绝"}</span>
                            </button>
                            <button
                              className="ghost-button"
                              disabled={Boolean(busyAction)}
                              onClick={() => runAction("unsure", () => submitResponse("unsure"))}
                              type="button"
                            >
                              <HelpCircle size={15} />
                              <span>{busyAction === "unsure" ? "提交中" : "不确定"}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : isUnsure ? (
                    <div className="guess-editor unsure">
                      <label>推测值</label>
                      <GuessValueView value={claimValue} />
                      {selected.response_text ? (
                        <>
                          <label>备注</label>
                          <p className="guess-comment">{selected.response_text}</p>
                        </>
                      ) : null}
                      {formError && <p className="guess-error">{formError}</p>}
                      {state.notice && !formError && <p className="guess-notice">{state.notice}</p>}
                    </div>
                  ) : (
                    <div className="guess-editor">
                      <label>记忆值</label>
                      {relatedItem?.error ? (
                        <p className="guess-error">{relatedItem.error}</p>
                      ) : !relatedItem ? (
                        <p className="guess-empty-copy">这条推测还没有对应记忆。</p>
                      ) : (
                        <GuessValueView value={claimValue} />
                      )}
                      {selected.response_text ? (
                        <>
                          <label>备注</label>
                          <p className="guess-comment">{selected.response_text}</p>
                        </>
                      ) : null}
                      {formError && <p className="guess-error">{formError}</p>}
                      {state.notice && !formError && <p className="guess-notice">{state.notice}</p>}
                    </div>
                  )}
                </>
              ) : (
                <div className="guess-empty">
                  <HelpCircle size={28} />
                  <h2>选择一条 Guess</h2>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </section>
  );
}

export { GuessPage };
