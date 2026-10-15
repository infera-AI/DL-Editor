const assert = require("assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  const { getResearchSessionAgent, getResearchMessageAgent, isResearchTaskCandidateCard, researchActivityCards, researchCardLabel, researchCardsForMessage, researchMessageContent } = await import(pathToFileURL(path.join(__dirname, "../renderer/pages/research/research-agents.mjs")));
  assert.equal(getResearchSessionAgent({ reserved: '{"conversationMode":"chat"}' }).id, "laura");
  assert.equal(getResearchSessionAgent({ reserved_json: { conversation_mode: "memory" } }).id, "jane");
  assert.equal(getResearchSessionAgent({ assistantKind: "bella", query_mode: "agent" }).id, "bella");
  for (const reserved of [null, "{invalid", "[]", '"text"', '{"conversationMode":"smart"}']) {
    assert.equal(getResearchSessionAgent({ reserved, query_mode: "agent" }).id, "legacy");
  }
  const laura = { assistant_kind: "laura" };
  assert.equal(getResearchMessageAgent({ reserved: '{"answered_by":"jane"}' }, laura).id, "jane");
  assert.equal(getResearchMessageAgent({}, laura).id, "laura");
  assert.deepEqual(researchCardsForMessage([{ message_id: "public-1" }, { messageId: 8 }, { message_id: null }], { public_message_id: "public-1", id: 8 }).length, 2);
  const candidate = { card_id: "candidate-1", message_id: "candidate-message", card_type: "TaskCandidateCard", snapshot: { title: "整理发布清单" } };
  const candidateMessage = { id: 9, public_message_id: "candidate-message", role: "system", content_kind: "CARD", content: "TaskCandidateCard" };
  assert.equal(isResearchTaskCandidateCard(candidate), true);
  assert.equal(isResearchTaskCandidateCard({ cardType: "GeneratedSuggestionCard", objectType: "TaskCandidate" }), true);
  assert.equal(researchMessageContent(candidateMessage, [candidate]), "");
  assert.deepEqual(researchActivityCards({ cards: [candidate], messages: [candidateMessage] }), [candidate], "Activity must not duplicate an attached candidate");
  assert.deepEqual(researchCardsForMessage([candidate], { publicMessageId: "candidate-message" }), [candidate]);
  assert.deepEqual(researchCardsForMessage([candidate], { payload: { cardId: "candidate-1" } }), [candidate]);
  const legacyMessage = { id: 10, role: "system", content: "TaskCandidateCard", source_type: "conversation_projection" };
  const recorded = researchCardsForMessage([], legacyMessage);
  assert.equal(recorded.length, 1);
  assert.equal(isResearchTaskCandidateCard(recorded[0]), true);
  assert.equal(researchMessageContent(legacyMessage, recorded), "");
  assert.equal(researchActivityCards({ messages: [legacyMessage] })[0].recorded_message, legacyMessage, "Old message-only candidates stay available in Activity");
  assert.equal(researchCardLabel(recorded[0]), "候选任务");
  for (const [type, actions] of [["AgentHandoffCard", ["ACCEPT", "DECLINE"]], ["TaskOperationConfirmCard", ["CONFIRM", "CANCEL"]]]) {
    const card = { cardId: `card-${type}`, messageId: `message-${type}`, cardType: type, availableActions: actions, snapshot: { summary: "请确认这次操作" } };
    const message = { publicMessageId: `message-${type}`, role: "system", contentKind: "CARD", content: type };
    assert.equal(isResearchTaskCandidateCard(card), false, `${type} stays in the conversation`);
    assert.deepEqual(researchCardsForMessage([card], message), [card]);
    assert.equal(researchMessageContent(message, [card]), "");
    assert.deepEqual(card.availableActions, actions);
  }
  for (const role of ["user", "assistant"]) {
    const message = { role, content: "TaskCandidateCard 是什么意思？" };
    assert.equal(researchMessageContent(message, [candidate]), message.content, "Ordinary messages mentioning card types remain visible");
    assert.deepEqual(researchCardsForMessage([], message), []);
  }
  assert.equal(researchMessageContent({ role: "user", content: "TaskCandidateCard" }, [candidate]), "TaskCandidateCard");
  assert.deepEqual(researchCardsForMessage([], { role: "user", content: "TaskCandidateCard" }), []);
  console.log("Research agent identity, card association, candidate Activity records, legacy placeholders and interactive cards passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
