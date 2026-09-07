import { Archive, HardDrive, Upload } from "lucide-react";

function AutomationOptions({ onChange, options }) {
  const rows = [
    { icon: <Upload size={15} />, id: "autoUpload", label: "自动上传", title: "处理完成后上传降帧视频" },
    { icon: <Archive size={15} />, id: "autoBackup", label: "自动备份", title: "处理完成后备份原视频" },
    { icon: <HardDrive size={15} />, id: "autoClearLocal", label: "自动清除本地文件", title: "上传后清除降帧文件，备份后清除原视频" }
  ];

  return (
    <div className="automation-options">
      {rows.map((row) => (
        <label className="automation-option" key={row.id} title={row.title}>
          <input
            checked={Boolean(options[row.id])}
            onChange={(event) => onChange(row.id, event.target.checked)}
            type="checkbox"
          />
          <span className="automation-check" />
          {row.icon}
          <span>{row.label}</span>
        </label>
      ))}
    </div>
  );
}

export { AutomationOptions };
