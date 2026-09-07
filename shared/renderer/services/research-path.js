

function buildResearchPath(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  return `/admin/research${path}${query.toString() ? `?${query.toString()}` : ""}`;
}

export { buildResearchPath };
