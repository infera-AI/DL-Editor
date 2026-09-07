import { LockKeyhole } from "lucide-react";

function EngineGate({ error, label = "Engine", onChange, onSubmit, title = "DL Engine", value }) {
  return (
    <section className="engine-page">
      <form
        className="engine-gate"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="engine-gate-heading">
          <LockKeyhole size={18} />
          <div>
            <strong>{title}</strong>
            <span>{label}</span>
          </div>
        </div>
        <label className="login-field">
          <span>密码</span>
          <div className="login-input-wrap">
            <LockKeyhole size={15} />
            <input
              autoComplete="current-password"
              autoFocus
              onChange={(event) => onChange(event.target.value)}
              placeholder="输入密码"
              type="password"
              value={value}
            />
          </div>
        </label>
        {error && <div className="login-status error">{error}</div>}
        <button className="primary-button" type="submit">
          进入
        </button>
      </form>
    </section>
  );
}

export { EngineGate };
