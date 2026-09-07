

function toggleId(ids, id) {
  const normalizedId = String(id);
  const current = (ids || []).map(String);
  return current.includes(normalizedId) ? current.filter((item) => item !== normalizedId) : [...current, normalizedId];
}

export { toggleId };
