import { CalendarClock, FileSearch } from "lucide-react";

function StartTimeDialog({ editor, onCancel, onChange, onParseFileName, onSave }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <form
        className="time-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="dialog-heading">
          <CalendarClock size={18} />
          <strong>开始时间</strong>
        </div>
        <div className="dialog-fields">
          <label className="single-time-field">
            <span>时间</span>
            <input
              autoComplete="off"
              autoFocus
              className="text-input"
              onChange={(event) => onChange({ value: event.target.value, error: "" })}
              placeholder="2026-06-20 14:30:00"
              required
              type="text"
              value={editor.value}
            />
          </label>
          {editor.error && <span className="dialog-error">{editor.error}</span>}
        </div>
        <div className="dialog-actions">
          <button className="ghost-button file-name-parse-button" onClick={onParseFileName} title={editor.fileName} type="button">
            <FileSearch size={15} />
            <span>通过文件名解析</span>
          </button>
          <div className="dialog-confirm-actions">
            <button className="ghost-button" onClick={onCancel} type="button">
              取消
            </button>
            <button className="primary-button" type="submit">
              确定
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export { StartTimeDialog };
