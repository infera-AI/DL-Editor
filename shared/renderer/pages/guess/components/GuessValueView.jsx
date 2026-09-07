import { formatGuessToken, getGuessValueTokens } from "../guess-value.js";

function GuessValueView({ value }) {
  const tokens = getGuessValueTokens(value);
  if (!tokens.length) return <p className="guess-value-preview">-</p>;
  return (
    <div className="guess-value-chips">
      {tokens.map((token, index) => (
        <span className="guess-value-chip" key={`${String(token)}-${index}`}>
          {formatGuessToken(token)}
        </span>
      ))}
    </div>
  );
}

export { GuessValueView };
