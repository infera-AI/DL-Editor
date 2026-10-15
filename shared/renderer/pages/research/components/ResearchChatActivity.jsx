import { researchActivityCards, researchCardLabel, researchCardSnapshot } from "../research-agents.mjs";

export function ResearchReadonlyCard({ card }) {
  const snapshot = researchCardSnapshot(card);
  const title = snapshot.title || snapshot.summary || researchCardLabel(card);
  return (
    <details className="research-record-card">
      <summary><strong>{title}</strong><span>{card.state || "Recorded"}</span></summary>
      <p>{[card.card_type || card.cardType, card.object_type || card.objectType, card.object_id || card.objectId].filter(Boolean).join(" · ")}</p>
      {card.recorded_message && <p>该记录未提供卡片详情。</p>}
      <pre>{JSON.stringify({ snapshot, outcome: card.action_outcome ?? card.actionOutcome, record: card.recorded_message }, null, 2)}</pre>
    </details>
  );
}

export function ResearchChatActivity({ item }) {
  const tools = item.tool_invocations || item.toolInvocations || [];
  const cards = researchActivityCards(item);
  return (
    <div className="research-chat-activity">
      <p className="research-agent-hint">已保存的候选任务、转交、任务操作与卡片状态。此处仅供查看。</p>
      {tools.length === 0 && cards.length === 0 && <div className="research-preview-empty">No recorded operations or cards</div>}
      {tools.map((tool, index) => (
        <details className="research-record-card" key={tool.invocation_id || tool.invocationId || index}>
          <summary><strong>{tool.tool_name || tool.toolName || "Operation"}</strong><span>{tool.state}</span></summary>
          <p>{[tool.message_group || tool.messageGroup, tool.result_ref || tool.resultRef].filter(Boolean).join(" · ")}</p>
          {(tool.error_message || tool.errorMessage) && <p className="research-operation-error">{tool.error_message || tool.errorMessage}</p>}
          <pre>{JSON.stringify(tool, null, 2)}</pre>
        </details>
      ))}
      {cards.map((card, index) => <ResearchReadonlyCard card={card} key={card.card_id || card.cardId || index} />)}
    </div>
  );
}
