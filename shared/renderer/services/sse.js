

async function consumeInferaSseResponse(response, onEvent) {
  if (!response.body) throw new Error("Conversation stream returned no body.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const dispatch = (block) => {
    if (!block.trim()) return;
    let eventName = "message";
    const dataLines = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
    if (!dataLines.length) return;
    const text = dataLines.join("\n");
    let data = { text };
    try { data = JSON.parse(text); } catch {}
    onEvent({ event: eventName, data });
  };
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || "";
    blocks.forEach(dispatch);
    if (done) break;
  }
  dispatch(buffer);
}

export { consumeInferaSseResponse };
