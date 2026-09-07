import { ResearchParsedList } from "./ResearchParsedList.jsx";

function ResearchParsedPanel({ state }) {
  const data = state.data || {};
  const segments = Array.isArray(data.segments) ? data.segments : [];
  const transcript = Array.isArray(data.transcript_chunks) ? data.transcript_chunks : [];
  const keyframes = Array.isArray(data.keyframes) ? data.keyframes : [];

  if (state.status === "loading") return <div className="research-preview-empty">Loading parsed data</div>;
  if (state.status === "error") return <div className="research-preview-empty">{state.message}</div>;
  if (!data || (!data.summary_text && !segments.length && !transcript.length && !keyframes.length)) {
    return <div className="research-preview-empty">No parsed data</div>;
  }

  return (
    <div className="research-parsed">
      <section>
        <h3>Summary</h3>
        <p>{data.summary_text || "No summary"}</p>
      </section>
      <ResearchParsedList title={`Segments (${segments.length})`} items={segments} textKey="content_text" timeKey="start_ms" />
      <ResearchParsedList title={`Transcript (${transcript.length})`} items={transcript} textKey="content_text" timeKey="start_ms" />
      <ResearchParsedList title={`Keyframes (${keyframes.length})`} items={keyframes} textKey="caption_text" fallbackKey="ocr_text" timeKey="timestamp_ms" />
    </div>
  );
}

export { ResearchParsedPanel };
