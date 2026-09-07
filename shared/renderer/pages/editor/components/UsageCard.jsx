import { clampPercent, percentLabel } from "../../../utils/format.js";
import { formatEncodingSpeed } from "../editor.utils.js";
import { Activity } from "lucide-react";

function UsageCard({ activeEncodingJob, device, usage }) {
  const isCpu = device === "cpu";
  const data = isCpu ? usage?.cpu : usage?.gpu;
  const total = isCpu ? data?.usage : data?.total;
  const hasActiveHardwareEncoding = !isCpu && activeEncodingJob?.hardwareEncoding;
  const isGpuRestricted = !isCpu && data?.status === "restricted";
  const statusLabel = Number.isFinite(Number(data?.total))
    ? "可读取"
    : data?.status === "sampling"
      ? "采样中"
      : data?.status === "restricted"
        ? "系统受限"
        : "不可用";

  return (
    <div className="usage-card">
      <div className="usage-header">
        <Activity size={18} />
        <div>
          <strong>{isCpu ? "CPU 使用情况" : "GPU 使用情况"}</strong>
          <span>
            {isCpu
              ? "系统总负载"
              : hasActiveHardwareEncoding
                ? "硬件编码中"
                : isGpuRestricted
                  ? "硬件编码运行状态"
                  : "总利用率与编码引擎"}
          </span>
        </div>
        <b>{percentLabel(total)}</b>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${clampPercent(total)}%` }} />
      </div>
      {isCpu ? (
        <div className="usage-grid">
          <span>线程</span>
          <strong>{usage?.cpu?.logicalCores || "-"}</strong>
          <span>内存</span>
          <strong>{usage?.cpu?.totalMemoryGb ? `${usage.cpu.totalMemoryGb} GB` : "-"}</strong>
        </div>
      ) : (
        <div className="usage-grid">
          <span>{hasActiveHardwareEncoding ? "编码速度" : "Video Encode"}</span>
          <strong>{hasActiveHardwareEncoding ? formatEncodingSpeed(activeEncodingJob) : percentLabel(data?.videoEncode)}</strong>
          <span>3D</span>
          <strong>{percentLabel(data?.threeD)}</strong>
          <span>{hasActiveHardwareEncoding ? "编码器" : "Compute"}</span>
          <strong>{hasActiveHardwareEncoding ? activeEncodingJob.encoder : percentLabel(data?.compute)}</strong>
          <span>状态</span>
          <strong>{hasActiveHardwareEncoding ? "硬件编码" : statusLabel}</strong>
        </div>
      )}
    </div>
  );
}

export { UsageCard };
