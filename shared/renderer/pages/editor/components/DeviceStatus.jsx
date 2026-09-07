import { percentLabel } from "../../../utils/format.js";
import { Cpu, Zap } from "lucide-react";

function DeviceStatus({ capabilities, device, encoder, usage }) {
  const cpuUsage = usage?.cpu?.usage;
  const gpuUsage = usage?.gpu?.total;
  const gpuUsageText =
    usage?.gpu?.status === "restricted" && !Number.isFinite(Number(gpuUsage))
      ? "利用率采样受系统限制"
      : `当前使用率 ${percentLabel(gpuUsage)}`;

  if (device === "cpu") {
    return (
      <div className="device-status">
        <Cpu size={16} />
        <div>
          <strong>{capabilities?.cpuModel || "正在检测 CPU"}</strong>
          <span>
            {capabilities
              ? `${capabilities.logicalCores} 线程 · 当前使用率 ${percentLabel(cpuUsage)}`
              : "正在读取处理器信息"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="device-status">
      <Zap size={16} />
      <div>
        <strong>{encoder}</strong>
        <span>
          {encoder !== "libx264" && encoder !== "检测中"
            ? `${capabilities?.gpuNames?.join(", ") || "GPU 已检测"} · ${gpuUsageText}`
            : "未发现硬件编码器，任务会自动回退 CPU"}
        </span>
      </div>
    </div>
  );
}

export { DeviceStatus };
