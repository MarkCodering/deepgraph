import Script from "next/script";

export default function HomePage() {
  return (
    <>
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      <Script src="https://d3js.org/d3.v7.min.js" strategy="beforeInteractive" />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        strategy="beforeInteractive"
      />
      <Script src="/app.js" strategy="afterInteractive" type="module" />

      <main>
        <div id="welcomePortal">
          <h1>Welcome to DeepGraph</h1>
          <p>
            Transform complex research reports into interactive knowledge graphs and
            chat with AI to explore insights.
          </p>
          <button id="getStartedBtn" className="btn btn-primary btn-lg">
            Get Started
          </button>
        </div>

        <div id="graphContainer">
          <svg
            id="knowledgeGraphSvg"
            className="w-full h-full absolute top-0 left-0"
          ></svg>
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-semibold p-4" id="graphPlaceholder">
            Your interactive knowledge graph will be visualized here.
          </div>
        </div>

        <button id="openInputModalBtn" className="btn btn-primary btn-center hidden">
          <span id="openButtonText">Generate Knowledge Graph</span>
          <i className="fas fa-project-diagram"></i>
        </button>

        <div id="inputModal" className="card hidden">
          <div className="card-header">
            <h1 id="modalTitle">Generate Knowledge Graph</h1>
            <p id="modalSubtitle">Enter your report details below.</p>
          </div>

          <div id="reportInputSection">
            <div className="form-group">
              <label htmlFor="apiKeyInput" className="form-label">
                Gemini API Key:
              </label>
              <input
                type="text"
                id="apiKeyInput"
                className="input"
                placeholder="Enter your Gemini API Key here"
              />
            </div>

            <div className="file-upload-area" id="fileUploadArea">
              <span className="file-icon">
                <i className="fas fa-file-pdf"></i>
              </span>
              <label htmlFor="pdfUploadInput">Click to Upload PDF</label>
              <input type="file" id="pdfUploadInput" accept=".pdf" />
              <span id="fileNameDisplay">No file chosen</span>
              <div id="pdfLoadingSpinner" className="spinner hidden"></div>
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
                placeholder="E.g., 'The study investigated the effects of climate change on polar bear populations. Rising temperatures lead to melting ice caps, reducing hunting grounds for seals, their primary food source. This results in decreased polar bear health and reproductive rates.'"
              ></textarea>
            </div>

            <button id="submitInputBtn" className="btn btn-primary btn-lg">
              <span id="submitButtonText">Generate Graph</span>
              <div id="submitLoadingSpinner" className="spinner hidden"></div>
            </button>
          </div>
        </div>

        <div id="progressBarOverlay">
          <p>Generating Knowledge Graph...</p>
          <div id="progressBarContainer">
            <div id="progressBarFill"></div>
          </div>
          <span id="progressText">0%</span>
        </div>

        <div id="chatBotContainer">
          <div id="chatHeader">
            Chat with Graph AI <i className="fas fa-robot ml-2"></i>
          </div>
          <div id="chatHistory">
            <div className="chat-message ai">
              Hello! Ask me anything about the knowledge graph.
            </div>
          </div>
          <div id="chatInputContainer">
            <input type="text" id="chatInput" placeholder="Ask about the graph..." />
            <button id="sendChatBtn">
              <span id="sendButtonText">Send</span>
              <div id="chatLoadingSpinner" className="chat-loading-spinner hidden"></div>
            </button>
          </div>
        </div>

        <div id="nodeInfoPopup" className="hidden">
          <button className="close-btn" id="closeNodeInfoPopup">
            <i className="fas fa-times"></i>
          </button>
          <h3 id="popupNodeTitle"></h3>
          <div id="popupNodeSummary">
            <div className="popup-loading-spinner"></div>
          </div>
        </div>

        <div id="messageBox" className="alert-dialog">
          <p id="messageBoxText"></p>
          <button id="messageBoxOkBtn" className="btn btn-primary">
            OK
          </button>
        </div>
      </main>
    </>
  );
}
