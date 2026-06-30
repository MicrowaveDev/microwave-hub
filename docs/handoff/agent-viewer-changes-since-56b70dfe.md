# Agent Viewer Git Changes Since 56b70dfec1a8

This handoff document captures the `agent-viewer` Git history and code patches from the requested start commit through current `HEAD`.

## Range

- Repository: `agent-viewer`
- Inclusive start commit: `56b70dfec1a8a2371f77aab2f24e6c33fb0587de`
- End commit: `50c2fde7d9cb76d5546b16c7116f68810d5e136a`
- Git range used: `56b70dfec1a8a2371f77aab2f24e6c33fb0587de^..HEAD`
- Commit count: 5

## Commit Order

Commits are listed oldest to newest. Merge commits are included for message/history fidelity; Git does not emit a normal patch for a merge commit unless explicitly diffed against a parent, so merge commits may have an empty patch section.

```text
56b70dfec1a8a2371f77aab2f24e6c33fb0587de	2026-05-14T00:41:11+01:00	MicrowaveDev	Handle generated image payloads in logs
6fa33826f71f4bdc3d048bad7a85212f8da25ae1	2026-05-14T01:00:40+01:00	MicrowaveDev	Add redacted log analyzer
ec67261f1b1f48fb1f8ad8ed53cf20076fc91d9b	2026-05-14T01:05:40+01:00	Microwave Dev	Merge pull request #1 from MicrowaveDev/codex/agent-viewer-image-payloads
d0a86cbc08eb257be09f7c73b425ecd50d9d8bb1	2026-06-29T17:32:47+01:00	MicrowaveDev	Prevent watcher crash on huge log updates
50c2fde7d9cb76d5546b16c7116f68810d5e136a	2026-06-29T18:07:19+01:00	MicrowaveDev	Use fixed Agent Viewer port 60653
```

## Combined Change Summary

```text
 docs/AGENT_LOG_ANALYSIS.md |   6 +-
 package.json               |   1 +
 public/app.js              |  81 +++++++++--
 public/renderers.js        |  39 ++++++
 scripts/analyze-log.mjs    | 336 +++++++++++++++++++++++++++++++++++++++++++++
 server.js                  | 149 +++++++++++++++-----
 6 files changed, 562 insertions(+), 50 deletions(-)
```

## Per-Commit Patches

### 56b70df - Handle generated image payloads in logs

- Commit: `56b70dfec1a8a2371f77aab2f24e6c33fb0587de`
- Parents: `e30a3406b869db591402cb86f4bfebe8e7f8a369`
- Author: MicrowaveDev <jonybange@gmail.com>
- Author date: 2026-05-14T00:41:11+01:00
- Committer: MicrowaveDev <jonybange@gmail.com>
- Committer date: 2026-05-14T00:41:11+01:00

#### Commit Message

```text
Handle generated image payloads in logs
```

#### File Summary

```text
 public/app.js       | 54 ++++++++++++++++++++++++++++++++++++++++++++--------
 public/renderers.js | 39 +++++++++++++++++++++++++++++++++++++
 server.js           | 55 +++++++++++++++++++++++++++++++++++++++++------------
 3 files changed, 128 insertions(+), 20 deletions(-)
```

#### Patch

````diff
diff --git a/public/app.js b/public/app.js
index aaf72de6856d624a989d1d66b91e04ccab9ca189..93f7e902184dcbbb8ec92e0bea31b33c04948c4c 100644
--- a/public/app.js
+++ b/public/app.js
@@ -152,6 +152,43 @@ function parseJSONL(content) {
     .filter(Boolean);
 }
 
+function parseJSONLChunk(content, loadState, isDone) {
+  const combined = `${loadState?.pendingLine || ""}${content || ""}`;
+  if (!combined) return { events: [], plainText: "" };
+
+  const lines = combined.split("\n");
+  let pendingLine = "";
+  if (!combined.endsWith("\n")) {
+    pendingLine = lines.pop() || "";
+  }
+  if (isDone && pendingLine) {
+    lines.push(pendingLine);
+    pendingLine = "";
+  }
+  if (loadState) loadState.pendingLine = pendingLine;
+
+  const events = [];
+  const plainLines = [];
+  for (const line of lines) {
+    if (!line) continue;
+    try {
+      events.push(JSON.parse(line));
+    } catch {
+      plainLines.push(line);
+    }
+  }
+
+  return { events, plainText: plainLines.join("\n") };
+}
+
+function redactGeneratedImagePayload(p) {
+  if (!p || !String(p.type || "").startsWith("image_generation_")) return;
+  if (typeof p.result === "string" && p.result.length > 0) {
+    p.result_bytes = new Blob([p.result]).size;
+    p.result = "[redacted generated image base64]";
+  }
+}
+
 // --- Codex format detection ---
 
 function isCodexFormat(events) {
@@ -252,8 +289,8 @@ function renderContent() {
   }
 }
 
-function renderChunk(content, file, isFirstChunk) {
-  const events = parseJSONL(content);
+function renderChunk(content, file, isFirstChunk, loadState, isDone) {
+  const { events, plainText } = parseJSONLChunk(content, loadState, isDone);
   if (events.length > 0) {
     const isCodex = file?.source === "codex" || isCodexFormat(events);
     const renderer = isCodex
@@ -267,10 +304,10 @@ function renderChunk(content, file, isFirstChunk) {
     } else {
       els.outputContent.insertAdjacentHTML("beforeend", html);
     }
-  } else if (content.trim()) {
-    const html = isDiff(content)
-      ? `<div class="md-content"><pre><code>${highlightDiff(content)}</code></pre></div>`
-      : `<div class="md-content"><pre><code>${escapeHtml(content)}</code></pre></div>`;
+  } else if (plainText.trim()) {
+    const html = isDiff(plainText)
+      ? `<div class="md-content"><pre><code>${highlightDiff(plainText)}</code></pre></div>`
+      : `<div class="md-content"><pre><code>${escapeHtml(plainText)}</code></pre></div>`;
     if (isFirstChunk) {
       els.outputContent.innerHTML = html;
     } else {
@@ -307,7 +344,7 @@ async function loadFileContent(id) {
   }
 
   state.fileContents[id] = "";
-  state.fileLoadState[id] = { offset: 0, done: false };
+  state.fileLoadState[id] = { offset: 0, done: false, pendingLine: "" };
   resetBlockCounter();
   resetCodexState();
 
@@ -354,7 +391,7 @@ async function loadFileContent(id) {
     }
 
     try {
-      renderChunk(data.content || "", file, loadState.offset === data.nextOffset && data.offset === 0);
+      renderChunk(data.content || "", file, data.offset === 0, loadState, data.done);
     } catch (err) {
       console.error(err);
       if (state.selectedFile === id && state.loadToken === token) {
@@ -473,6 +510,7 @@ function cleanForCopy(content) {
         if (p.type === "token_count") return null;
         if (p.type === "agent_message") return null;
         if (p.type === "agent_reasoning") return null;
+        redactGeneratedImagePayload(p);
 
         // session_meta: keep only useful fields
         if (evt.type === "session_meta") {
diff --git a/public/renderers.js b/public/renderers.js
index 096bbc27ed9a5ac5f2fdd25f892c809a5032f90e..db78dfae252bf120dbf611616bee49c12ee2251c 100644
--- a/public/renderers.js
+++ b/public/renderers.js
@@ -79,6 +79,13 @@ function truncate(str, max) {
   return str.slice(0, max) + "...";
 }
 
+function formatBytes(bytes) {
+  const value = Number(bytes) || 0;
+  if (value < 1024) return `${value} B`;
+  if (value < 1048576) return `${(value / 1024).toFixed(1)} KB`;
+  return `${(value / 1048576).toFixed(1)} MB`;
+}
+
 function stringifyToolContent(value) {
   if (typeof value === "string") return value;
   if (!value) return "";
@@ -509,9 +516,37 @@ function renderCodexResponseItem(p, time) {
     </div>`;
   }
 
+  if (String(subtype || "").startsWith("image_generation_")) {
+    return renderCodexImageGeneration(p, time);
+  }
+
   return "";
 }
 
+function renderCodexImageGeneration(p, time) {
+  const prompt = p.revised_prompt || p.prompt || "";
+  const title = p.saved_path || p.id || p.status || "generated image";
+  const resultBytes = p.result_bytes || (typeof p.result === "string" ? p.result.length : 0);
+  const fields = [
+    ["Status", p.status],
+    ["Image", p.saved_path],
+    ["Result", resultBytes ? `base64 redacted (${formatBytes(resultBytes)})` : null],
+  ]
+    .filter(([, v]) => v)
+    .map(
+      ([k, v]) =>
+        `<div><span class="session-field">${k}:</span> <span class="session-value">${escapeHtml(String(v))}</span></div>`,
+    )
+    .join("");
+  const promptBlock = prompt
+    ? `<div class="progress-info">${escapeHtml(prompt)}</div>`
+    : "";
+  return `<div class="event event-tool">
+    <div class="event-header"><span class="badge badge-tool">Image</span><span class="event-time">${time}</span></div>
+    <div class="event-body">${renderToolBlock("Image generation", title, `${fields}${promptBlock}`)}</div>
+  </div>`;
+}
+
 function renderImageRefs(refs, file) {
   if (!refs || refs.length === 0) return "";
   const previews = Array.isArray(file?.imagePreviews) ? file.imagePreviews : [];
@@ -563,6 +598,10 @@ function renderCodexEventMsg(p, time, file) {
     return `<div class="turn-divider">Context compacted</div>`;
   }
 
+  if (String(subtype || "").startsWith("image_generation_")) {
+    return renderCodexImageGeneration(p, time);
+  }
+
   // Skip: agent_message, agent_reasoning, token_count (duplicates/noise)
   return "";
 }
diff --git a/server.js b/server.js
index 8660a9fd9ca4c6e751b59bb863d8dde8837cd63b..46dde15ed423994be9d253154f219e02791d2a2b 100644
--- a/server.js
+++ b/server.js
@@ -121,6 +121,14 @@ function copyFileToTemp(fileId, filePath) {
   };
 }
 
+function redactGeneratedImagePayload(p) {
+  if (!p || !String(p.type || "").startsWith("image_generation_")) return;
+  if (typeof p.result === "string" && p.result.length > 0) {
+    p.result_bytes = Buffer.byteLength(p.result, "utf8");
+    p.result = "[redacted generated image base64]";
+  }
+}
+
 function cleanForCopy(content) {
   if (!content) return "";
   return content
@@ -135,6 +143,7 @@ function cleanForCopy(content) {
         if (p.type === "token_count") return null;
         if (p.type === "agent_message") return null;
         if (p.type === "agent_reasoning") return null;
+        redactGeneratedImagePayload(p);
 
         if (evt.type === "session_meta") {
           evt.payload = {
@@ -645,20 +654,41 @@ function readContentChunk(filePath, offset, limit) {
   }
 
   const readStart = Math.max(0, offset);
-  const baseEnd = Math.min(stats.size, readStart + limit);
-  const extraEnd = Math.min(stats.size, baseEnd + 64 * 1024);
   const fd = fs.openSync(filePath, "r");
   try {
-    const buffer = Buffer.alloc(extraEnd - readStart);
-    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, readStart);
-    let end = bytesRead;
-
-    if (readStart + bytesRead < stats.size) {
-      const newlineIndex = buffer.indexOf(10, Math.max(0, baseEnd - readStart));
-      end = newlineIndex === -1 ? Math.min(bytesRead, baseEnd - readStart) : newlineIndex + 1;
+    const chunks = [];
+    let position = readStart;
+    let totalBytes = 0;
+    let foundNewline = false;
+
+    while (position < stats.size && !foundNewline) {
+      const targetBytes = totalBytes < limit
+        ? limit - totalBytes
+        : 64 * 1024;
+      const buffer = Buffer.alloc(Math.min(targetBytes, stats.size - position));
+      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, position);
+      if (bytesRead <= 0) break;
+
+      const chunk = buffer.subarray(0, bytesRead);
+      const newlineSearchStart = Math.max(0, limit - totalBytes);
+      const newlineIndex = totalBytes + bytesRead >= limit
+        ? chunk.indexOf(10, newlineSearchStart)
+        : -1;
+
+      if (newlineIndex === -1) {
+        chunks.push(chunk);
+        position += bytesRead;
+        totalBytes += bytesRead;
+      } else {
+        const end = newlineIndex + 1;
+        chunks.push(chunk.subarray(0, end));
+        position += end;
+        totalBytes += end;
+        foundNewline = true;
+      }
     }
 
-    const content = buffer.toString("utf8", 0, end);
+    const content = Buffer.concat(chunks, totalBytes).toString("utf8");
     const nextOffset = readStart + Buffer.byteLength(content, "utf8");
     return {
       content,
@@ -775,7 +805,7 @@ app.get("/api/files/:id", (req, res) => {
   saveMetadataCache();
   res.json({
     ...metadata,
-    content,
+    content: cleanForCopy(content),
   });
 });
 
@@ -804,12 +834,13 @@ app.get("/api/files/:id/chunk", (req, res) => {
     source,
   });
   const chunk = readContentChunk(filePath, offset, limit);
+  const content = cleanForCopy(chunk.content);
   fileOffsets.set(filePath, chunk.nextOffset);
   saveMetadataCache();
 
   res.json({
     ...metadata,
-    content: chunk.content,
+    content: content ? `${content}\n` : "",
     offset,
     nextOffset: chunk.nextOffset,
     done: chunk.done,
````

### 6fa3382 - Add redacted log analyzer

- Commit: `6fa33826f71f4bdc3d048bad7a85212f8da25ae1`
- Parents: `56b70dfec1a8a2371f77aab2f24e6c33fb0587de`
- Author: MicrowaveDev <jonybange@gmail.com>
- Author date: 2026-05-14T01:00:40+01:00
- Committer: MicrowaveDev <jonybange@gmail.com>
- Committer date: 2026-05-14T01:00:40+01:00

#### Commit Message

```text
Add redacted log analyzer
```

#### File Summary

```text
 docs/AGENT_LOG_ANALYSIS.md |   6 +-
 package.json               |   1 +
 scripts/analyze-log.mjs    | 336 +++++++++++++++++++++++++++++++++++++++++++++
 3 files changed, 341 insertions(+), 2 deletions(-)
```

#### Patch

````diff
diff --git a/docs/AGENT_LOG_ANALYSIS.md b/docs/AGENT_LOG_ANALYSIS.md
index 635e45026a3704c1ff6fad64ffb14a39951cc505..21f4478613f66f72c50d58c9c8f9fd5abe4137db 100644
--- a/docs/AGENT_LOG_ANALYSIS.md
+++ b/docs/AGENT_LOG_ANALYSIS.md
@@ -24,8 +24,9 @@ Prioritize issues that repeatedly cost:
 ## First Command
 
 For read-only rollout analysis, do not run a sync that moves submodule checkouts.
-Read this guide and use the reusable JSONL summarizer instead of ad hoc `node -e`
-probes:
+Read this guide and use the reusable streaming JSONL summarizer instead of ad
+hoc `node -e` probes. It redacts generated-image/base64 payloads while keeping
+line numbers, saved paths, prompts, and byte counts:
 
 ```bash
 yarn agent:analyze-log <rollout.jsonl> --all
@@ -327,6 +328,7 @@ For each finding include:
 ## Log-Specific Tips
 
 - For Codex rollout logs, ignore noise first: `token_count`, encrypted reasoning payloads, bulky session metadata, and repeated system/developer blocks unless they are directly relevant to the failure.
+- Treat `image_generation_*` `result` fields as binary payloads, not analysis text. Use the analyzer's redacted image-generation summary instead of reading or pasting raw base64.
 - Use the cleaned export from the agent viewer when it preserves the evidence you need.
 - If you need raw logs, inspect narrowly and summarize; do not paste large raw sections into the report.
 - Track both command count and “time-to-first-correct-action”. Many optimization opportunities show up there before they show up in total command count.
diff --git a/package.json b/package.json
index 29eb841979527182fb762c845625651de6b9f886..205fdc2a96f3f2078c23f1f6197fea6750aa8ec3 100644
--- a/package.json
+++ b/package.json
@@ -4,6 +4,7 @@
   "private": true,
   "type": "module",
   "scripts": {
+    "agent:analyze-log": "node scripts/analyze-log.mjs",
     "start": "node server.js",
     "dev": "node --watch server.js"
   },
diff --git a/scripts/analyze-log.mjs b/scripts/analyze-log.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..7c0ec328d908604d4fbcbd6c4ba3cbf2a1772c32
--- /dev/null
+++ b/scripts/analyze-log.mjs
@@ -0,0 +1,336 @@
+#!/usr/bin/env node
+
+import fs from "fs";
+import path from "path";
+import readline from "readline";
+
+const args = process.argv.slice(2);
+const filePath = args.find((arg) => !arg.startsWith("-"));
+const mode = args.includes("--workflow-waste")
+  ? "workflow-waste"
+  : args.includes("--all")
+    ? "all"
+    : "summary";
+
+if (!filePath || args.includes("--help") || args.includes("-h")) {
+  console.log(`Usage: yarn agent:analyze-log <rollout.jsonl> [--all|--workflow-waste]
+
+Streams a Codex/Claude JSONL log and prints compact analysis without emitting
+large image/base64 payloads.`);
+  process.exit(filePath ? 0 : 1);
+}
+
+const absPath = path.resolve(filePath);
+if (!fs.existsSync(absPath)) {
+  console.error(`Log file not found: ${absPath}`);
+  process.exit(1);
+}
+
+const stats = fs.statSync(absPath);
+const summary = {
+  lines: 0,
+  badJson: 0,
+  types: new Map(),
+  payloadTypes: new Map(),
+  roles: new Map(),
+  userRequests: [],
+  assistantMessages: [],
+  toolCalls: [],
+  toolFailures: [],
+  largeToolOutputs: [],
+  imageGenerations: [],
+  imageBytes: 0,
+  largeRecords: [],
+  taskCompleteCount: 0,
+};
+
+function addCount(map, key) {
+  if (!key) return;
+  map.set(key, (map.get(key) || 0) + 1);
+}
+
+function compactText(text, max = 220) {
+  return String(text || "")
+    .replace(/<image\b[^>]*>[\s\S]*?<\/image>/gi, " [image] ")
+    .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, "[image base64 redacted]")
+    .replace(/[A-Za-z0-9+/=]{500,}/g, "[base64 redacted]")
+    .replace(/\s+/g, " ")
+    .trim()
+    .slice(0, max);
+}
+
+function formatBytes(bytes) {
+  if (bytes < 1024) return `${bytes} B`;
+  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
+  return `${(bytes / 1048576).toFixed(1)} MB`;
+}
+
+function firstTextFromContent(content) {
+  if (typeof content === "string") return content;
+  if (!Array.isArray(content)) return "";
+  return content
+    .map((block) => block?.text || block?.message || "")
+    .filter(Boolean)
+    .join("\n");
+}
+
+function shouldKeepUserRequest(text) {
+  if (!text) return false;
+  if (text.startsWith("<environment_context>")) return false;
+  if (text.startsWith("# AGENTS.md instructions")) return false;
+  return true;
+}
+
+function pushUserRequest(item) {
+  if (!shouldKeepUserRequest(item.text)) return;
+  const previous = summary.userRequests[summary.userRequests.length - 1];
+  if (previous?.text === item.text) return;
+  summary.userRequests.push(item);
+}
+
+function describeToolCall(payload) {
+  if (payload.type === "custom_tool_call") {
+    return {
+      name: payload.name || "custom_tool",
+      detail: compactText(payload.name === "apply_patch" ? "apply_patch" : payload.input),
+    };
+  }
+
+  let detail = payload.arguments || "";
+  try {
+    const parsed = JSON.parse(detail);
+    detail = parsed.cmd || parsed.command || parsed.query || JSON.stringify(parsed);
+  } catch {
+    // Keep raw detail.
+  }
+  return {
+    name: payload.name || "function_call",
+    detail: compactText(detail),
+  };
+}
+
+function summarizeImageGeneration(evt, payload, lineBytes) {
+  const resultBytes = typeof payload.result === "string"
+    ? Buffer.byteLength(payload.result, "utf8")
+    : 0;
+  summary.imageBytes += resultBytes;
+  summary.imageGenerations.push({
+    line: summary.lines,
+    timestamp: evt.timestamp,
+    type: payload.type,
+    status: payload.status,
+    savedPath: payload.saved_path,
+    resultBytes,
+    prompt: compactText(payload.revised_prompt || payload.prompt, 180),
+    recordBytes: lineBytes,
+  });
+}
+
+function collectEvent(evt, line, lineBytes) {
+  summary.lines += 1;
+  addCount(summary.types, evt.type);
+
+  const payload = evt.payload || evt.message || {};
+  addCount(summary.payloadTypes, payload.type);
+  addCount(summary.roles, payload.role || evt.message?.role);
+
+  if (lineBytes > 50000) {
+    summary.largeRecords.push({
+      line: summary.lines,
+      type: evt.type,
+      payloadType: payload.type,
+      bytes: lineBytes,
+    });
+  }
+
+  if (String(payload.type || "").startsWith("image_generation_")) {
+    summarizeImageGeneration(evt, payload, lineBytes);
+    return;
+  }
+
+  if (evt.type === "event_msg" && payload.type === "user_message") {
+    const text = compactText(payload.message || payload.text_elements?.join(" "), 280);
+    pushUserRequest({ line: summary.lines, timestamp: evt.timestamp, text });
+    return;
+  }
+
+  if (evt.type === "response_item" && payload.type === "message") {
+    const text = compactText(firstTextFromContent(payload.content), 280);
+    if (payload.role === "user") {
+      pushUserRequest({ line: summary.lines, timestamp: evt.timestamp, text });
+    }
+    if (payload.role === "assistant" && text) {
+      summary.assistantMessages.push({
+        line: summary.lines,
+        timestamp: evt.timestamp,
+        phase: payload.phase,
+        text,
+      });
+    }
+    return;
+  }
+
+  if (
+    evt.type === "response_item" &&
+    (payload.type === "function_call" || payload.type === "custom_tool_call")
+  ) {
+    summary.toolCalls.push({
+      line: summary.lines,
+      timestamp: evt.timestamp,
+      ...describeToolCall(payload),
+    });
+    return;
+  }
+
+  if (
+    evt.type === "response_item" &&
+    (payload.type === "function_call_output" || payload.type === "custom_tool_call_output")
+  ) {
+    const output = typeof payload.output === "string"
+      ? payload.output
+      : JSON.stringify(payload.output || "");
+    const isFailure =
+      /exit code [1-9]/.test(output) ||
+      /metadata"?\s*:\s*\{[^}]*"exit_code"?\s*:\s*[1-9]/.test(output);
+    if (isFailure) {
+      summary.toolFailures.push({
+        line: summary.lines,
+        timestamp: evt.timestamp,
+        output: compactText(output, 220),
+      });
+    }
+    if (Buffer.byteLength(output, "utf8") > 20000) {
+      summary.largeToolOutputs.push({
+        line: summary.lines,
+        timestamp: evt.timestamp,
+        bytes: Buffer.byteLength(output, "utf8"),
+        preview: compactText(output, 160),
+      });
+    }
+    return;
+  }
+
+  if (evt.type === "event_msg" && payload.type === "task_complete") {
+    summary.taskCompleteCount += 1;
+  }
+}
+
+const rl = readline.createInterface({
+  input: fs.createReadStream(absPath, { encoding: "utf8" }),
+  crlfDelay: Infinity,
+});
+
+for await (const line of rl) {
+  if (!line) continue;
+  const lineBytes = Buffer.byteLength(line, "utf8");
+  try {
+    collectEvent(JSON.parse(line), line, lineBytes);
+  } catch {
+    summary.lines += 1;
+    summary.badJson += 1;
+  }
+}
+
+function topEntries(map, max = 12) {
+  return [...map.entries()]
+    .sort((a, b) => b[1] - a[1])
+    .slice(0, max)
+    .map(([key, count]) => `- ${key}: ${count}`)
+    .join("\n");
+}
+
+function repeatedToolFamilies() {
+  const counts = new Map();
+  for (const call of summary.toolCalls) {
+    const key = call.name === "exec_command"
+      ? call.detail.split(/\s+/).slice(0, 3).join(" ")
+      : call.name;
+    addCount(counts, key || call.name);
+  }
+  return [...counts.entries()]
+    .filter(([, count]) => count >= 3)
+    .sort((a, b) => b[1] - a[1])
+    .slice(0, 10);
+}
+
+function printSection(title, body) {
+  console.log(`\n## ${title}`);
+  console.log(body || "- none");
+}
+
+console.log(`# Log Analysis: ${path.basename(absPath)}`);
+console.log(`Mode: ${mode}`);
+console.log(`Size: ${formatBytes(stats.size)}`);
+
+printSection(
+  "Shape",
+  [
+    `- JSONL records: ${summary.lines}`,
+    `- Bad JSON records: ${summary.badJson}`,
+    `- Task completions: ${summary.taskCompleteCount}`,
+    `- Image generation records: ${summary.imageGenerations.length}`,
+    `- Image result bytes redacted from analysis: ${formatBytes(summary.imageBytes)}`,
+    `- Records over 50 KB: ${summary.largeRecords.length}`,
+  ].join("\n"),
+);
+
+printSection("Payload Types", topEntries(summary.payloadTypes));
+
+printSection(
+  "Source Request",
+  summary.userRequests
+    .slice(0, 8)
+    .map((req) => `- line ${req.line}: ${req.text}`)
+    .join("\n"),
+);
+
+if (mode === "all" || mode === "workflow-waste") {
+  const repeated = repeatedToolFamilies();
+  printSection(
+    "Workflow Waste Signals",
+    [
+      `- Tool calls: ${summary.toolCalls.length}`,
+      `- Tool failures: ${summary.toolFailures.length}`,
+      `- Large tool outputs over 20 KB: ${summary.largeToolOutputs.length}`,
+      `- Repeated command/tool families: ${
+        repeated.length
+          ? repeated.map(([key, count]) => `${key} (${count})`).join(", ")
+          : "none"
+      }`,
+    ].join("\n"),
+  );
+
+  printSection(
+    "Tool Failures",
+    summary.toolFailures
+      .slice(0, 10)
+      .map((item) => `- line ${item.line}: ${item.output}`)
+      .join("\n"),
+  );
+
+  printSection(
+    "Large Records",
+    summary.largeRecords
+      .slice(0, 12)
+      .map(
+        (item) =>
+          `- line ${item.line}: ${item.type}/${item.payloadType || "unknown"} ${formatBytes(item.bytes)}`,
+      )
+      .join("\n"),
+  );
+}
+
+printSection(
+  "Image Generations",
+  summary.imageGenerations
+    .slice(0, 20)
+    .map(
+      (item) =>
+        `- line ${item.line}: ${item.type} ${item.status || ""} ${formatBytes(item.resultBytes)} ${item.savedPath || ""} ${item.prompt ? `| ${item.prompt}` : ""}`.trim(),
+    )
+    .join("\n"),
+);
+
+if (summary.imageGenerations.length > 20) {
+  console.log(`- ... ${summary.imageGenerations.length - 20} more image generation records`);
+}
````

### ec67261 - Merge pull request #1 from MicrowaveDev/codex/agent-viewer-image-payloads

- Commit: `ec67261f1b1f48fb1f8ad8ed53cf20076fc91d9b`
- Parents: `6f4900695ab5c791ab71115a886e17772752a896 6fa33826f71f4bdc3d048bad7a85212f8da25ae1`
- Author: Microwave Dev <Jonybange@gmail.com>
- Author date: 2026-05-14T01:05:40+01:00
- Committer: GitHub <noreply@github.com>
- Committer date: 2026-05-14T01:05:40+01:00

#### Commit Message

```text
Merge pull request #1 from MicrowaveDev/codex/agent-viewer-image-payloads

Codex/agent viewer image payloads
```

#### File Summary

```text
 docs/AGENT_LOG_ANALYSIS.md |   6 +-
 package.json               |   1 +
 public/app.js              |  54 ++++++--
 public/renderers.js        |  39 ++++++
 scripts/analyze-log.mjs    | 336 +++++++++++++++++++++++++++++++++++++++++++++
 server.js                  |  63 +++++++--
 6 files changed, 474 insertions(+), 25 deletions(-)
```

#### Patch

````diff
(no patch emitted by git for this commit)
````

### d0a86cb - Prevent watcher crash on huge log updates

- Commit: `d0a86cbc08eb257be09f7c73b425ecd50d9d8bb1`
- Parents: `ec67261f1b1f48fb1f8ad8ed53cf20076fc91d9b`
- Author: MicrowaveDev <jonybange@gmail.com>
- Author date: 2026-06-29T17:32:47+01:00
- Committer: MicrowaveDev <jonybange@gmail.com>
- Committer date: 2026-06-29T17:32:47+01:00

#### Commit Message

```text
Prevent watcher crash on huge log updates

Closes #2
```

#### File Summary

```text
 public/app.js | 27 ++++++++++++++++--
 server.js     | 92 +++++++++++++++++++++++++++++++++++++++++++----------------
 2 files changed, 92 insertions(+), 27 deletions(-)
```

#### Patch

````diff
diff --git a/public/app.js b/public/app.js
index 93f7e902184dcbbb8ec92e0bea31b33c04948c4c..348c161ab4413f48d0c5b6199f625e07ce0cc182 100644
--- a/public/app.js
+++ b/public/app.js
@@ -695,8 +695,21 @@ function connectSSE() {
 
   state.eventSource.addEventListener("file-update", (e) => {
     const data = JSON.parse(e.data);
-    state.fileContents[data.id] =
-      (state.fileContents[data.id] || "") + data.content;
+    const hasContent = typeof data.content === "string";
+    if (data.contentReset) {
+      state.fileContents[data.id] = hasContent ? data.content : "";
+      state.fileLoadState[data.id] = {
+        offset: data.size || 0,
+        done: !data.contentSkipped,
+        pendingLine: "",
+      };
+    } else if (hasContent) {
+      state.fileContents[data.id] =
+        (state.fileContents[data.id] || "") + data.content;
+    }
+    if (data.contentSkipped && state.fileLoadState[data.id]) {
+      state.fileLoadState[data.id].done = false;
+    }
     const file = state.files.find((f) => f.id === data.id);
     if (file) {
       file.filename = data.filename || file.filename;
@@ -730,7 +743,15 @@ function connectSSE() {
       sortFiles();
     }
     renderFileList();
-    if (state.selectedFile === data.id) renderContent();
+    if (state.selectedFile === data.id) {
+      if (data.contentSkipped) {
+        delete state.fileContents[data.id];
+        delete state.fileLoadState[data.id];
+        loadFileContent(data.id);
+      } else if (hasContent || data.contentReset) {
+        renderContent();
+      }
+    }
   });
 
   state.eventSource.addEventListener("file-removed", (e) => {
diff --git a/server.js b/server.js
index 46dde15ed423994be9d253154f219e02791d2a2b..e720bd13a955558ad24e87d59f6c504768118cf3 100644
--- a/server.js
+++ b/server.js
@@ -12,6 +12,7 @@ const metadataCachePath = path.join(metadataCacheDir, "files-metadata.json");
 const tempDir = path.join(__dirname, "temp");
 const DEFAULT_CHUNK_SIZE = 512 * 1024;
 const MAX_CHUNK_SIZE = 2 * 1024 * 1024;
+const MAX_LIVE_UPDATE_BYTES = MAX_CHUNK_SIZE;
 
 // --- Auto-detect Claude Code temp directory ---
 
@@ -572,6 +573,7 @@ function getAllFiles() {
   for (const f of all) {
     filePathMap.set(f.id, f.filePath);
     fileMetaMap.set(f.id, f);
+    setFileOffsetIfUnknown(f.filePath, f.size);
   }
   saveMetadataCache();
   return all;
@@ -595,7 +597,8 @@ function toClientFile(file) {
 }
 
 function readNewContent(filePath) {
-  const lastOffset = fileOffsets.get(filePath) || 0;
+  const hasOffset = fileOffsets.has(filePath);
+  const lastOffset = hasOffset ? fileOffsets.get(filePath) : 0;
   let stats;
 
   try {
@@ -605,21 +608,55 @@ function readNewContent(filePath) {
     return null;
   }
 
+  if (!hasOffset) {
+    fileOffsets.set(filePath, stats.size);
+    return {
+      content: "",
+      skipped: stats.size > 0,
+    };
+  }
+
   // File was truncated — reset offset
   if (stats.size < lastOffset) {
+    if (stats.size > MAX_LIVE_UPDATE_BYTES) {
+      fileOffsets.set(filePath, stats.size);
+      return {
+        content: "",
+        reset: true,
+        skipped: true,
+      };
+    }
+
     fileOffsets.set(filePath, 0);
-    return readFullContent(filePath);
+    return {
+      content: readFullContent(filePath),
+      reset: true,
+    };
   }
 
   if (stats.size === lastOffset) return null;
 
-  const buffer = Buffer.alloc(stats.size - lastOffset);
+  const bytesToRead = stats.size - lastOffset;
+  if (bytesToRead > MAX_LIVE_UPDATE_BYTES) {
+    fileOffsets.set(filePath, stats.size);
+    return {
+      content: "",
+      skipped: true,
+    };
+  }
+
+  const buffer = Buffer.alloc(bytesToRead);
   const fd = fs.openSync(filePath, "r");
-  fs.readSync(fd, buffer, 0, buffer.length, lastOffset);
-  fs.closeSync(fd);
+  try {
+    fs.readSync(fd, buffer, 0, buffer.length, lastOffset);
+  } finally {
+    fs.closeSync(fd);
+  }
 
   fileOffsets.set(filePath, stats.size);
-  return buffer.toString("utf8");
+  return {
+    content: buffer.toString("utf8"),
+  };
 }
 
 function readFullContent(filePath) {
@@ -632,6 +669,18 @@ function readFullContent(filePath) {
   }
 }
 
+function setFileOffsetIfUnknown(filePath, size) {
+  if (!fileOffsets.has(filePath)) fileOffsets.set(filePath, size);
+}
+
+function buildLiveUpdatePayload(metadata, update) {
+  const payload = { ...metadata };
+  if (update.reset) payload.contentReset = true;
+  if (update.skipped) payload.contentSkipped = true;
+  if (typeof update.content === "string") payload.content = update.content;
+  return payload;
+}
+
 function resolveFilePath(id) {
   let filePath = filePathMap.get(id);
   if (!filePath && tasksDir) {
@@ -959,6 +1008,7 @@ function startWatcher() {
     const id = path.basename(filePath, ".output");
     filePathMap.set(id, filePath);
     const stats = fs.statSync(filePath);
+    setFileOffsetIfUnknown(filePath, stats.size);
     const metadata = buildFileMetadata({
       id,
       filename: path.basename(filePath),
@@ -975,8 +1025,8 @@ function startWatcher() {
   watcher.on("change", (filePath) => {
     if (!filePath.endsWith(".output")) return;
     const id = path.basename(filePath, ".output");
-    const newContent = readNewContent(filePath);
-    if (newContent) {
+    const update = readNewContent(filePath);
+    if (update) {
       const stats = fs.statSync(filePath);
       const metadata = buildFileMetadata({
         id,
@@ -988,10 +1038,7 @@ function startWatcher() {
       });
       fileMetaMap.set(id, metadata);
       saveMetadataCache();
-      broadcastSSE("file-update", {
-        ...metadata,
-        content: newContent,
-      });
+      broadcastSSE("file-update", buildLiveUpdatePayload(metadata, update));
     }
   });
 
@@ -1024,6 +1071,7 @@ function startClaudeProjectsWatcher() {
     const projectName = path.basename(path.dirname(filePath));
     const id = claudeProjectFileId(projectName, path.basename(filePath));
     const stats = fs.statSync(filePath);
+    setFileOffsetIfUnknown(filePath, stats.size);
     const meta = buildFileMetadata({
       id,
       filename: path.basename(filePath),
@@ -1043,8 +1091,8 @@ function startClaudeProjectsWatcher() {
     if (!filePath.endsWith(".jsonl")) return;
     const projectName = path.basename(path.dirname(filePath));
     const id = claudeProjectFileId(projectName, path.basename(filePath));
-    const newContent = readNewContent(filePath);
-    if (newContent) {
+    const update = readNewContent(filePath);
+    if (update) {
       const stats = fs.statSync(filePath);
       const meta = buildFileMetadata({
         id,
@@ -1058,10 +1106,7 @@ function startClaudeProjectsWatcher() {
       fileMetaMap.set(id, meta);
       filePathMap.set(id, filePath);
       saveMetadataCache();
-      broadcastSSE("file-update", {
-        ...meta,
-        content: newContent,
-      });
+      broadcastSSE("file-update", buildLiveUpdatePayload(meta, update));
     }
   });
 
@@ -1099,6 +1144,7 @@ function startCodexWatcher() {
     const id = codexFileId(filePath);
     filePathMap.set(id, filePath);
     const stats = fs.statSync(filePath);
+    setFileOffsetIfUnknown(filePath, stats.size);
     const metadata = buildFileMetadata({
       id,
       filename: path.basename(filePath),
@@ -1119,8 +1165,8 @@ function startCodexWatcher() {
     )
       return;
     const id = codexFileId(filePath);
-    const newContent = readNewContent(filePath);
-    if (newContent) {
+    const update = readNewContent(filePath);
+    if (update) {
       const stats = fs.statSync(filePath);
       const metadata = buildFileMetadata({
         id,
@@ -1132,10 +1178,7 @@ function startCodexWatcher() {
       });
       fileMetaMap.set(id, metadata);
       saveMetadataCache();
-      broadcastSSE("file-update", {
-        ...metadata,
-        content: newContent,
-      });
+      broadcastSSE("file-update", buildLiveUpdatePayload(metadata, update));
     }
   });
 
@@ -1167,6 +1210,7 @@ const server = app.listen(PORT, () => {
   const address = server.address();
   const port = typeof address === "object" && address ? address.port : PORT;
   console.log(`Agent Viewer running at http://localhost:${port}`);
+  getAllFiles();
   startWatcher();
   startClaudeProjectsWatcher();
   startCodexWatcher();
````

### 50c2fde - Use fixed Agent Viewer port 60653

- Commit: `50c2fde7d9cb76d5546b16c7116f68810d5e136a`
- Parents: `d0a86cbc08eb257be09f7c73b425ecd50d9d8bb1`
- Author: MicrowaveDev <jonybange@gmail.com>
- Author date: 2026-06-29T18:07:19+01:00
- Committer: MicrowaveDev <jonybange@gmail.com>
- Committer date: 2026-06-29T18:07:19+01:00

#### Commit Message

```text
Use fixed Agent Viewer port 60653

Closes #3
```

#### File Summary

```text
 server.js | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

#### Patch

````diff
diff --git a/server.js b/server.js
index e720bd13a955558ad24e87d59f6c504768118cf3..8da48a4310cb9f922a928166185ce383e3c7accf 100644
--- a/server.js
+++ b/server.js
@@ -6,7 +6,7 @@ import os from "os";
 import { fileURLToPath } from "url";
 
 const __dirname = path.dirname(fileURLToPath(import.meta.url));
-const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 0;
+const PORT = 60653;
 const metadataCacheDir = path.join(__dirname, ".cache");
 const metadataCachePath = path.join(metadataCacheDir, "files-metadata.json");
 const tempDir = path.join(__dirname, "temp");
````
