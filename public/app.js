import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let app;
let auth;

let currentGraphNodes = [];
let currentGraphLinks = [];

const providerDefaults = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  gemini: "gemini-2.0-flash",
};

const graphDynamicsDefaults = {
  linkDistance: 180,
  chargeStrength: -430,
  collisionRadius: 34,
  nodeRadius: 19,
};

const graphDynamics = { ...graphDynamicsDefaults };

const providerApiKeyPlaceholders = {
  openai: "OpenAI API Key (sk-...)",
  anthropic: "Anthropic API Key (sk-ant-...)",
  gemini: "Google AI API Key",
};

const welcomePortal = document.getElementById("welcomePortal");
const getStartedBtn = document.getElementById("getStartedBtn");
const appContainer = document.getElementById("appContainer");

const openInputModalBtn = document.getElementById("openInputModalBtn");
const inputModal = document.getElementById("inputModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");

const providerSelect = document.getElementById("providerSelect");
const modelInput = document.getElementById("modelInput");
const apiKeyInput = document.getElementById("apiKeyInput");

const pdfUploadInput = document.getElementById("pdfUploadInput");
const fileNameDisplay = document.getElementById("fileNameDisplay");

const markdownUploadInput = document.getElementById("markdownUploadInput");
const markdownFileNameDisplay = document.getElementById("markdownFileNameDisplay");

const youtubeUrlInput = document.getElementById("youtubeUrlInput");
const loadYoutubeBtn = document.getElementById("loadYoutubeBtn");

const reportInput = document.getElementById("reportInput");
const submitInputBtn = document.getElementById("submitInputBtn");

const graphContainer = document.getElementById("graphContainer");
const knowledgeGraphSvg = document.getElementById("knowledgeGraphSvg");
const graphPlaceholder = document.getElementById("graphPlaceholder");
const linkDistanceInput = document.getElementById("linkDistanceInput");
const chargeStrengthInput = document.getElementById("chargeStrengthInput");
const collisionRadiusInput = document.getElementById("collisionRadiusInput");
const nodeRadiusInput = document.getElementById("nodeRadiusInput");
const linkDistanceValue = document.getElementById("linkDistanceValue");
const chargeStrengthValue = document.getElementById("chargeStrengthValue");
const collisionRadiusValue = document.getElementById("collisionRadiusValue");
const nodeRadiusValue = document.getElementById("nodeRadiusValue");
const resetDynamicsBtn = document.getElementById("resetDynamicsBtn");

const progressBarOverlay = document.getElementById("progressBarOverlay");
const progressBarFill = document.getElementById("progressBarFill");
const progressText = document.getElementById("progressText");

const chatBotContainer = document.getElementById("chatBotContainer");
const chatHistoryContainer = document.getElementById("chatHistory");
const chatInput = document.getElementById("chatInput");
const sendChatBtn = document.getElementById("sendChatBtn");
const toggleChatBtn = document.getElementById("toggleChatBtn");
const closeChatBtn = document.getElementById("closeChatBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const chatTypingIndicator = document.getElementById("chatTypingIndicator");
const chatProviderBadge = document.getElementById("chatProviderBadge");

const nodeInfoPopup = document.getElementById("nodeInfoPopup");
const closeNodeInfoPopupBtn = document.getElementById("closeNodeInfoPopup");
const popupNodeTitle = document.getElementById("popupNodeTitle");
const popupNodeSummary = document.getElementById("popupNodeSummary");

const messageBox = document.getElementById("messageBox");
const messageBoxText = document.getElementById("messageBoxText");
const messageBoxOkBtn = document.getElementById("messageBoxOkBtn");

let progressInterval;
let width = window.innerWidth;
let height = window.innerHeight;
let lastProvider = providerSelect?.value || "openai";
let chatConversation = [];
let graphAnimationInterval = null;
let graphAnimationCursor = 0;

const svg = d3.select("#knowledgeGraphSvg").attr("viewBox", [0, 0, width, height]);

svg
  .append("defs")
  .append("marker")
  .attr("id", "arrow")
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 20)
  .attr("refY", 0)
  .attr("markerWidth", 6)
  .attr("markerHeight", 6)
  .attr("orient", "auto")
  .append("path")
  .attr("d", "M0,-5L10,0L0,5")
  .attr("class", "arrowhead");

const g = svg.append("g");

const simulation = d3
  .forceSimulation()
  .force("link", d3.forceLink().id((d) => d.id).distance(graphDynamics.linkDistance))
  .force("charge", d3.forceManyBody().strength(graphDynamics.chargeStrength))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collision", d3.forceCollide().radius(graphDynamics.collisionRadius));

let link;
let node;
let linkLabel;

const zoom = d3
  .zoom()
  .scaleExtent([0.1, 8])
  .on("zoom", (event) => {
    g.attr("transform", event.transform);
  });

svg.call(zoom);

async function initializeFirebase() {
  try {
    const firebaseConfig = JSON.parse(typeof __firebase_config !== "undefined" ? __firebase_config : "{}");
    if (Object.keys(firebaseConfig).length === 0) {
      return;
    }

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    const initialAuthToken = typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

    if (initialAuthToken) {
      await signInWithCustomToken(auth, initialAuthToken);
    } else {
      await signInAnonymously(auth);
    }
  } catch (_) {
    // Run without Firebase when not present.
  }
}

initializeFirebase();

function showMessageBox(message) {
  messageBoxText.textContent = message;
  messageBox.classList.remove("hidden");
}

function showProgressBar() {
  progressBarOverlay.classList.remove("hidden");
  progressBarFill.style.width = "0%";
  progressText.textContent = "0%";

  let progress = 0;
  progressInterval = setInterval(() => {
    if (progress < 95) {
      progress += Math.random() * 4;
      if (progress > 95) {
        progress = 95;
      }
      progressBarFill.style.width = `${progress}%`;
      progressText.textContent = `${Math.floor(progress)}%`;
    }
  }, 220);
}

function hideProgressBar() {
  clearInterval(progressInterval);
  progressBarFill.style.width = "100%";
  progressText.textContent = "100%";
  setTimeout(() => {
    progressBarOverlay.classList.add("hidden");
  }, 350);
}

function closeInputModal() {
  inputModal.classList.add("hidden");
}

function syncProviderFields(forceModelUpdate = false) {
  const provider = providerSelect.value;
  const currentModel = modelInput.value.trim();
  const previousDefault = providerDefaults[lastProvider];

  apiKeyInput.placeholder = providerApiKeyPlaceholders[provider] || "API Key";
  updateChatProviderBadge(provider);

  if (!currentModel || (forceModelUpdate && currentModel === previousDefault)) {
    modelInput.value = providerDefaults[provider];
  }

  lastProvider = provider;
}

function getProviderConfig() {
  const provider = providerSelect.value || "openai";
  const model = modelInput.value.trim() || providerDefaults[provider];
  const apiKey = apiKeyInput.value.trim();

  return { provider, model, apiKey };
}

function formatProviderName(provider) {
  if (provider === "openai") return "OpenAI";
  if (provider === "anthropic") return "Anthropic";
  if (provider === "gemini") return "Gemini";
  return provider;
}

function updateChatProviderBadge(provider) {
  if (!chatProviderBadge) return;
  chatProviderBadge.textContent = formatProviderName(provider);
}

function syncDynamicsInputsFromState() {
  linkDistanceInput.value = String(graphDynamics.linkDistance);
  chargeStrengthInput.value = String(graphDynamics.chargeStrength);
  collisionRadiusInput.value = String(graphDynamics.collisionRadius);
  nodeRadiusInput.value = String(graphDynamics.nodeRadius);

  linkDistanceValue.textContent = String(graphDynamics.linkDistance);
  chargeStrengthValue.textContent = String(graphDynamics.chargeStrength);
  collisionRadiusValue.textContent = String(graphDynamics.collisionRadius);
  nodeRadiusValue.textContent = String(graphDynamics.nodeRadius);
}

function applyGraphDynamics(restart = true) {
  simulation.force("link").distance(graphDynamics.linkDistance);
  simulation.force("charge").strength(graphDynamics.chargeStrength);
  simulation.force("collision").radius(graphDynamics.collisionRadius);

  if (node) {
    node.select("circle").attr("r", graphDynamics.nodeRadius);
  }

  if (restart) {
    simulation.alpha(0.85).restart();
  }
}

function resetChatSession() {
  chatConversation = [];
  chatHistoryContainer.innerHTML =
    '<div class="chat-message ai rounded-lg px-3 py-2">Ask questions about entities, links, or inferred implications in your graph. Commands: /help, /navigate, /animate, /summarize.</div>';
}

function setChatBusy(isBusy) {
  sendChatBtn.disabled = isBusy;
  sendChatBtn.textContent = isBusy ? "Sending..." : "Send";
  chatTypingIndicator.classList.toggle("hidden", !isBusy);
}

function openChatInterface() {
  chatBotContainer.classList.remove("hidden");
  toggleChatBtn.classList.add("hidden");
  chatInput.focus();
}

function getNodeMatches(query) {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return [];
  }

  const exact = currentGraphNodes.filter((nodeItem) => {
    const id = String(nodeItem.id || "").toLowerCase();
    const label = String(nodeItem.label || "").toLowerCase();
    return id === normalizedQuery || label === normalizedQuery;
  });

  if (exact.length > 0) {
    return exact;
  }

  return currentGraphNodes.filter((nodeItem) => {
    const id = String(nodeItem.id || "").toLowerCase();
    const label = String(nodeItem.label || "").toLowerCase();
    return id.includes(normalizedQuery) || label.includes(normalizedQuery);
  });
}

function zoomToNode(nodeItem, duration = 650) {
  const x = Number.isFinite(nodeItem.x) ? nodeItem.x : width / 2;
  const y = Number.isFinite(nodeItem.y) ? nodeItem.y : height / 2;
  const currentTransform = d3.zoomTransform(svg.node());
  const nextScale = Math.max(1.15, Math.min(2.4, currentTransform.k || 1.2));

  const transform = d3.zoomIdentity.translate(width / 2 - x * nextScale, height / 2 - y * nextScale).scale(nextScale);
  svg.transition().duration(duration).call(zoom.transform, transform);
}

function stopGraphAnimation() {
  if (graphAnimationInterval) {
    clearInterval(graphAnimationInterval);
    graphAnimationInterval = null;
  }
}

function buildLocalGraphSummary() {
  const nodeCount = currentGraphNodes.length;
  const linkCount = currentGraphLinks.length;
  const degreeMap = new Map();

  currentGraphNodes.forEach((nodeItem) => {
    degreeMap.set(nodeItem.id, 0);
  });

  currentGraphLinks.forEach((linkItem) => {
    const sourceId = typeof linkItem.source === "object" ? linkItem.source.id : linkItem.source;
    const targetId = typeof linkItem.target === "object" ? linkItem.target.id : linkItem.target;
    degreeMap.set(sourceId, (degreeMap.get(sourceId) || 0) + 1);
    degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1);
  });

  const topConnected = currentGraphNodes
    .map((nodeItem) => ({
      label: nodeItem.label,
      degree: degreeMap.get(nodeItem.id) || 0,
    }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 5)
    .filter((item) => item.degree > 0);

  const topText =
    topConnected.length > 0
      ? topConnected.map((item) => `${item.label} (${item.degree})`).join(", ")
      : "No strongly connected nodes yet.";

  return `Graph contains ${nodeCount} nodes and ${linkCount} links. Most connected: ${topText}`;
}

async function handleNavigateCommand(commandArgs) {
  if (currentGraphNodes.length === 0) {
    return "Generate a graph first.";
  }

  if (!commandArgs) {
    return "Usage: /navigate <node label or id>";
  }

  const matches = getNodeMatches(commandArgs);
  if (matches.length === 0) {
    return `No node found for "${commandArgs}".`;
  }

  if (matches.length > 1) {
    const sample = matches
      .slice(0, 5)
      .map((item) => item.label)
      .join(", ");
    return `Multiple matches: ${sample}. Try a more specific query.`;
  }

  const selectedNode = matches[0];
  const safeX = Number.isFinite(selectedNode.x) ? selectedNode.x : width / 2;
  const safeY = Number.isFinite(selectedNode.y) ? selectedNode.y : height / 2;
  selectedNode.x = safeX;
  selectedNode.y = safeY;

  zoomToNode(selectedNode);
  await showNodeInfoPopup(selectedNode.label, safeX, safeY);
  return `Navigated to "${selectedNode.label}".`;
}

function handleAnimateCommand(commandArgs) {
  if (currentGraphNodes.length === 0) {
    return "Generate a graph first.";
  }

  const mode = (commandArgs || "").toLowerCase().trim();

  if (mode === "stop") {
    stopGraphAnimation();
    return "Graph animation stopped.";
  }

  if (mode === "pulse") {
    simulation.alpha(1).restart();
    return "Graph force simulation pulsed.";
  }

  if (mode === "start" || mode === "" || mode === "tour") {
    stopGraphAnimation();
    graphAnimationCursor = 0;
    graphAnimationInterval = setInterval(() => {
      if (currentGraphNodes.length === 0) {
        stopGraphAnimation();
        return;
      }

      const currentNode = currentGraphNodes[graphAnimationCursor % currentGraphNodes.length];
      graphAnimationCursor += 1;
      zoomToNode(currentNode, 500);
    }, 2000);
    return "Graph animation started. Use /animate stop to stop.";
  }

  return "Usage: /animate [start|stop|pulse]";
}

async function handleSummarizeCommand(commandArgs) {
  if (currentGraphNodes.length === 0) {
    return "Generate a graph first.";
  }

  const { provider, model, apiKey } = getProviderConfig();
  const graphJson = JSON.stringify({ nodes: currentGraphNodes, links: currentGraphLinks });

  if (!apiKey) {
    return `${buildLocalGraphSummary()} Add an API key for deeper AI summarization.`;
  }

  try {
    const userPrompt = commandArgs
      ? `Summarize this graph with focus on "${commandArgs}". Include key nodes, links, and insights.\n\nGraph JSON:\n${graphJson}`
      : `Summarize the most important structures and insights in this graph in 5-7 bullet points.\n\nGraph JSON:\n${graphJson}`;

    const summary = await requestLLM({
      provider,
      apiKey,
      model,
      systemPrompt:
        "You are a graph analyst. Provide concise, high-signal summaries grounded only in the provided graph.",
      userPrompt,
    });

    return summary || "Could not generate summary.";
  } catch (error) {
    return `Summary failed: ${error.message || "request failed"}.`;
  }
}

async function executeSlashCommand(rawCommand) {
  const trimmed = rawCommand.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }

  const commandLine = trimmed.slice(1).trim();
  const [commandName, ...restParts] = commandLine.split(/\s+/);
  const args = restParts.join(" ").trim();
  const command = (commandName || "").toLowerCase();

  if (!command || command === "help" || command === "commands") {
    return "Commands:\n/navigate <node>\n/animate [start|stop|pulse]\n/summarize [focus topic]\n/help";
  }

  if (command === "navigate") {
    return handleNavigateCommand(args);
  }

  if (command === "animate") {
    return handleAnimateCommand(args);
  }

  if (command === "summarize" || command === "summary") {
    return handleSummarizeCommand(args);
  }

  return `Unknown command: /${command}. Use /help.`;
}

function resizeGraph() {
  width = graphContainer ? graphContainer.offsetWidth : window.innerWidth;
  height = graphContainer ? graphContainer.offsetHeight : window.innerHeight;
  svg.attr("viewBox", [0, 0, width, height]);
  simulation.force("center", d3.forceCenter(width / 2, height / 2));
  simulation.alpha(0.3).restart();
}

function renderGraph(nodes, links) {
  currentGraphNodes = nodes;
  currentGraphLinks = links;

  graphPlaceholder.classList.add("hidden");
  g.selectAll("*").remove();

  link = g
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("class", "link")
    .attr("marker-end", "url(#arrow)");

  linkLabel = g
    .append("g")
    .attr("class", "link-labels")
    .selectAll("text")
    .data(links)
    .enter()
    .append("text")
    .attr("class", "link-label")
    .text((d) => d.type);

  node = g
    .append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended),
    );

  node.append("circle").attr("r", graphDynamics.nodeRadius);

  node
    .append("text")
    .attr("dy", "0.35em")
    .attr("y", -27)
    .text((d) => d.label);

  node.on("click", async (event, d) => {
    event.stopPropagation();
    await showNodeInfoPopup(d.label, d.x, d.y);
  });

  simulation.nodes(nodes).on("tick", ticked);
  simulation.force("link").links(links);
  applyGraphDynamics(false);
  simulation.alpha(1).restart();

  function ticked() {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    linkLabel
      .attr("x", (d) => (d.source.x + d.target.x) / 2)
      .attr("y", (d) => (d.source.y + d.target.y) / 2 - 10);

    node.attr("transform", (d) => `translate(${d.x},${d.y})`);
  }

  toggleChatBtn.classList.remove("hidden");
}

function dragstarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragended(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

function appendChatMessage(role, text) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("chat-message", role, "rounded-lg", "px-3", "py-2");
  messageDiv.textContent = text;
  chatHistoryContainer.appendChild(messageDiv);
  chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
}

function stripFrontMatter(text) {
  if (!text.startsWith("---\n")) {
    return text;
  }

  const closingIndex = text.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return text;
  }

  return text.slice(closingIndex + 5).trim();
}

function buildGraphPrompt(sourceText) {
  return `Analyze the source content and extract key entities and relationships.\nReturn ONLY valid JSON with this exact top-level shape:\n{\n  "nodes": [{"id":"...","label":"..."}],\n  "links": [{"source":"...","target":"...","type":"..."}]\n}\nRules:\n- Keep ids concise and unique.\n- Use meaningful labels and relationship types.\n- Include the most important concepts and links only.\n- Do not wrap JSON in markdown fences.\n\nSource Content:\n${sourceText}`;
}

function extractJsonCandidate(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fenced ? fenced[1].trim() : text.trim();

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidate = candidate.slice(firstBrace, lastBrace + 1);
  }

  return candidate;
}

function normalizeGraphData(parsed) {
  const rawNodes = Array.isArray(parsed?.nodes) ? parsed.nodes : [];
  const rawLinks = Array.isArray(parsed?.links) ? parsed.links : [];

  const nodes = rawNodes
    .map((nodeItem, index) => {
      if (!nodeItem || typeof nodeItem !== "object") return null;

      const label = String(nodeItem.label || "").trim();
      const id = String(nodeItem.id || label || `node_${index + 1}`).trim();

      if (!id || !label) return null;
      return { id, label };
    })
    .filter(Boolean);

  const nodeIdSet = new Set(nodes.map((item) => item.id));

  const links = rawLinks
    .map((linkItem) => {
      if (!linkItem || typeof linkItem !== "object") return null;

      const sourceRaw = typeof linkItem.source === "object" ? linkItem.source?.id : linkItem.source;
      const targetRaw = typeof linkItem.target === "object" ? linkItem.target?.id : linkItem.target;

      const source = String(sourceRaw || "").trim();
      const target = String(targetRaw || "").trim();
      const type = String(linkItem.type || "related_to").trim();

      if (!source || !target) return null;

      if (!nodeIdSet.has(source)) {
        nodeIdSet.add(source);
        nodes.push({ id: source, label: source });
      }

      if (!nodeIdSet.has(target)) {
        nodeIdSet.add(target);
        nodes.push({ id: target, label: target });
      }

      return { source, target, type };
    })
    .filter(Boolean);

  return { nodes, links };
}

function parseGraphDataFromModel(rawText) {
  const jsonCandidate = extractJsonCandidate(rawText);
  const parsed = JSON.parse(jsonCandidate);
  const normalized = normalizeGraphData(parsed);

  if (normalized.nodes.length === 0) {
    throw new Error("No nodes were produced from the model response.");
  }

  if (normalized.links.length === 0) {
    throw new Error("No links were produced from the model response.");
  }

  return normalized;
}

async function readErrorMessage(response) {
  const raw = await response.text();
  if (!raw) {
    return `Request failed (${response.status}).`;
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.error === "string") {
      return parsed.error;
    }

    if (parsed.error?.message) {
      return parsed.error.message;
    }

    if (parsed.message) {
      return parsed.message;
    }
  } catch (_) {
    // Keep raw text fallback.
  }

  return raw.slice(0, 300);
}

async function callOpenAI({ apiKey, model, systemPrompt, userPrompt, expectJson }) {
  const payload = {
    model,
    messages: [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      { role: "user", content: userPrompt },
    ],
    temperature: expectJson ? 0 : 0.4,
  };

  if (expectJson) {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const merged = content
      .map((item) => (typeof item === "string" ? item : item?.text || ""))
      .join("\n")
      .trim();

    if (merged) {
      return merged;
    }
  }

  throw new Error("OpenAI returned an empty response.");
}

async function callAnthropic({ apiKey, model, systemPrompt, userPrompt, expectJson }) {
  const payload = {
    model,
    max_tokens: expectJson ? 3200 : 1200,
    temperature: expectJson ? 0 : 0.4,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: [{ role: "user", content: userPrompt }],
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const result = await response.json();
  const text = (result?.content || [])
    .filter((item) => item?.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic returned an empty response.");
  }

  return text;
}

async function callGemini({ apiKey, model, systemPrompt, userPrompt, expectJson }) {
  const payload = {
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: expectJson ? 0 : 0.4,
    },
  };

  if (systemPrompt) {
    payload.systemInstruction = {
      parts: [{ text: systemPrompt }],
    };
  }

  if (expectJson) {
    payload.generationConfig.responseMimeType = "application/json";
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const result = await response.json();
  const text = (result?.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

async function requestLLM({ provider, apiKey, model, systemPrompt, userPrompt, expectJson = false }) {
  if (!apiKey) {
    throw new Error(`Missing API key for ${formatProviderName(provider)}.`);
  }

  if (!model) {
    throw new Error(`Missing model name for ${formatProviderName(provider)}.`);
  }

  if (provider === "openai") {
    return callOpenAI({ apiKey, model, systemPrompt, userPrompt, expectJson });
  }

  if (provider === "anthropic") {
    return callAnthropic({ apiKey, model, systemPrompt, userPrompt, expectJson });
  }

  if (provider === "gemini") {
    return callGemini({ apiKey, model, systemPrompt, userPrompt, expectJson });
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

async function readPdfFile(file) {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;

  const pages = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    pages.push(textContent.items.map((item) => item.str).join(" "));
  }

  return pages.join("\n").trim();
}

async function readMarkdownFile(file) {
  const text = await file.text();
  return stripFrontMatter(text).trim();
}

function appendSourceToReport(sourceTitle, sourceText) {
  const cleanedText = sourceText.trim();
  if (!cleanedText) {
    return;
  }

  const header = `## Source: ${sourceTitle}`;
  const block = `${header}\n\n${cleanedText}`;
  const currentText = reportInput.value.trim();
  reportInput.value = currentText ? `${currentText}\n\n---\n\n${block}` : block;
}

function parseYouTubeUrls(rawInput) {
  const tokens = rawInput
    .split(/[\n,]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(tokens)];
}

async function loadYoutubeTranscript() {
  const urls = parseYouTubeUrls(youtubeUrlInput.value.trim());

  if (urls.length === 0) {
    showMessageBox("Enter one or more YouTube URLs to import transcript text.");
    return;
  }

  loadYoutubeBtn.disabled = true;
  loadYoutubeBtn.textContent = "Importing 0/0...";
  let importedCount = 0;
  const failedUrls = [];

  try {
    for (let i = 0; i < urls.length; i += 1) {
      loadYoutubeBtn.textContent = `Importing ${i + 1}/${urls.length}...`;
      const response = await fetch(`/api/youtube-transcript?url=${encodeURIComponent(urls[i])}`);
      const result = await response.json();

      if (!response.ok) {
        failedUrls.push(urls[i]);
        continue;
      }

      const sourceName = result.title ? `YouTube - ${result.title}` : `YouTube - ${result.videoId || urls[i]}`;
      appendSourceToReport(sourceName, result.transcript || "");
      importedCount += 1;
    }

    if (importedCount === 0) {
      throw new Error("Could not import transcripts from the provided YouTube URLs.");
    }

    const failSuffix =
      failedUrls.length > 0 ? ` (${failedUrls.length} failed)` : "";
    showMessageBox(`Imported ${importedCount} YouTube source(s)${failSuffix}.`);
    youtubeUrlInput.value = "";
  } catch (error) {
    showMessageBox(error.message || "Failed to import YouTube transcript.");
  } finally {
    loadYoutubeBtn.disabled = false;
    loadYoutubeBtn.textContent = "Import YouTube";
  }
}

messageBoxOkBtn.addEventListener("click", () => {
  messageBox.classList.add("hidden");
});

getStartedBtn.addEventListener("click", () => {
  welcomePortal.classList.add("hidden");
  appContainer.classList.remove("hidden");
  inputModal.classList.remove("hidden");
  resizeGraph();
});

openInputModalBtn.addEventListener("click", () => {
  inputModal.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", closeInputModal);
cancelModalBtn.addEventListener("click", closeInputModal);

inputModal.addEventListener("click", (event) => {
  if (event.target === inputModal) {
    closeInputModal();
  }
});

providerSelect.addEventListener("change", () => {
  syncProviderFields(true);
});

function handleDynamicsInput(controlName, value) {
  graphDynamics[controlName] = Number.parseInt(value, 10);
  syncDynamicsInputsFromState();
  applyGraphDynamics(true);
}

linkDistanceInput.addEventListener("input", (event) => {
  handleDynamicsInput("linkDistance", event.target.value);
});

chargeStrengthInput.addEventListener("input", (event) => {
  handleDynamicsInput("chargeStrength", event.target.value);
});

collisionRadiusInput.addEventListener("input", (event) => {
  handleDynamicsInput("collisionRadius", event.target.value);
});

nodeRadiusInput.addEventListener("input", (event) => {
  handleDynamicsInput("nodeRadius", event.target.value);
});

resetDynamicsBtn.addEventListener("click", () => {
  Object.assign(graphDynamics, graphDynamicsDefaults);
  syncDynamicsInputsFromState();
  applyGraphDynamics(true);
});

function isPdfFile(file) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isMarkdownFile(file) {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    file.type === "text/markdown" ||
    file.type === "text/plain"
  );
}

pdfUploadInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);

  if (files.length === 0) {
    fileNameDisplay.textContent = "No PDFs selected";
    return;
  }

  const validFiles = files.filter(isPdfFile);
  const skippedCount = files.length - validFiles.length;
  fileNameDisplay.textContent = `${validFiles.length} PDF file(s) selected`;

  if (validFiles.length === 0) {
    showMessageBox("No valid PDFs were selected.");
    fileNameDisplay.textContent = "No PDFs selected";
    pdfUploadInput.value = "";
    return;
  }

  let importedCount = 0;
  const failedFiles = [];

  for (const file of validFiles) {
    try {
      const extractedText = await readPdfFile(file);

      if (!extractedText) {
        failedFiles.push(file.name);
        continue;
      }

      appendSourceToReport(`PDF - ${file.name}`, extractedText);
      importedCount += 1;
    } catch (_) {
      failedFiles.push(file.name);
    }
  }

  const details = [];
  if (importedCount === 0) {
    details.push("No PDF text could be extracted");
  } else {
    details.push(`Imported ${importedCount}/${validFiles.length} PDF file(s)`);
  }
  if (failedFiles.length > 0) {
    details.push(`${failedFiles.length} failed`);
  }
  if (skippedCount > 0) {
    details.push(`${skippedCount} skipped (invalid type)`);
  }

  showMessageBox(`${details.join(", ")}.`);
  pdfUploadInput.value = "";
});

markdownUploadInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);

  if (files.length === 0) {
    markdownFileNameDisplay.textContent = "No Markdown files selected";
    return;
  }

  const validFiles = files.filter(isMarkdownFile);
  const skippedCount = files.length - validFiles.length;
  markdownFileNameDisplay.textContent = `${validFiles.length} Markdown file(s) selected`;

  if (validFiles.length === 0) {
    showMessageBox("No valid Markdown files were selected.");
    markdownFileNameDisplay.textContent = "No Markdown files selected";
    markdownUploadInput.value = "";
    return;
  }

  let importedCount = 0;
  const failedFiles = [];

  for (const file of validFiles) {
    try {
      const markdownText = await readMarkdownFile(file);

      if (!markdownText) {
        failedFiles.push(file.name);
        continue;
      }

      appendSourceToReport(`Markdown - ${file.name}`, markdownText);
      importedCount += 1;
    } catch (_) {
      failedFiles.push(file.name);
    }
  }

  const details = [];
  if (importedCount === 0) {
    details.push("No Markdown content could be extracted");
  } else {
    details.push(`Imported ${importedCount}/${validFiles.length} Markdown file(s)`);
  }
  if (failedFiles.length > 0) {
    details.push(`${failedFiles.length} failed`);
  }
  if (skippedCount > 0) {
    details.push(`${skippedCount} skipped (invalid type)`);
  }

  showMessageBox(`${details.join(", ")}.`);
  markdownUploadInput.value = "";
});

loadYoutubeBtn.addEventListener("click", async () => {
  await loadYoutubeTranscript();
});

submitInputBtn.addEventListener("click", async () => {
  const sourceText = reportInput.value.trim();
  const { provider, model, apiKey } = getProviderConfig();

  if (!apiKey) {
    showMessageBox(`Please enter your ${formatProviderName(provider)} API key.`);
    return;
  }

  if (!sourceText) {
    showMessageBox("Please provide source text, upload a file, or import a YouTube URL.");
    return;
  }

  submitInputBtn.disabled = true;
  submitInputBtn.textContent = "Generating...";
  closeInputModal();
  showProgressBar();

  try {
    const rawGraphResponse = await requestLLM({
      provider,
      apiKey,
      model,
      expectJson: true,
      systemPrompt: "You extract structured knowledge graphs from source material. Return strict JSON only.",
      userPrompt: buildGraphPrompt(sourceText),
    });

    const graphData = parseGraphDataFromModel(rawGraphResponse);
    renderGraph(graphData.nodes, graphData.links);
    resetChatSession();
  } catch (error) {
    graphPlaceholder.classList.remove("hidden");
    showMessageBox(error.message || "Graph generation failed.");
  } finally {
    submitInputBtn.disabled = false;
    submitInputBtn.textContent = "Generate Graph";
    hideProgressBar();
  }
});

toggleChatBtn.addEventListener("click", () => {
  const chatVisible = !chatBotContainer.classList.contains("hidden");

  if (chatVisible) {
    chatBotContainer.classList.add("hidden");
    toggleChatBtn.classList.remove("hidden");
  } else {
    openChatInterface();
  }
});

closeChatBtn.addEventListener("click", () => {
  chatBotContainer.classList.add("hidden");
  toggleChatBtn.classList.remove("hidden");
});

clearChatBtn.addEventListener("click", () => {
  resetChatSession();
  chatInput.value = "";
});

sendChatBtn.addEventListener("click", async () => {
  const question = chatInput.value.trim();
  if (!question) return;

  appendChatMessage("user", question);
  chatInput.value = "";

  if (question.startsWith("/")) {
    setChatBusy(true);

    try {
      const commandResponse = await executeSlashCommand(question);
      appendChatMessage("ai", commandResponse || "Command executed.");
    } catch (error) {
      appendChatMessage("ai", `Command failed: ${error.message || "request failed"}.`);
    } finally {
      setChatBusy(false);
    }

    return;
  }

  if (currentGraphNodes.length === 0 || currentGraphLinks.length === 0) {
    showMessageBox("Generate a graph first.");
    return;
  }

  const { provider, model, apiKey } = getProviderConfig();
  if (!apiKey) {
    showMessageBox(`Enter your ${formatProviderName(provider)} API key first.`);
    return;
  }

  chatConversation.push({ role: "user", content: question });
  setChatBusy(true);

  try {
    const graphJson = JSON.stringify({ nodes: currentGraphNodes, links: currentGraphLinks });
    const recentConversation = chatConversation
      .slice(-8)
      .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
      .join("\n");

    const answer = await requestLLM({
      provider,
      apiKey,
      model,
      systemPrompt:
        "You are a graph assistant in a research workspace. Use only the provided graph data. Be concise, directly answer the question, and say when information is missing.",
      userPrompt: `Knowledge graph JSON:\n${graphJson}\n\nConversation so far:\n${recentConversation}\n\nRespond to the latest user question in clear, practical language.`,
    });

    const safeAnswer = answer || "Could not generate an answer.";
    chatConversation.push({ role: "assistant", content: safeAnswer });
    appendChatMessage("ai", safeAnswer);
  } catch (error) {
    appendChatMessage("ai", `Error: ${error.message || "Request failed."}`);
  } finally {
    setChatBusy(false);
  }
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !sendChatBtn.disabled) {
    event.preventDefault();
    sendChatBtn.click();
  }
});

document.addEventListener("keydown", (event) => {
  const isCommandPaletteShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

  if (!isCommandPaletteShortcut) {
    return;
  }

  event.preventDefault();
  openChatInterface();
});

async function showNodeInfoPopup(nodeLabel, nodeX, nodeY) {
  nodeInfoPopup.classList.remove("hidden");
  popupNodeTitle.textContent = nodeLabel;
  popupNodeSummary.innerHTML = '<div class="spinner mx-auto"></div>';

  const graphRect = graphContainer.getBoundingClientRect();
  const currentTransform = d3.zoomTransform(svg.node());

  let x = graphRect.left + currentTransform.applyX(nodeX);
  let y = graphRect.top + currentTransform.applyY(nodeY);

  const popupWidth = 320;
  const popupHeight = 220;

  if (x + popupWidth > window.innerWidth - 20) x = window.innerWidth - popupWidth - 20;
  if (y + popupHeight > window.innerHeight - 20) y = window.innerHeight - popupHeight - 20;
  if (x < 20) x = 20;
  if (y < 20) y = 20;

  nodeInfoPopup.style.left = `${x}px`;
  nodeInfoPopup.style.top = `${y}px`;

  const { provider, model, apiKey } = getProviderConfig();
  if (!apiKey) {
    popupNodeSummary.textContent = `Add a ${formatProviderName(provider)} API key to fetch node summaries.`;
    return;
  }

  try {
    const graphJson = JSON.stringify({ nodes: currentGraphNodes, links: currentGraphLinks });
    const summary = await requestLLM({
      provider,
      apiKey,
      model,
      systemPrompt: "You summarize graph nodes with concise, factual language.",
      userPrompt: `Given this knowledge graph JSON:\n${graphJson}\n\nSummarize the node \"${nodeLabel}\" in 2-3 sentences. Focus on what it connects to and why it matters.`,
    });

    popupNodeSummary.textContent = summary || "Could not generate summary.";
  } catch (_) {
    popupNodeSummary.textContent = "Failed to load summary.";
  }
}

closeNodeInfoPopupBtn.addEventListener("click", () => {
  nodeInfoPopup.classList.add("hidden");
});

svg.on("click", () => {
  nodeInfoPopup.classList.add("hidden");
});

window.addEventListener("resize", resizeGraph);

syncProviderFields(false);
syncDynamicsInputsFromState();
applyGraphDynamics(false);
resetChatSession();
setChatBusy(false);
resizeGraph();
