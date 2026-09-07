import { formatDurationCompact } from "../utils/format.js";

function DurationValue({ value, referenceValue = value }) {
  const label = formatDurationCompact(value, referenceValue);

  if (!label) {
    return <span className="duration-value">--</span>;
  }

  return <span className="duration-value">{label}</span>;
}

export { DurationValue };
