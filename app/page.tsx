"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import Script from "next/script";

// Types
interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Declare PDF.js types
declare global {
  interface Window {
    pdfjsLib: {
      getDocument: (data: { data: Uint8Array }) => {
        promise: Promise<PDFDocumentProxy>;
      };
      GlobalWorkerOptions: {
        workerSrc: string;
      };
    };
    __firebase_config?: string;
    __initial_auth_token?: string;
  }
}

interface PDFDocumentProxy {
  numPages: number;
  getPage: (num: number) => Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getTextContent: () => Promise<PDFTextContent>;
}

interface PDFTextContent {
  items: Array<{ str: string }>;
}

export default function Home() {
  // State
  const [showWelcome, setShowWelcome] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [reportText, setReportText] = useState("");
  const [fileName, setFileName] = useState("No file chosen");
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [messageBoxText, setMessageBoxText] = useState("");
  const [showGraph, setShowGraph] = useState(false);
  const [showChatBot, setShowChatBot] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "ai"; text: string }>
  >([{ role: "ai", text: "Hello! Ask me anything about the knowledge graph." }]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showNodePopup, setShowNodePopup] = useState(false);
  const [nodePopupTitle, setNodePopupTitle] = useState("");
  const [nodePopupSummary, setNodePopupSummary] = useState("");
  const [nodePopupPosition, setNodePopupPosition] = useState({ x: 0, y: 0 });
  const [isNodePopupLoading, setIsNodePopupLoading] = useState(false);
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);

  // Refs
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(
    null
  );
  const graphDataRef = useRef<GraphData>({ nodes: [], links: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Chatbot dragging state
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const [chatPosition, setChatPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const chatOffsetRef = useRef({ x: 0, y: 0 });

  // Initialize D3 graph
  const initializeGraph = useCallback(() => {
    if (!svgRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    // Clear existing content
    svg.selectAll("*").remove();

    // Add arrow marker
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

    // Create main group for zoom
    const g = svg.append("g");
    gRef.current = g.node();

    // Create simulation
    const simulation = d3
      .forceSimulation<GraphNode>()
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>()
          .id((d) => d.id)
          .distance(200)
      )
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    // Add zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Click to close node popup
    svg.on("click", () => {
      if (showNodePopup) {
        setShowNodePopup(false);
      }
    });
  }, [showNodePopup]);

  // Render graph with data
  const renderGraph = useCallback(
    (nodes: GraphNode[], links: GraphLink[]) => {
      if (!gRef.current || !simulationRef.current) return;

      graphDataRef.current = { nodes, links };

      const g = d3.select(gRef.current);

      // Clear existing
      g.selectAll("*").remove();

      // Create links
      const link = g
        .append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("marker-end", "url(#arrow)");

      // Create link labels
      const linkLabel = g
        .append("g")
        .attr("class", "link-labels")
        .selectAll("text")
        .data(links)
        .enter()
        .append("text")
        .attr("class", "link-label")
        .text((d) => d.type);

      // Create nodes
      const node = g
        .append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node")
        .call(
          d3
            .drag<SVGGElement, GraphNode>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );

      node
        .append("circle")
        .attr("r", 18)
        .attr("fill", "rgba(255, 255, 255, 0.15)");

      node
        .append("text")
        .attr("dy", "0.35em")
        .attr("y", -25)
        .text((d) => d.label);

      // Node click handler
      node.on("click", async (event, d) => {
        event.stopPropagation();
        if (showNodeInfoRef.current) {
          await showNodeInfoRef.current(d.label, d.x || 0, d.y || 0);
        }
      });

      // Update simulation
      simulationRef.current.nodes(nodes).on("tick", () => {
        link
          .attr("x1", (d) => (d.source as GraphNode).x || 0)
          .attr("y1", (d) => (d.source as GraphNode).y || 0)
          .attr("x2", (d) => (d.target as GraphNode).x || 0)
          .attr("y2", (d) => (d.target as GraphNode).y || 0);

        linkLabel
          .attr(
            "x",
            (d) =>
              (((d.source as GraphNode).x || 0) +
              ((d.target as GraphNode).x || 0)) / 2
          )
          .attr(
            "y",
            (d) =>
              (((d.source as GraphNode).y || 0) +
                ((d.target as GraphNode).y || 0)) /
                2 -
              10
          );

        node.attr("transform", (d) => `translate(${d.x},${d.y})`);
      });

      const linkForce = simulationRef.current.force(
        "link"
      ) as d3.ForceLink<GraphNode, GraphLink>;
      linkForce.links(links);

      simulationRef.current.alpha(1).restart();

      setShowGraph(true);
      setShowChatBot(true);

      function dragstarted(
        event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>,
        d: GraphNode
      ) {
        if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(
        event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>,
        d: GraphNode
      ) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(
        event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>,
        d: GraphNode
      ) {
        if (!event.active) simulationRef.current?.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
    },
    []
  );

  // Show node info popup - use ref to avoid dependency in renderGraph
  const showNodeInfoRef = useRef<((nodeLabel: string, nodeX: number, nodeY: number) => Promise<void>) | null>(null);
  
  showNodeInfoRef.current = async (nodeLabel: string, nodeX: number, nodeY: number) => {
    setShowNodePopup(true);
    setNodePopupTitle(nodeLabel);
    setIsNodePopupLoading(true);
    setNodePopupSummary("");

    // Calculate position
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const transform = d3.zoomTransform(svgRef.current!);
    const transformedX = svgRect.left + transform.applyX(nodeX);
    const transformedY = svgRect.top + transform.applyY(nodeY);

    let finalX = transformedX;
    let finalY = transformedY;

    const popupWidth = 320;
    const popupHeight = 400;

    if (finalX + popupWidth + 20 > window.innerWidth) {
      finalX = window.innerWidth - popupWidth - 20;
    }
    if (finalY + popupHeight + 20 > window.innerHeight) {
      finalY = window.innerHeight - popupHeight - 20;
    }
    if (finalX < 20) finalX = 20;
    if (finalY < 20) finalY = 20;

    setNodePopupPosition({ x: finalX, y: finalY });

    if (!apiKey) {
      setNodePopupSummary(
        "Please enter your Gemini API Key in the input modal to get node information."
      );
      setIsNodePopupLoading(false);
      return;
    }

    try {
      const graphJson = JSON.stringify(graphDataRef.current);

      const promptForSummary = `You are a knowledge graph analysis AI. Provide a concise summary (2-3 sentences) about the concept "${nodeLabel}" based *only* on the provided knowledge graph data. If the information is not directly available or inferable from the graph, state that you cannot answer the question based on the provided graph.

Knowledge Graph Data (JSON):
${graphJson}

Concept to summarize: ${nodeLabel}`;

      const payload = {
        contents: [{ role: "user", parts: [{ text: promptForSummary }] }],
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      let summaryText = "The AI could not generate a summary for this node.";
      if (
        result.candidates?.[0]?.content?.parts?.[0]?.text
      ) {
        summaryText = result.candidates[0].content.parts[0].text;
      } else if (result.error) {
        summaryText = `Error from AI: ${result.error.message || "Unknown error"}`;
      }

      setNodePopupSummary(summaryText);
    } catch (error) {
      console.error("Error fetching node summary:", error);
      setNodePopupSummary(
        "Failed to load summary. Check API key or network connection."
      );
    } finally {
      setIsNodePopupLoading(false);
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeGraph();

    const handleResize = () => {
      if (svgRef.current && simulationRef.current) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        d3.select(svgRef.current).attr("viewBox", [0, 0, width, height]);
        simulationRef.current.force(
          "center",
          d3.forceCenter(width / 2, height / 2)
        );
        simulationRef.current.alpha(0.3).restart();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [initializeGraph]);

  // Handle PDF file upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFileName("No file chosen");
      return;
    }

    if (file.type !== "application/pdf") {
      displayMessage("Please upload a valid PDF file.");
      setFileName("No file chosen");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFileName(file.name);
    setIsPdfLoading(true);
    setReportText("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        if (!window.pdfjsLib) {
          throw new Error("PDF.js library not loaded");
        }

        const pdfData = new Uint8Array(e.target?.result as ArrayBuffer);
        const loadingTask = window.pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => item.str).join(" ");
          fullText += pageText + "\n";
        }

        setReportText(fullText.trim());
        displayMessage(
          "PDF content loaded successfully into the text area. Click 'Generate Graph' to visualize."
        );
      } catch (error) {
        console.error("Error processing PDF:", error);
        displayMessage(
          "Failed to process PDF. It might be corrupted or in an unsupported format."
        );
        setReportText("");
      } finally {
        setIsPdfLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Display message
  const displayMessage = (message: string) => {
    setMessageBoxText(message);
    setShowMessageBox(true);
  };

  // Start progress bar
  const startProgressBar = () => {
    setShowProgressBar(true);
    setProgressPercent(0);

    progressIntervalRef.current = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev < 95) {
          return prev + Math.random() * 5;
        }
        return prev;
      });
    }, 200);
  };

  // Stop progress bar
  const stopProgressBar = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    setProgressPercent(100);
    setTimeout(() => setShowProgressBar(false), 500);
  };

  // Generate knowledge graph
  const handleGenerateGraph = async () => {
    if (!apiKey) {
      displayMessage("Please enter your Gemini API Key.");
      return;
    }

    if (!reportText.trim()) {
      displayMessage(
        "Please enter a research report or upload a PDF to generate the knowledge graph."
      );
      return;
    }

    setIsLoading(true);
    setShowModal(false);
    startProgressBar();

    try {
      const prompt = `Analyze the following research report and extract key concepts (nodes) and their relationships (links). Represent the output as a JSON object with two arrays: 'nodes' and 'links'.
Each node should have an 'id' (unique identifier, e.g., a simplified concept name) and a 'label' (the full concept name).
Each link should have a 'source' (id of the source node), a 'target' (id of the target node), and a 'type' (description of the relationship, e.g., 'explains', 'is_a', 'causes', 'has_property', 'impacts', 'leads_to', 'associated_with', 'part_of').
Ensure the relationships are meaningful and reflect the core ideas and connections within the text. Focus on scientific or technical concepts and their interdependencies.

Research Report:
${reportText}`;

      const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              nodes: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    label: { type: "STRING" },
                  },
                  propertyOrdering: ["id", "label"],
                },
              },
              links: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    source: { type: "STRING" },
                    target: { type: "STRING" },
                    type: { type: "STRING" },
                  },
                  propertyOrdering: ["source", "target", "type"],
                },
              },
            },
            propertyOrdering: ["nodes", "links"],
          },
        },
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (
        result.candidates?.[0]?.content?.parts?.[0]?.text
      ) {
        const jsonString = result.candidates[0].content.parts[0].text;
        const graphData = JSON.parse(jsonString);

        if (graphData.nodes && graphData.links) {
          renderGraph(graphData.nodes, graphData.links);
        } else {
          displayMessage(
            "The AI could not generate a valid knowledge graph from the provided text."
          );
        }
      } else {
        displayMessage(
          "Failed to get a response from the AI. Please check your API key or try again."
        );
      }
    } catch (error) {
      console.error("Error generating knowledge graph:", error);
      displayMessage(
        "An error occurred while generating the knowledge graph. Please check your input and API key, then try again."
      );
    } finally {
      setIsLoading(false);
      stopProgressBar();
    }
  };

  // Handle chat message
  const handleSendChat = async () => {
    if (!chatInput.trim()) {
      displayMessage("Please type a question for the chatbot.");
      return;
    }

    if (graphDataRef.current.nodes.length === 0) {
      displayMessage(
        "Please generate a knowledge graph first before asking questions."
      );
      setChatInput("");
      return;
    }

    const userQuestion = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: userQuestion }]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      if (!apiKey) {
        displayMessage(
          "Please enter your Gemini API Key in the input modal to use the chatbot."
        );
        setIsChatLoading(false);
        return;
      }

      const graphJson = JSON.stringify(graphDataRef.current);

      const promptForChatbot = `You are a knowledge graph analysis AI. Your task is to answer questions based *only* on the provided knowledge graph data. If the information is not present in the graph, state that you cannot answer the question based on the provided graph.

Knowledge Graph Data (JSON):
${graphJson}

User Question: ${userQuestion}`;

      const payload = {
        contents: [{ role: "user", parts: [{ text: promptForChatbot }] }],
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      let aiResponseText = "Could not get a response from the AI.";
      if (
        result.candidates?.[0]?.content?.parts?.[0]?.text
      ) {
        aiResponseText = result.candidates[0].content.parts[0].text;
      }

      setChatMessages((prev) => [...prev, { role: "ai", text: aiResponseText }]);
    } catch (error) {
      console.error("Error communicating with chatbot AI:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Error: Failed to get a response from the AI. Please check your API key and network connection.",
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Scroll chat to bottom
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Chat drag handlers
  const handleChatMouseDown = (e: React.MouseEvent) => {
    setIsDraggingChat(true);
    const rect = chatContainerRef.current?.getBoundingClientRect();
    if (rect) {
      chatOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingChat) return;

      let newX = e.clientX - chatOffsetRef.current.x;
      let newY = e.clientY - chatOffsetRef.current.y;

      const chatWidth = chatContainerRef.current?.offsetWidth || 380;
      const chatHeight = chatContainerRef.current?.offsetHeight || 650;

      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      if (newX + chatWidth > window.innerWidth)
        newX = window.innerWidth - chatWidth;
      if (newY + chatHeight > window.innerHeight)
        newY = window.innerHeight - chatHeight;

      setChatPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDraggingChat(false);
    };

    if (isDraggingChat) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingChat]);

  return (
    <>
      {/* PDF.js Script */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        onLoad={() => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            setPdfJsLoaded(true);
          }
        }}
      />

      {/* Welcome Portal */}
      {showWelcome && (
        <div id="welcomePortal" className="welcome-portal">
          <h1>Welcome to DeepGraph</h1>
          <p>
            Transform complex research reports into interactive knowledge graphs
            and chat with AI to explore insights.
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              setShowWelcome(false);
              setShowModal(true);
            }}
          >
            Get Started
          </button>
        </div>
      )}

      {/* Graph Container */}
      <div id="graphContainer" className="graph-container">
        <svg ref={svgRef} id="knowledgeGraphSvg" className="w-full h-full" />
        {!showGraph && (
          <div id="graphPlaceholder" className="graph-placeholder">
            Your interactive knowledge graph will be visualized here.
          </div>
        )}
      </div>

      {/* Open Modal Button */}
      {!showWelcome && !showModal && (
        <button
          className={`btn btn-primary ${showGraph ? "btn-top-left" : "btn-center"}`}
          onClick={() => setShowModal(true)}
        >
          <span>Generate Knowledge Graph</span>
          <i className="fas fa-project-diagram" />
        </button>
      )}

      {/* Input Modal */}
      {showModal && (
        <div className="card">
          <div className="card-header">
            <h1>Generate Knowledge Graph</h1>
            <p>Enter your report details below.</p>
          </div>

          <div className="form-group">
            <label htmlFor="apiKeyInput" className="form-label">
              Gemini API Key:
            </label>
            <input
              type="text"
              id="apiKeyInput"
              className="input"
              placeholder="Enter your Gemini API Key here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div
            className="file-upload-area"
            onClick={() => !isPdfLoading && fileInputRef.current?.click()}
            style={{ cursor: isPdfLoading ? "not-allowed" : "pointer" }}
          >
            <span className="file-icon">
              <i className="fas fa-file-pdf" />
            </span>
            <label>Click to Upload PDF</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isPdfLoading || !pdfJsLoaded}
              style={{ display: "none" }}
            />
            <span className="file-name-display">
              {isPdfLoading ? "Processing PDF..." : fileName}
            </span>
            {isPdfLoading && <div className="spinner" />}
          </div>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="form-group">
            <label htmlFor="reportInput" className="form-label">
              Paste your research report here:
            </label>
            <textarea
              id="reportInput"
              className="textarea"
              placeholder="E.g., 'The study investigated the effects of climate change on polar bear populations...'"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleGenerateGraph}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="spinner" />
            ) : (
              <span>Generate Graph</span>
            )}
          </button>
        </div>
      )}

      {/* Progress Bar Overlay */}
      {showProgressBar && (
        <div className="progress-overlay">
          <p>Generating Knowledge Graph...</p>
          <div className="progress-container">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="progress-text">{Math.floor(progressPercent)}%</span>
        </div>
      )}

      {/* Chatbot Container */}
      {showChatBot && (
        <div
          ref={chatContainerRef}
          className="chatbot-container"
          style={
            chatPosition
              ? {
                  left: chatPosition.x,
                  top: chatPosition.y,
                  right: "auto",
                  bottom: "auto",
                }
              : undefined
          }
        >
          <div
            className="chat-header"
            onMouseDown={handleChatMouseDown}
            style={{ cursor: isDraggingChat ? "grabbing" : "grab" }}
          >
            Chat with Graph AI <i className="fas fa-robot ml-2" />
          </div>
          <div ref={chatHistoryRef} className="chat-history">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                {msg.text}
              </div>
            ))}
          </div>
          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask about the graph..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isChatLoading) {
                  handleSendChat();
                }
              }}
            />
            <button
              className="send-chat-btn"
              onClick={handleSendChat}
              disabled={isChatLoading}
            >
              {isChatLoading ? (
                <div className="chat-loading-spinner" />
              ) : (
                <span>Send</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Node Info Popup */}
      {showNodePopup && (
        <div
          className="node-info-popup"
          style={{
            left: nodePopupPosition.x,
            top: nodePopupPosition.y,
          }}
        >
          <button
            className="close-btn"
            onClick={() => setShowNodePopup(false)}
          >
            <i className="fas fa-times" />
          </button>
          <h3>{nodePopupTitle}</h3>
          <div className="popup-content">
            {isNodePopupLoading ? (
              <div className="popup-loading-spinner" />
            ) : (
              <p>{nodePopupSummary}</p>
            )}
          </div>
        </div>
      )}

      {/* Message Box */}
      {showMessageBox && (
        <div className="alert-dialog">
          <p>{messageBoxText}</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowMessageBox(false)}
          >
            OK
          </button>
        </div>
      )}
    </>
  );
}
