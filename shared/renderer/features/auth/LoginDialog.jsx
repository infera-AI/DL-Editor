import { APP_NAME } from "../../app/config.js";
import { getAuthAccountName, getAuthDisplayName } from "./auth.utils.js";
import { LockKeyhole, Mail, UserRound } from "lucide-react";

function LoginDialog({
  authState,
  form,
  emailCodeCooldown,
  loginMethod,
  loginStatus,
  mode,
  onChange,
  onClose,
  onLoginMethodChange,
  onLogout,
  onModeChange,
  onSendCode,
  onSubmit
}) {
  const isChecking = loginStatus.status === "checking";
  const isSendingCode = loginStatus.status === "sending";
  const isBusy = isChecking || isSendingCode;
  const isRegister = mode === "register";
  const usesEmailCode = isRegister || loginMethod === "code";
  const usesPassword = isRegister || loginMethod === "password";
  const displayName = getAuthDisplayName(authState);
  const accountName = getAuthAccountName(authState);
  const isAuthenticated = Boolean(authState?.token);

  if (isAuthenticated) {
    return (
      <div
        className="modal-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
        role="presentation"
      >
        <section aria-modal="true" className="login-dialog" role="dialog">
          <div className="dialog-heading login-heading">
            <UserRound size={18} />
            <div>
              <strong>账号</strong>
              <span>{displayName || APP_NAME}</span>
            </div>
          </div>
          <div className="login-account">
            <div className="login-account-identity">
              <strong>{displayName}</strong>
              {accountName && accountName !== displayName && <span>{accountName}</span>}
            </div>
            <button onClick={onLogout} type="button">
              退出
            </button>
          </div>
          <div className="dialog-actions login-actions">
            <button className="ghost-button" onClick={onClose} type="button">
              关闭
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (!isBusy && event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section aria-modal="true" className="login-dialog" role="dialog">
        <div className="dialog-heading login-heading">
          <UserRound size={18} />
          <div>
            <strong>{isRegister ? "注册" : "登录"}</strong>
            <span>{isRegister ? `创建 ${APP_NAME} 账号` : APP_NAME}</span>
          </div>
        </div>
        <div aria-label="账号操作" className="login-mode-switch" role="tablist">
          <button
            aria-selected={!isRegister}
            className={`login-mode-button ${!isRegister ? "active" : ""}`}
            disabled={isBusy}
            onClick={() => onModeChange("login")}
            role="tab"
            type="button"
          >
            登录
          </button>
          <button
            aria-selected={isRegister}
            className={`login-mode-button ${isRegister ? "active" : ""}`}
            disabled={isBusy}
            onClick={() => onModeChange("register")}
            role="tab"
            type="button"
          >
            注册
          </button>
        </div>
        {!isRegister && (
          <div aria-label="登录方式" className="login-method-switch" role="tablist">
            <button
              aria-selected={loginMethod === "password"}
              className={loginMethod === "password" ? "active" : ""}
              disabled={isBusy}
              onClick={() => onLoginMethodChange("password")}
              role="tab"
              type="button"
            >
              密码登录
            </button>
            <button
              aria-selected={loginMethod === "code"}
              className={loginMethod === "code" ? "active" : ""}
              disabled={isBusy}
              onClick={() => onLoginMethodChange("code")}
              role="tab"
              type="button"
            >
              邮箱验证码登录
            </button>
          </div>
        )}
        <form
          className="login-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="login-field">
            <span>{usesEmailCode ? "邮箱" : "账号"}</span>
            <div className="login-input-wrap">
              <Mail size={15} />
              <input
                autoComplete="username"
                disabled={isBusy}
                name="identifier"
                onChange={(event) => onChange({ identifier: event.target.value })}
                placeholder={usesEmailCode ? "邮箱地址" : "邮箱、手机号或登录名"}
                type={usesEmailCode ? "email" : "text"}
                value={form.identifier}
              />
            </div>
          </label>
          {usesEmailCode && (
            <div className="login-field">
              <span>邮箱验证码</span>
              <div className="login-code-row">
                <div className="login-input-wrap">
                  <LockKeyhole size={15} />
                  <input
                    aria-label="邮箱验证码"
                    autoComplete="one-time-code"
                    disabled={isBusy}
                    inputMode="numeric"
                    maxLength={16}
                    name="verificationCode"
                    onChange={(event) => onChange({ verificationCode: event.target.value })}
                    placeholder="输入验证码"
                    type="text"
                    value={form.verificationCode}
                  />
                </div>
                <button
                  className="login-code-button"
                  disabled={isBusy || emailCodeCooldown > 0}
                  onClick={onSendCode}
                  type="button"
                >
                  {isSendingCode ? "发送中" : emailCodeCooldown > 0 ? `${emailCodeCooldown}s 后重发` : "发送验证码"}
                </button>
              </div>
            </div>
          )}
          {usesPassword && (
            <label className="login-field">
              <span>密码</span>
              <div className="login-input-wrap">
                <LockKeyhole size={15} />
                <input
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  disabled={isBusy}
                  onChange={(event) => onChange({ password: event.target.value })}
                  placeholder="••••••••"
                  type="password"
                  value={form.password}
                />
              </div>
            </label>
          )}
          {isRegister && (
            <label className="login-field">
              <span>确认密码</span>
              <div className="login-input-wrap">
                <LockKeyhole size={15} />
                <input
                  autoComplete="new-password"
                  disabled={isBusy}
                  onChange={(event) => onChange({ confirmPassword: event.target.value })}
                  placeholder="再次输入密码"
                  type="password"
                  value={form.confirmPassword}
                />
              </div>
            </label>
          )}
          <label className="login-remember">
            <input
              checked={form.remember}
              disabled={isBusy}
              onChange={(event) => onChange({ remember: event.target.checked })}
              type="checkbox"
            />
            <span>记住登录</span>
          </label>
          {loginStatus.message && <div className={`login-status ${loginStatus.status}`}>{loginStatus.message}</div>}
          <div className="dialog-actions login-actions">
            <button className="ghost-button" disabled={isBusy} onClick={onClose} type="button">
              取消
            </button>
            <button className="primary-button" disabled={isBusy} type="submit">
              {isChecking ? (isRegister ? "注册中" : "登录中") : isRegister ? "注册并登录" : loginMethod === "code" ? "验证并登录" : "登录"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export { LoginDialog };
