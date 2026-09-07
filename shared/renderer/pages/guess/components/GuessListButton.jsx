import { formatGuessValue } from "../guess-value.js";
import { formatGuessDate, getGuessPreview, getGuessStatusLabel } from "../guess.utils.js";

function GuessListButton({ active, guess, item, onSelect }) {
  const preview = guess.status === "pending" ? "" : getGuessPreview(guess, item);
  const dateLabel = formatGuessDate(guess);
  const className = ["guess-list-item", active ? "active" : "", guess.status === "unsure" ? "unsure" : ""].filter(Boolean).join(" ");
  return (
    <button className={className} onClick={() => onSelect(guess.id)} type="button">
      {dateLabel ? <span className="guess-list-item-date">{dateLabel}</span> : null}
      <span className="guess-list-item-main">
        <span className={`guess-status ${guess.status}`}>{getGuessStatusLabel(guess.status)}</span>
        <strong>{guess.question_text || formatGuessValue(guess.proposed_value) || "系统推测"}</strong>
      </span>
      {preview ? <span className="guess-list-item-preview">{preview}</span> : null}
    </button>
  );
}

export { GuessListButton };
