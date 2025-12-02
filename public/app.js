import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Set PDF.js worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Global variables for Firebase (Canvas environment auth)
let app;
let auth;

// Global variables to store the current graph data for chatbot
let currentGraphNodes = [];
let currentGraphLinks = [];

// UI elements
const welcomePortal = document.getElementById('welcomePortal');
const getStartedBtn = document.getElementById('getStartedBtn');
const appContainer = document.getElementById('appContainer');

const openInputModalBtn = document.getElementById('openInputModalBtn');
const inputModal = document.getElementById('inputModal');
const closeModalBtn = document.getElementById('closeModalBtn');

const reportInput = document.getElementById('reportInput');
const apiKeyInput = document.getElementById('apiKeyInput');
const submitInputBtn = document.getElementById('submitInputBtn');
const graphContainer = document.getElementById('graphContainer');
const knowledgeGraphSvg = document.getElementById('knowledgeGraphSvg');
const graphPlaceholder = document.getElementById('graphPlaceholder');
const pdfUploadInput = document.getElementById('pdfUploadInput');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const progressBarOverlay = document.getElementById('progressBarOverlay');
const progressBarFill = document.getElementById('progressBarFill');
const progressText = document.getElementById('progressText');

// Chatbot elements
const chatBotContainer = document.getElementById('chatBotContainer');
const chatHistory = document.getElementById('chatHistory');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const toggleChatBtn = document.getElementById('toggleChatBtn');
const closeChatBtn = document.getElementById('closeChatBtn');

// Node Info Pop-up elements
const nodeInfoPopup = document.getElementById('nodeInfoPopup');
const closeNodeInfoPopupBtn = document.getElementById('closeNodeInfoPopup');
const popupNodeTitle = document.getElementById('popupNodeTitle');
const popupNodeSummary = document.getElementById('popupNodeSummary');

let progressInterval;

let width = window.innerWidth;
let height = window.innerHeight;

// --- Firebase Initialization (for Canvas environment) ---
async function initializeFirebase() {
    try {
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        if (Object.keys(firebaseConfig).length === 0) {
            console.log("No Firebase config found, running without Firebase.");
            return;
        }
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);

        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }
        console.log("Firebase initialized and authenticated.");
    } catch (error) {
        console.log("Running without Firebase authentication.");
    }
}
initializeFirebase();

// --- UI Event Listeners ---
document.getElementById('messageBoxOkBtn').addEventListener('click', () => {
    document.getElementById('messageBox').classList.add('hidden');
});

// Welcome portal -> App
getStartedBtn.addEventListener('click', () => {
    welcomePortal.classList.add('hidden');
    appContainer.classList.remove('hidden');
    inputModal.classList.remove('hidden');
});

// Modal controls
openInputModalBtn.addEventListener('click', () => {
    inputModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    inputModal.classList.add('hidden');
});

// Close modal when clicking backdrop
inputModal.addEventListener('click', (e) => {
    if (e.target === inputModal) {
        inputModal.classList.add('hidden');
    }
});

// Chat toggle
toggleChatBtn.addEventListener('click', () => {
    const isVisible = !chatBotContainer.classList.contains('hidden');
    if (isVisible) {
        chatBotContainer.classList.add('hidden');
        toggleChatBtn.classList.remove('hidden');
    } else {
        chatBotContainer.classList.remove('hidden');
        toggleChatBtn.classList.add('hidden');
    }
});

closeChatBtn.addEventListener('click', () => {
    chatBotContainer.classList.add('hidden');
    toggleChatBtn.classList.remove('hidden');
});

// --- D3 Graph Setup ---
const svg = d3.select("#knowledgeGraphSvg")
    .attr("viewBox", [0, 0, width, height]);

svg.append("defs").append("marker")
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

const simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(200))
    .force("charge", d3.forceManyBody().strength(-500))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(30));

let link, node, linkLabel;

const zoom = d3.zoom()
    .scaleExtent([0.1, 8])
    .on("zoom", (event) => {
        g.attr("transform", event.transform);
    });
svg.call(zoom);

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

    graphPlaceholder.classList.add('hidden');
    g.selectAll("*").remove();

    link = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("class", "link")
        .attr("marker-end", "url(#arrow)");

    linkLabel = g.append("g")
        .attr("class", "link-labels")
        .selectAll("text")
        .data(links)
        .enter().append("text")
        .attr("class", "link-label")
        .text(d => d.type);

    node = g.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(nodes)
        .enter().append("g")
        .attr("class", "node")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("circle")
        .attr("r", 18);

    node.append("text")
        .attr("dy", "0.35em")
        .attr("y", -25)
        .text(d => d.label);

    node.on("click", async (event, d) => {
        event.stopPropagation();
        await showNodeInfoPopup(d.label, d.x, d.y);
    });

    simulation
        .nodes(nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(links);

    simulation.alpha(1).restart();

    function ticked() {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        linkLabel
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2 - 10);

        node
            .attr("transform", d => `translate(${d.x},${d.y})`);
    }

    // Show chat button after graph is generated
    toggleChatBtn.classList.remove('hidden');
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

function showMessageBox(message) {
    const messageBox = document.getElementById('messageBox');
    const messageBoxText = document.getElementById('messageBoxText');
    messageBoxText.textContent = message;
    messageBox.classList.remove('hidden');
}

function showProgressBar() {
    progressBarOverlay.classList.remove('hidden');
    progressBarFill.style.width = '0%';
    progressText.textContent = '0%';
    let progress = 0;
    progressInterval = setInterval(() => {
        if (progress < 95) {
            progress += Math.random() * 5;
            if (progress > 95) progress = 95;
            progressBarFill.style.width = `${progress}%`;
            progressText.textContent = `${Math.floor(progress)}%`;
        }
    }, 200);
}

function hideProgressBar() {
    clearInterval(progressInterval);
    progressBarFill.style.width = '100%';
    progressText.textContent = '100%';
    setTimeout(() => {
        progressBarOverlay.classList.add('hidden');
    }, 500);
}

// PDF upload
pdfUploadInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
        fileNameDisplay.textContent = 'No file';
        return;
    }

    if (file.type !== 'application/pdf') {
        showMessageBox("Please upload a valid PDF file.");
        fileNameDisplay.textContent = 'No file';
        pdfUploadInput.value = '';
        return;
    }

    fileNameDisplay.textContent = file.name;
    reportInput.value = '';

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const pdfData = new Uint8Array(e.target.result);
            const loadingTask = pdfjsLib.getDocument({ data: pdfData });
            const pdf = await loadingTask.promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
            reportInput.value = fullText.trim();
            showMessageBox("PDF loaded. Click Generate to create the graph.");
        } catch (error) {
            console.error("Error processing PDF:", error);
            showMessageBox("Failed to process PDF.");
            reportInput.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
});

// Generate graph
submitInputBtn.addEventListener('click', async () => {
    const reportText = reportInput.value.trim();
    const userApiKey = apiKeyInput.value.trim();

    if (!userApiKey) {
        showMessageBox("Please enter your Gemini API Key.");
        return;
    }

    if (!reportText) {
        showMessageBox("Please enter text or upload a PDF.");
        return;
    }

    submitInputBtn.disabled = true;
    submitInputBtn.textContent = 'Generating...';
    inputModal.classList.add('hidden');
    showProgressBar();

    try {
        let chatHistory = [];
        const prompt = `Analyze the following research report and extract key concepts (nodes) and their relationships (links). Represent the output as a JSON object with two arrays: 'nodes' and 'links'.
Each node should have an 'id' (unique identifier) and a 'label' (the full concept name).
Each link should have a 'source' (id of the source node), a 'target' (id of the target node), and a 'type' (description of the relationship).
Focus on key concepts and meaningful relationships.

Research Report:
${reportText}`;

        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        const payload = {
            contents: chatHistory,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "nodes": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "id": { "type": "STRING" },
                                    "label": { "type": "STRING" }
                                }
                            }
                        },
                        "links": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "source": { "type": "STRING" },
                                    "target": { "type": "STRING" },
                                    "type": { "type": "STRING" }
                                }
                            }
                        }
                    }
                }
            }
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${userApiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
            const graphData = JSON.parse(result.candidates[0].content.parts[0].text);
            if (graphData.nodes && graphData.links) {
                renderGraph(graphData.nodes, graphData.links);
            } else {
                showMessageBox("Could not generate graph from the text.");
                graphPlaceholder.classList.remove('hidden');
            }
        } else {
            showMessageBox("Failed to get AI response. Check your API key.");
            graphPlaceholder.classList.remove('hidden');
        }

    } catch (error) {
        console.error("Error:", error);
        showMessageBox("An error occurred. Please try again.");
        graphPlaceholder.classList.remove('hidden');
    } finally {
        submitInputBtn.disabled = false;
        submitInputBtn.textContent = 'Generate';
        hideProgressBar();
    }
});

// Chat
sendChatBtn.addEventListener('click', async () => {
    const userQuestion = chatInput.value.trim();
    if (!userQuestion) return;

    if (currentGraphNodes.length === 0) {
        showMessageBox("Generate a graph first.");
        chatInput.value = '';
        return;
    }

    const userMessageDiv = document.createElement('div');
    userMessageDiv.classList.add('chat-message', 'user', 'bg-zinc-700', 'rounded-lg', 'px-3', 'py-2');
    userMessageDiv.textContent = userQuestion;
    chatHistory.appendChild(userMessageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    chatInput.value = '';
    sendChatBtn.disabled = true;

    try {
        const userApiKey = apiKeyInput.value.trim();
        if (!userApiKey) {
            showMessageBox("Enter your API key first.");
            sendChatBtn.disabled = false;
            return;
        }

        const graphJson = JSON.stringify({ nodes: currentGraphNodes, links: currentGraphLinks });

        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: `Answer based only on this knowledge graph:\n${graphJson}\n\nQuestion: ${userQuestion}` }]
            }]
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${userApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Could not get response.";

        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.classList.add('chat-message', 'ai', 'bg-zinc-800', 'rounded-lg', 'px-3', 'py-2');
        aiMessageDiv.textContent = aiText;
        chatHistory.appendChild(aiMessageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;

    } catch (error) {
        console.error("Chat error:", error);
    } finally {
        sendChatBtn.disabled = false;
    }
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !sendChatBtn.disabled) {
        e.preventDefault();
        sendChatBtn.click();
    }
});

// Node popup
async function showNodeInfoPopup(nodeLabel, nodeX, nodeY) {
    nodeInfoPopup.classList.remove('hidden');
    popupNodeTitle.textContent = nodeLabel;
    popupNodeSummary.innerHTML = '<div class="spinner mx-auto"></div>';

    const graphRect = graphContainer.getBoundingClientRect();
    const currentTransform = d3.zoomTransform(svg.node());

    let x = graphRect.left + currentTransform.applyX(nodeX);
    let y = graphRect.top + currentTransform.applyY(nodeY);

    // Keep in viewport
    const popupWidth = 288;
    const popupHeight = 200;
    if (x + popupWidth > window.innerWidth - 20) x = window.innerWidth - popupWidth - 20;
    if (y + popupHeight > window.innerHeight - 20) y = window.innerHeight - popupHeight - 20;
    if (x < 20) x = 20;
    if (y < 20) y = 20;

    nodeInfoPopup.style.left = `${x}px`;
    nodeInfoPopup.style.top = `${y}px`;

    try {
        const userApiKey = apiKeyInput.value.trim();
        if (!userApiKey) {
            popupNodeSummary.textContent = "Enter API key to get info.";
            return;
        }

        const graphJson = JSON.stringify({ nodes: currentGraphNodes, links: currentGraphLinks });

        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: `Summarize "${nodeLabel}" in 2-3 sentences based on this graph:\n${graphJson}` }]
            }]
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${userApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        popupNodeSummary.textContent = result.candidates?.[0]?.content?.parts?.[0]?.text || "Could not get summary.";

    } catch (error) {
        popupNodeSummary.textContent = "Failed to load summary.";
    }
}

closeNodeInfoPopupBtn.addEventListener('click', () => {
    nodeInfoPopup.classList.add('hidden');
});

svg.on("click", () => {
    nodeInfoPopup.classList.add('hidden');
});

// Resize handler
window.addEventListener('resize', resizeGraph);

// Initial state
resizeGraph();
