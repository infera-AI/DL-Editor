

function normalizeAuthPayload(result, fallbackAccountName = "") {
  const user = result?.user || result?.profile || {};

  return {
    token: result?.token || "",
    refreshToken: result?.refreshToken || result?.refresh_token || "",
    userId: result?.userId || result?.user_id || user?.userId || user?.user_id || user?.id || "",
    accountName:
      result?.accountName ||
      result?.account_name ||
      result?.account ||
      result?.username ||
      user?.accountName ||
      user?.account_name ||
      user?.account ||
      user?.username ||
      fallbackAccountName ||
      "",
    displayName:
      result?.displayName ||
      result?.display_name ||
      result?.name ||
      user?.displayName ||
      user?.display_name ||
      user?.name ||
      "",
    phone: result?.phone || user?.phone || "",
    email: result?.email || user?.email || "",
    nickname: result?.nickname || user?.nickname || "",
    avatar: result?.avatar || user?.avatar || "",
    exist: Boolean(result?.exist),
    password: Boolean(result?.password)
  };
}

export { normalizeAuthPayload };
