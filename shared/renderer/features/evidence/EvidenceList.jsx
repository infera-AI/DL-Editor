import { resolveResearchEvidenceUrl } from "./evidence.api.js";
import { EvidenceCard } from "./EvidenceCard.jsx";

function EvidenceList({ evidences, resolveUrl = resolveResearchEvidenceUrl, token }) {
  return (
    <section className="research-evidence-list">
      <div className="research-evidence-list-title">Evidence · {evidences.length}</div>
      {evidences.map((evidence, index) => (
        <EvidenceCard evidence={evidence} key={evidence.evidence_id || evidence.id || index} resolveUrl={resolveUrl} token={token} />
      ))}
    </section>
  );
}

export { EvidenceList };
