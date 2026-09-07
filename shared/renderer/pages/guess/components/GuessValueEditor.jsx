import { canonicalizeGuessToken, displayGuessDraftField, getGuessListValueKey, normalizeGuessTokenKey, splitGuessDraftList } from "../guess-value.js";
import { GuessChoiceChips } from "./GuessChoiceChips.jsx";

function GuessValueEditor({ disabled, mode, onChange, options, originalValue, text }) {
  const multiple = Boolean(getGuessListValueKey(originalValue));
  const showChips = mode === "simple" && options.length > 1;
  const selected = multiple
    ? splitGuessDraftList(text).map((item) => canonicalizeGuessToken(item, options) || item)
    : [canonicalizeGuessToken(text, options) || String(text ?? "").trim()].filter(Boolean);

  function toggleOption(option) {
    if (multiple) {
      const current = splitGuessDraftList(text).map((item) => canonicalizeGuessToken(item, options) || item);
      const key = normalizeGuessTokenKey(option);
      const exists = current.some((item) => normalizeGuessTokenKey(item) === key);
      const next = exists
        ? current.filter((item) => normalizeGuessTokenKey(item) !== key)
        : [...current, option];
      onChange(next.join("、"));
      return;
    }
    onChange(String(option));
  }

  return (
    <>
      {showChips ? (
        <>
          <p className="guess-choice-hint">{multiple ? "点选更准确的项，可多选" : "点选更准确的值，不用自己猜该填什么"}</p>
          <GuessChoiceChips disabled={disabled} onToggle={toggleOption} options={options} selected={selected} />
        </>
      ) : null}
      {mode === "simple" ? (
        <input
          className="text-input"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={showChips ? (multiple ? "也可填写其他项，用顿号分隔" : "也可填写其他说法") : undefined}
          value={mode === "simple" ? displayGuessDraftField(text, options, multiple) : text}
        />
      ) : (
        <textarea
          className="text-input guess-json-input"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          value={text}
        />
      )}
    </>
  );
}

export { GuessValueEditor };
