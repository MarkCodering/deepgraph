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

const openInputModalBtn = document.getElementById('openInputModalBtn');
const inputModal = document.getElementById('inputModal');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');

const reportInputSection = document.getElementById('reportInputSection'); // Now always visible

const reportInput = document.getElementById('reportInput');
const apiKeyInput = document.getElementById('apiKeyInput');
const submitInputBtn = document.getElementById('submitInputBtn');
const submitButtonText = document.getElementById('submitButtonText');
const submitLoadingSpinner = document.getElementById('submitLoadingSpinner');
const graphContainer = document.getElementById('graphContainer');
const knowledgeGraphSvg = document.getElementById('knowledgeGraphSvg');
const graphPlaceholder = document.getElementById('graphPlaceholder');
const pdfUploadInput = document.getElementById('pdfUploadInput');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const pdfLoadingSpinner = document.getElementById('pdfLoadingSpinner');
const fileUploadArea = document.getElementById('fileUploadArea');
const progressBarOverlay = document.getElementById('progressBarOverlay');
const progressBarFill = document.getElementById('progressBarFill');
const progressText = document.getElementById('progressText');

// Chatbot elements
const chatBotContainer = document.getElementById('chatBotContainer');
const chatHeader = document.getElementById('chatHeader');
const chatHistory = document.getElementById('chatHistory');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const sendButtonText = document.getElementById('sendButtonText');
const chatLoadingSpinner = document.getElementById('chatLoadingSpinner');

// Node Info Pop-up elements
const nodeInfoPopup = document.getElementById('nodeInfoPopup');
const closeNodeInfoPopupBtn = document.getElementById('closeNodeInfoPopup');
const popupNodeTitle = document.getElementById('popupNodeTitle');
const popupNodeSummary = document.getElementById('popupNodeSummary');

let progressInterval;
let isDraggingChatbot = false;
let chatbotOffsetX, chatbotOffsetY;

let width = window.innerWidth;
let height = window.innerHeight;

// --- Firebase Initialization (for Canvas environment) ---
async function initializeFirebase() {
    try {
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        if (Object.keys(firebaseConfig).length === 0) {
            console.error("Firebase config is missing or empty.");
            showMessageBox("Firebase configuration is missing. Please ensure the environment is set up correctly.");
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
        console.log("Firebase initialized and authenticated for Canvas environment.");
    } catch (error) {
        console.error("Error initializing Firebase or authenticating:", error);
        showMessageBox("Failed to initialize Firebase or authenticate for Canvas. Please try again later.");
    }
}
initializeFirebase();

function updateAuthUI(user) {
    // This function is simplified as auth is removed.
    // It now just ensures the report input section is visible.
    reportInputSection.classList.remove('hidden');
    modalTitle.textContent = "Generate Knowledge Graph";
    modalSubtitle.textContent = "Enter your report details below.";
}

// --- UI Event Listeners ---
document.getElementById('messageBoxOkBtn').addEventListener('click', () => {
    document.getElementById('messageBox').style.display = 'none';
});

// Function to handle opening the input modal (simplified)
async function handleOpenInputModal() {
    inputModal.classList.remove('hidden');
    updateAuthUI(null); // Call to ensure report input section is visible
}

// Open input/auth modal
openInputModalBtn.addEventListener('click', handleOpenInputModal);

// --- Existing App Logic ---
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
    width = window.innerWidth;
    height = window.innerHeight;
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
        .attr("r", 18)
        .attr("fill", "rgba(255, 255, 255, 0.15)");

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

    setMainButtonPosition('top-left');
    chatBotContainer.style.display = 'flex';
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
    messageBox.style.display = 'flex';
}

function setMainButtonPosition(position) {
    if (position === 'center') {
        openInputModalBtn.classList.remove('btn-top-left');
        openInputModalBtn.classList.add('btn-center');
    } else if (position === 'top-left') {
        openInputModalBtn.classList.remove('btn-center');
        openInputModalBtn.classList.add('btn-top-left');
    }
}

function setLoadingState(isLoading) {
    submitInputBtn.disabled = isLoading;
    if (isLoading) {
        submitButtonText.style.display = 'none';
        submitLoadingSpinner.classList.remove('hidden');
    } else {
        submitButtonText.style.display = 'inline';
        submitLoadingSpinner.classList.add('hidden');
    }
}

function setPdfLoadingState(isLoading) {
    pdfUploadInput.disabled = isLoading;
    fileUploadArea.style.cursor = isLoading ? 'not-allowed' : 'pointer';
    if (isLoading) {
        pdfLoadingSpinner.classList.remove('hidden');
        fileNameDisplay.textContent = 'Processing PDF...';
    } else {
        pdfLoadingSpinner.classList.add('hidden');
    }
}

function showProgressBar() {
    progressBarOverlay.style.display = 'flex';
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
        progressBarOverlay.style.display = 'none';
    }, 500);
}

pdfUploadInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
        fileNameDisplay.textContent = 'No file chosen';
        return;
    }

    if (file.type !== 'application/pdf') {
        showMessageBox("Please upload a valid PDF file.");
        fileNameDisplay.textContent = 'No file chosen';
        pdfUploadInput.value = '';
        return;
    }

    fileNameDisplay.textContent = file.name;
    setPdfLoadingState(true);
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
            showMessageBox("PDF content loaded successfully into the text area. Click 'Generate Graph' to visualize.");
        } catch (error) {
            console.error("Error processing PDF:", error);
            showMessageBox("Failed to process PDF. It might be corrupted or in an unsupported format.");
            reportInput.value = '';
        } finally {
            setPdfLoadingState(false);
        }
    };
    reader.readAsArrayBuffer(file);
});

fileUploadArea.addEventListener('click', () => {
    if (!pdfUploadInput.disabled) {
        pdfUploadInput.click();
    }
});

submitInputBtn.addEventListener('click', async () => {
    const reportText = reportInput.value.trim();
    const userApiKey = apiKeyInput.value.trim();

    if (!userApiKey) {
        showMessageBox("Please enter your Gemini API Key.");
        return;
    }

    if (!reportText) {
        showMessageBox("Please enter a research report or upload a PDF to generate the knowledge graph.");
        return;
    }

    setLoadingState(true);
    inputModal.classList.add('hidden');
    showProgressBar();

    try {
        let chatHistory = [];
        const prompt = `Analyze the following research report and extract key concepts (nodes) and their relationships (links). Represent the output as a JSON object with two arrays: 'nodes' and 'links'.
Each node should have an 'id' (unique identifier, e.g., a simplified concept name) and a 'label' (the full concept name).
Each link should have a 'source' (id of the source node), a 'target' (id of the target node), and a 'type' (description of the relationship, e.g., 'explains', 'is_a', 'causes', 'has_property', 'impacts', 'leads_to', 'associated_with', 'part_of').
Ensure the relationships are meaningful and reflect the core ideas and connections within the text. Focus on scientific or technical concepts and their interdependencies.

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
                                },
                                "propertyOrdering": ["id", "label"]
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
                                },
                                "propertyOrdering": ["source", "target", "type"]
                            }
                        }
                    },
                    "propertyOrdering": ["nodes", "links"]
                }
            }
        };

        const apiKey = userApiKey;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log("AI Response for Graph Generation:", result);

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const jsonString = result.candidates[0].content.parts[0].text;
            const graphData = JSON.parse(jsonString);

            if (graphData.nodes && graphData.links) {
                renderGraph(graphData.nodes, graphData.links);
            } else {
                showMessageBox("The AI could not generate a valid knowledge graph from the provided text. This might happen with very short or unstructured text.");
                graphPlaceholder.classList.remove('hidden');
            }
        } else {
            showMessageBox("Failed to get a response from the AI. Please check your API key or try again.");
            graphPlaceholder.classList.remove('hidden');
        }

    } catch (error) {
        console.error("Error generating knowledge graph:", error);
        showMessageBox("An error occurred while generating the knowledge graph. Please check your input and API key, then try again.");
        graphPlaceholder.classList.remove('hidden');
    } finally {
        setLoadingState(false);
        hideProgressBar();
    }
});

sendChatBtn.addEventListener('click', async () => {
    const userQuestion = chatInput.value.trim();
    if (!userQuestion) {
        showMessageBox("Please type a question for the chatbot.");
        return;
    }

    if (currentGraphNodes.length === 0) {
        showMessageBox("Please generate a knowledge graph first before asking questions.");
        chatInput.value = '';
        return;
    }

    const userMessageDiv = document.createElement('div');
    userMessageDiv.classList.add('chat-message', 'user');
    userMessageDiv.textContent = userQuestion;
    chatHistory.appendChild(userMessageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    chatInput.value = '';
    sendChatBtn.disabled = true;
    sendButtonText.style.display = 'none';
    chatLoadingSpinner.classList.remove('hidden');

    try {
        const userApiKey = apiKeyInput.value.trim();
        if (!userApiKey) {
            showMessageBox("Please enter your Gemini API Key in the input modal to use the chatbot.");
            sendChatBtn.disabled = false;
            sendButtonText.classList.remove('hidden');
            chatLoadingSpinner.classList.add('hidden');
            return;
        }

        const graphJson = JSON.stringify({ nodes: currentGraphNodes, links: currentGraphLinks });

        let chatHistoryForAI = [];
        const promptForChatbot = `You are a knowledge graph analysis AI. Your task is to answer questions based *only* on the provided knowledge graph data. If the information is not present in the graph, state that you cannot answer the question based on the provided graph.

Knowledge Graph Data (JSON):
${graphJson}

User Question: ${userQuestion}`;

        chatHistoryForAI.push({ role: "user", parts: [{ text: promptForChatbot }] });
        const payload = {
            contents: chatHistoryForAI
        };

        const apiKey = userApiKey;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log("AI Response for Chatbot:", result);

        let aiResponseText = "Could not get a response from the AI.";
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            aiResponseText = result.candidates[0].content.parts[0].text;
        }

        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.classList.add('chat-message', 'ai');
        aiMessageDiv.textContent = aiResponseText;
        chatHistory.appendChild(aiMessageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;

    } catch (error) {
        console.error("Error communicating with chatbot AI:", error);
        const errorMessageDiv = document.createElement('div');
        errorMessageDiv.classList.add('chat-message', 'ai');
        errorMessageDiv.textContent = "Error: Failed to get a response from the AI. Please check your API key and network connection.";
        chatHistory.appendChild(errorMessageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    } finally {
        sendChatBtn.disabled = false;
        sendButtonText.style.display = 'inline';
        chatLoadingSpinner.classList.add('hidden');
    }
});

chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !sendChatBtn.disabled) {
        event.preventDefault();
        sendChatBtn.click();
    }
});

// Node Info Pop-up functionality
async function showNodeInfoPopup(nodeLabel, nodeX, nodeY) {
    nodeInfoPopup.classList.remove('hidden');
    popupNodeTitle.textContent = nodeLabel;
    popupNodeSummary.innerHTML = '<div class="popup-loading-spinner"></div>';

    const graphRect = graphContainer.getBoundingClientRect();
    const currentTransform = d3.zoomTransform(svg.node());

    const transformedX = graphRect.left + currentTransform.applyX(nodeX);
    const transformedY = graphRect.top + currentTransform.applyY(nodeY);

    // Set initial position before calculating offset
    nodeInfoPopup.style.left = `${transformedX}px`;
    nodeInfoPopup.style.top = `${transformedY}px`;
    nodeInfoPopup.style.display = 'flex'; // Temporarily show to get accurate dimensions

    const popupWidth = nodeInfoPopup.offsetWidth;
    const popupHeight = nodeInfoPopup.offsetHeight;

    let finalLeft = transformedX;
    let finalTop = transformedY;

    // Adjust if it goes off right edge
    if (finalLeft + popupWidth + 20 > window.innerWidth) { // 20px margin from edge
        finalLeft = window.innerWidth - popupWidth - 20;
    }
    // Adjust if it goes off bottom edge
    if (finalTop + popupHeight + 20 > window.innerHeight) { // 20px margin from edge
        finalTop = window.innerHeight - popupHeight - 20;
    }
    // Adjust if it goes off left edge
    if (finalLeft < 20) {
        finalLeft = 20;
    }
    // Adjust if it goes off top edge
    if (finalTop < 20) {
        finalTop = 20;
    }

    nodeInfoPopup.style.left = `${finalLeft}px`;
    nodeInfoPopup.style.top = `${finalTop}px`;
    nodeInfoPopup.style.display = 'flex'; // Final show

    try {
        const userApiKey = apiKeyInput.value.trim();
        if (!userApiKey) {
            popupNodeSummary.textContent = "Please enter your Gemini API Key in the input modal to get node information.";
            console.warn("API Key is missing for Node Summary request.");
            return;
        }

        const graphJson = JSON.stringify({ nodes: currentGraphNodes, links: currentGraphLinks });

        let chatHistoryForAI = [];
        const promptForSummary = `You are a knowledge graph analysis AI. Provide a concise summary (2-3 sentences) about the concept "${nodeLabel}" based *only* on the provided knowledge graph data. If the information is not directly available or inferable from the graph, state that you cannot answer the question based on the provided graph.

Knowledge Graph Data (JSON):
${graphJson}

Concept to summarize: ${nodeLabel}`;

        chatHistoryForAI.push({ role: "user", parts: [{ text: promptForSummary }] });
        const payload = {
            contents: chatHistoryForAI
        };

        const apiKey = userApiKey;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log("AI Response for Node Summary:", result);

        let summaryText = "The AI could not generate a summary for this node.";
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0 &&
            result.candidates[0].content.parts[0].text) {
            summaryText = result.candidates[0].content.parts[0].text;
        } else if (result.error) {
            summaryText = `Error from AI: ${result.error.message || 'Unknown error'}`;
            console.error("Gemini API Error for Node Summary:", result.error);
        } else {
            summaryText = "The AI response was unexpected or empty. Could not generate summary.";
            console.warn("Unexpected AI response structure for Node Summary:", result);
        }
        popupNodeSummary.textContent = summaryText;

    } catch (error) {
        console.error("Error fetching node summary:", error);
        popupNodeSummary.textContent = "Failed to load summary. Check API key or network connection.";
    }
}

closeNodeInfoPopupBtn.addEventListener('click', () => {
    nodeInfoPopup.style.display = 'none';
});

// This event listener will now correctly close the popover when clicking outside it
// because the close button's z-index is higher and it correctly hides the popover.
svg.on("click", () => {
    if (nodeInfoPopup.style.display !== 'none') {
        nodeInfoPopup.style.display = 'none';
    }
});

// Chatbot Draggability
chatHeader.addEventListener('mousedown', (e) => {
    isDraggingChatbot = true;
    const rect = chatBotContainer.getBoundingClientRect();
    chatbotOffsetX = e.clientX - rect.left;
    chatbotOffsetY = e.clientY - rect.top;

    chatBotContainer.style.position = 'fixed';
    chatBotContainer.style.right = 'auto';
    chatBotContainer.style.bottom = 'auto';
    chatBotContainer.style.cursor = 'grabbing';
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isDraggingChatbot) return;

    let newLeft = e.clientX - chatbotOffsetX;
    let newTop = e.clientY - chatbotOffsetY;

    const chatRect = chatBotContainer.getBoundingClientRect();
    if (newLeft < 0) newLeft = 0;
    if (newTop < 0) newTop = 0;
    if (newLeft + chatRect.width > window.innerWidth) newLeft = window.innerWidth - chatRect.width;
    if (newTop + chatRect.height > window.innerHeight) newTop = window.innerHeight - chatRect.height;

    chatBotContainer.style.left = `${newLeft}px`;
    chatBotContainer.style.top = `${newTop}px`;
});

document.addEventListener('mouseup', () => {
    isDraggingChatbot = false;
    chatBotContainer.style.cursor = 'grab';
});

// Initial setup on page load
resizeGraph();
// Show welcome portal first
welcomePortal.classList.remove('hidden');
openInputModalBtn.classList.add('hidden'); // Hide the main button until "Get Started" is clicked

getStartedBtn.addEventListener('click', () => {
    welcomePortal.classList.add('hidden'); // Hide welcome portal
    openInputModalBtn.classList.remove('hidden'); // Show the main button
    handleOpenInputModal(); // Directly call the function to open the modal
});

// Manually trigger updateAuthUI to set up the input modal correctly without auth
updateAuthUI(null);
