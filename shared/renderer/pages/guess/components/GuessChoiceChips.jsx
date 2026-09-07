import { formatGuessToken, normalizeGuessTokenKey } from "../guess-value.js";

function GuessChoiceChips({ disabled, onToggle, options, selected }) {
  const selectedSet = new Set(selected.map((item) => normalizeGuessTokenKey(item)));
  return (
    <div className="guess-choice-chips">
      {options.map((option) => {
        const active = selectedSet.has(normalizeGuessTokenKey(option));
        return (
          <button
            className={active ? "guess-choice-chip active" : "guess-choice-chip"}
            disabled={disabled}
            key={String(option)}
            onClick={() => onToggle(option)}
            type="button"
          >
            {formatGuessToken(option)}
          </button>
        );
      })}
    </div>
  );
}

export { GuessChoiceChips };
