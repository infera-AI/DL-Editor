import { getLocalDateKey } from "../../../utils/date.js";
import { formatBytes } from "../../../utils/format.js";
import { saveResearchDownload } from "../research-download.js";
import { createResearchDailyExport, fetchResearchDailyExport, fetchResearchResources } from "../research.api.js";
import { formatResearchNumber, getResearchUserLabel } from "../research.utils.js";
import { useEffect, useState } from "react";

function ResearchBatchExportModal({ initialUserId, onClose, token, users }) {
  const [userId, setUserId] = useState(initialUserId || "");
  const [date, setDate] = useState(() => getLocalDateKey());
  const [includeMedia, setIncludeMedia] = useState(true);
  const [countState, setCountState] = useState({ status: "idle", total: 0, video: 0, audio: 0, message: "" });
  const [jobState, setJobState] = useState({ status: "idle", data: null, message: "" });
  const running = jobState.status === "running";

  useEffect(() => {
    let cancelled = false;
    if (!userId || !date) {
      setCountState({ status: "idle", total: 0, video: 0, audio: 0, message: "Select a user and date to check available resources." });
      return undefined;
    }
    setCountState({ status: "loading", total: 0, video: 0, audio: 0, message: "Checking available resources..." });
    fetchResearchResources(token, { userId, from: date, to: date }, { limit: 1, offset: 0 })
      .then((data) => {
        if (cancelled) return;
        const total = Number(data?.total || 0);
        const video = Number(data?.video_count || 0);
        const audio = Number(data?.audio_count || 0);
        setCountState({
          status: "ready",
          total,
          video,
          audio,
          message: total > 0 ? `Found ${formatResearchNumber(video)} videos and ${formatResearchNumber(audio)} audio assets.` : "No parsed media is available for this user and date."
        });
      })
      .catch((error) => {
        if (!cancelled) setCountState({ status: "error", total: 0, video: 0, audio: 0, message: error.message || "Unable to count resources" });
      });
    return () => { cancelled = true; };
  }, [date, token, userId]);

  async function startExport() {
    if (!userId || !date || countState.total <= 0 || running) return;
    setJobState({ status: "running", data: null, message: "Queuing export..." });
    try {
      let data = await createResearchDailyExport(token, {
        user_id: Number(userId),
        date,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai",
        include_media: includeMedia
      });
      while (data.status !== "READY") {
        if (data.status === "FAILED") throw new Error(data.error_message || "Batch export failed");
        const mode = data.include_media === false ? "parsed data only" : "media and parsed data";
        setJobState({ status: "running", data, message: `${data.status === "PROCESSING" ? "Packaging" : "Queued"} ${formatResearchNumber(data.asset_count)} assets (${mode}).` });
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        data = await fetchResearchDailyExport(token, data.job_id);
      }
      await saveResearchDownload(data, data.filename || "research-daily-export.zip");
      const mode = data.include_media === false ? "parsed data only" : "media and parsed data";
      setJobState({
        status: "ready",
        data,
        message: `${data.cached ? "Cached package" : "Package ready"}: ${mode}. ${formatResearchNumber(data.asset_count)} assets, ${formatBytes(data.size_bytes) || "0 B"}.`
      });
    } catch (error) {
      setJobState({ status: "error", data: null, message: error.message || "Batch export failed" });
    }
  }

  return (
    <div className="research-modal" onClick={running ? undefined : onClose}>
      <div className="research-modal-panel research-export-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>Batch export</h2>
          <button className="ghost-button" disabled={running} onClick={onClose} type="button">Close</button>
        </header>
        <div className="research-modal-body">
          <div className="research-batch-fields">
            <label><span>User *</span><select disabled={running} onChange={(event) => setUserId(event.target.value)} value={userId}>
              <option value="">Select a user</option>
              {users.map((user) => <option key={user.user_id || user.id} value={user.user_id || user.id}>{getResearchUserLabel(user)}</option>)}
            </select></label>
            <label><span>Date *</span><input disabled={running} onChange={(event) => setDate(event.target.value)} type="date" value={date} /></label>
          </div>
          <div className="research-export-summary">
            <div><span>Videos</span><strong>{countState.status === "loading" ? "--" : formatResearchNumber(countState.video)}</strong></div>
            <div><span>Audio</span><strong>{countState.status === "loading" ? "--" : formatResearchNumber(countState.audio)}</strong></div>
            <div><span>Total assets</span><strong>{countState.status === "loading" ? "--" : formatResearchNumber(countState.total)}</strong></div>
          </div>
          <label className="research-export-media-option">
            <input checked={includeMedia} disabled={running} onChange={(event) => setIncludeMedia(event.target.checked)} type="checkbox" />
            <span><strong>Include video and audio files</strong><small>Turn this off to export metadata and parsed data only.</small></span>
          </label>
          <div className={`research-export-status ${countState.status === "error" || jobState.status === "error" ? "error" : ""}`}>
            {jobState.status === "idle" ? countState.message : jobState.message}
          </div>
          {jobState.status === "ready" && jobState.data?.download_url && (
            <a className="secondary-button research-export-download" download={jobState.data.filename} href={jobState.data.download_url} rel="noreferrer">Download {jobState.data.filename}</a>
          )}
        </div>
        <footer>
          <span>Parsed media only</span>
          <div>
            <button className="ghost-button" disabled={running} onClick={onClose} type="button">Cancel</button>
            <button className="primary-button" disabled={running || countState.status !== "ready" || countState.total <= 0} onClick={startExport} type="button">
              {running ? "Packaging" : "Start export"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export { ResearchBatchExportModal };
