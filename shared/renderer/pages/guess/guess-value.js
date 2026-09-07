import { GUESS_ENUM_OPTIONS_BY_KEY, GUESS_TOKEN_FAMILIES, GUESS_VALUE_LABELS, GUESS_VISIBLE_STATUSES } from "./guess.constants.js";

function isGuessConflictError(error) {
  const status = Number(error?.status || error?.statusCode) || 0;
  const message = String(error?.message || "");
  const errorCode = String(error?.errorCode || error?.error_code || "");
  return (
    status === 409 ||
    /\(409\)/.test(message) ||
    /stale_row_version|guess_already_resolved|guess_support_stale|idempotency_key_reused/.test(errorCode) ||
    /already been resolved|changed since it was read|supporting this guess changed/i.test(message)
  );
}

function isVisibleGuess(guess) {
  return GUESS_VISIBLE_STATUSES.has(String(guess?.status || ""));
}

function isGuessTextValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === "text" && typeof value.text === "string";
}

function isSimpleGuessValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === "value" && (value.value == null || ["string", "number", "boolean"].includes(typeof value.value));
}

function isPrimitiveGuessPart(value) {
  return value == null || ["string", "number", "boolean"].includes(typeof value);
}

function getGuessListValueKey(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  for (const key of ["items", "value", "places", "venues", "restrictions"]) {
    if (Array.isArray(value[key]) && value[key].every(isPrimitiveGuessPart)) return key;
  }
  return "";
}

function extractGuessItemPart(item) {
  if (isPrimitiveGuessPart(item)) return item == null ? null : item;
  if (!item || typeof item !== "object") return null;
  if (item.status && item.status !== "active") return null;
  if (item.value != null && isPrimitiveGuessPart(item.value)) return item.value;
  if (typeof item.text === "string" && item.text) return item.text;
  if (typeof item.name === "string" && item.name) return item.name;
  if (typeof item.label === "string" && item.label) return item.label;
  return null;
}

function toGuessClaimValue(value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return value;
  if (isSimpleGuessValue(value)) return value;
  for (const key of ["items", "restrictions", "places", "venues"]) {
    if (!Array.isArray(value[key])) continue;
    const parts = value[key].map(extractGuessItemPart).filter((item) => item != null && item !== "");
    if (parts.length) return { [key]: parts };
  }
  if ("value" in value && isPrimitiveGuessPart(value.value) && value.value != null && value.value !== "") {
    return { value: value.value };
  }
  if (typeof value.text === "string" && value.text) return { text: value.text };
  return value;
}

function normalizeGuessTokenKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatGuessToken(value) {
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "number") return String(value);
  const text = String(value ?? "").trim();
  if (!text) return "";
  const key = normalizeGuessTokenKey(text);
  if (key === "true" || key === "yes") return "是";
  if (key === "false" || key === "no") return "否";
  if (GUESS_VALUE_LABELS[key]) return GUESS_VALUE_LABELS[key];
  if (/^[a-z0-9]+(?:[_-][a-z0-9]+)+$/i.test(text)) return text.replace(/[_-]+/g, " ");
  return text;
}

function uniqueGuessTokens(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (value == null || value === "") continue;
    const token = typeof value === "boolean" || typeof value === "number" ? String(value) : String(value).trim();
    if (!token) continue;
    const key = normalizeGuessTokenKey(token);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(token);
  }
  return result;
}

function splitGuessDraftList(text) {
  return uniqueGuessTokens(
    String(text ?? "")
      .split(/[、,，]/)
      .map((part) => part.trim())
  );
}

function canonicalizeGuessToken(text, options = []) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return "";
  const key = normalizeGuessTokenKey(trimmed);
  for (const option of options) {
    if (normalizeGuessTokenKey(option) === key) return String(option);
    if (normalizeGuessTokenKey(formatGuessToken(option)) === key) return String(option);
  }
  for (const [canonical, label] of Object.entries(GUESS_VALUE_LABELS)) {
    if (canonical === key || normalizeGuessTokenKey(label) === key) {
      const matched = options.find((option) => normalizeGuessTokenKey(option) === canonical);
      return matched == null ? canonical : String(matched);
    }
  }
  return trimmed;
}

function parseGuessBoolean(text) {
  const key = normalizeGuessTokenKey(canonicalizeGuessToken(text, ["true", "false"]));
  if (["false", "no", "0"].includes(key) || key === normalizeGuessTokenKey("否")) return false;
  if (["true", "yes", "1"].includes(key) || key === normalizeGuessTokenKey("是")) return true;
  throw new Error("请选择是或否");
}

function getGuessValueTokens(value, seen) {
  if (value == null || value === "") return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return [value];
  if (typeof value !== "object") return [];
  const nextSeen = seen || new Set();
  if (nextSeen.has(value)) return [];
  nextSeen.add(value);
  if (Array.isArray(value)) return uniqueGuessTokens(value.flatMap((item) => getGuessValueTokens(item, nextSeen)));
  if (isSimpleGuessValue(value)) return value.value == null ? [] : [value.value];
  const listKey = getGuessListValueKey(value);
  if (listKey) return uniqueGuessTokens(value[listKey]);
  for (const key of ["items", "value", "text", "label", "name", "place", "summary_text", "subject_text"]) {
    if (value[key] == null || value[key] === "") continue;
    const tokens = getGuessValueTokens(value[key], nextSeen);
    if (tokens.length) return tokens;
  }
  return uniqueGuessTokens(Object.values(value).flatMap((item) => getGuessValueTokens(item, nextSeen)));
}

function formatGuessValue(value, seen) {
  return uniqueGuessTokens(getGuessValueTokens(value, seen).map(formatGuessToken)).join("、");
}

function indexGuessRegistry(manifest) {
  const map = {};
  for (const entry of manifest?.keys || []) {
    if (entry?.memory_key) map[entry.memory_key] = entry;
  }
  return map;
}

function collectRegistryCommonValues(entry) {
  const values = [];
  const vocab = entry?.value_vocabulary;
  if (Array.isArray(vocab?.common_values)) values.push(...vocab.common_values);
  if (vocab?.fields && typeof vocab.fields === "object") {
    for (const field of Object.values(vocab.fields)) {
      if (Array.isArray(field?.common_values)) values.push(...field.common_values);
    }
  }
  return values;
}

function getGuessChoiceOptions(memoryKey, registryEntry, value) {
  if (isSimpleGuessValue(value) && typeof value.value === "boolean") return ["true", "false"];
  if (registryEntry?.claim_schema_name === "BooleanChoiceV1") return ["true", "false"];
  const current = getGuessValueTokens(value).map((item) => String(item));
  const family = GUESS_TOKEN_FAMILIES.find((group) => current.some((token) => group.includes(normalizeGuessTokenKey(token)))) || [];
  const options = uniqueGuessTokens([
    ...current,
    ...(GUESS_ENUM_OPTIONS_BY_KEY[memoryKey] || []),
    ...family,
    ...collectRegistryCommonValues(registryEntry)
  ]);
  return options.slice(0, 36);
}

function getGuessDraftConfig(value) {
  const claim = toGuessClaimValue(value);
  if (isSimpleGuessValue(claim)) {
    return { mode: "simple", text: claim.value == null ? "" : String(claim.value) };
  }
  if (isGuessTextValue(claim)) {
    return { mode: "simple", text: claim.text };
  }
  const listKey = getGuessListValueKey(claim);
  if (listKey) {
    return { mode: "simple", text: claim[listKey].map((item) => String(item ?? "")).filter(Boolean).join("、") };
  }
  return { mode: "json", text: claim ? JSON.stringify(claim, null, 2) : "{\n  \n}" };
}

function getGuessDraftError(mode, text, originalValue) {
  if (mode === "simple") {
    const listKey = getGuessListValueKey(originalValue);
    if (listKey) {
      return splitGuessDraftList(text).length ? "" : "请至少选择或填写一项";
    }
    if (!String(text ?? "").trim()) {
      return isSimpleGuessValue(originalValue) && typeof originalValue.value === "boolean"
        ? "请选择是或否"
        : "请选择或填写纠正后的值";
    }
    return "";
  }
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return "请输入有效的 JSON 对象";
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "值需要是 JSON 对象";
  } catch {
    return "JSON 格式不正确";
  }
  return "";
}

function parseGuessValueDraft(mode, text, originalValue, options = []) {
  const draftError = getGuessDraftError(mode, text, originalValue);
  if (draftError) throw new Error(draftError);
  if (mode === "simple") {
    const listKey = getGuessListValueKey(originalValue);
    if (listKey) {
      const parts = splitGuessDraftList(text).map((part) => canonicalizeGuessToken(part, options)).filter(Boolean);
      return { ...originalValue, [listKey]: parts };
    }
    if (isGuessTextValue(originalValue)) {
      return { text: String(text ?? "").trim() };
    }
    if (isSimpleGuessValue(originalValue) && typeof originalValue.value === "boolean") {
      return { value: parseGuessBoolean(text) };
    }
    const canonical = canonicalizeGuessToken(text, options);
    if (isSimpleGuessValue(originalValue) && typeof originalValue.value === "number") {
      const numeric = Number(canonical);
      if (!Number.isFinite(numeric)) throw new Error("请输入有效数字");
      return { value: numeric };
    }
    return { value: canonical };
  }
  const trimmed = String(text ?? "").trim();
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("JSON 格式不正确");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("值需要是 JSON 对象");
  }
  return parsed;
}

function displayGuessDraftField(text, options, multiple) {
  const raw = String(text ?? "");
  if (multiple) {
    const parts = splitGuessDraftList(raw);
    if (!parts.length) return raw;
    return parts.map((part) => formatGuessToken(canonicalizeGuessToken(part, options) || part)).join("、");
  }
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  return formatGuessToken(canonicalizeGuessToken(trimmed, options) || trimmed);
}

export { isGuessConflictError, isVisibleGuess, isGuessTextValue, isSimpleGuessValue, isPrimitiveGuessPart, getGuessListValueKey, extractGuessItemPart, toGuessClaimValue, normalizeGuessTokenKey, formatGuessToken, uniqueGuessTokens, splitGuessDraftList, canonicalizeGuessToken, parseGuessBoolean, getGuessValueTokens, formatGuessValue, indexGuessRegistry, collectRegistryCommonValues, getGuessChoiceOptions, getGuessDraftConfig, getGuessDraftError, parseGuessValueDraft, displayGuessDraftField };
