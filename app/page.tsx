import Script from "next/script";

export default function HomePage() {
  return (
    <>
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      <Script src="https://d3js.org/d3.v7.min.js" strategy="beforeInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" strategy="beforeInteractive" />
      <Script src="/app.js" strategy="afterInteractive" type="module" />

      {/* Welcome screen */}
      <div id="welcomePortal" className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="text-5xl font-bold tracking-tight mb-4">DeepGraph</h1>
        <p className="text-zinc-400 text-lg mb-8 text-center max-w-md">
          Transform research into interactive knowledge graphs.
        </p>
        <button id="getStartedBtn" className="bg-white text-zinc-900 font-medium px-6 py-3 rounded-lg hover:bg-zinc-200 transition">
          Get Started
        </button>
      </div>

      {/* Main app (hidden by default, shown after Get Started) */}
      <div id="appContainer" className="hidden min-h-screen">
        {/* Header */}
        <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-semibold">DeepGraph</span>
          <button id="openInputModalBtn" className="bg-white text-zinc-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-200 transition">
            New Graph
          </button>
        </header>

        {/* Graph */}
        <div id="graphContainer" className="relative w-full h-[calc(100vh-65px)] bg-zinc-900">
          <svg id="knowledgeGraphSvg" className="w-full h-full"></svg>
          <p id="graphPlaceholder" className="absolute inset-0 flex items-center justify-center text-zinc-500 text-lg">
            Your knowledge graph will appear here.
          </p>
        </div>

        {/* Modal */}
        <div id="inputModal" className="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-5">
            <h2 className="text-xl font-semibold">Generate Graph</h2>

            <input id="apiKeyInput" type="text" placeholder="Gemini API Key" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20" />

            <div className="flex items-center gap-3">
              <label htmlFor="pdfUploadInput" className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm cursor-pointer hover:bg-zinc-700 transition">Upload PDF</label>
              <span id="fileNameDisplay" className="text-sm text-zinc-500 truncate">No file</span>
              <input type="file" id="pdfUploadInput" accept=".pdf" className="hidden" />
            </div>

            <textarea id="reportInput" rows={5} placeholder="Or paste your report text..." className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-white/20"></textarea>

            <div className="flex justify-end gap-3">
              <button id="closeModalBtn" className="text-sm text-zinc-400 hover:text-white transition">Cancel</button>
              <button id="submitInputBtn" className="bg-white text-zinc-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-200 transition">Generate</button>
            </div>
          </div>
        </div>

        {/* Progress overlay */}
        <div id="progressBarOverlay" className="hidden fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/90">
          <p className="text-lg font-medium mb-4">Generating...</p>
          <div id="progressBarContainer" className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div id="progressBarFill" className="h-full bg-white transition-all"></div>
          </div>
          <span id="progressText" className="text-sm text-zinc-500 mt-2">0%</span>
        </div>

        {/* Chat */}
        <div id="chatBotContainer" className="hidden fixed bottom-6 right-6 w-80 h-96 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col z-40 shadow-2xl">
          <div id="chatHeader" className="px-4 py-3 border-b border-zinc-800 font-medium text-sm flex items-center justify-between">
            <span>Chat</span>
            <button id="closeChatBtn" className="text-zinc-500 hover:text-white">✕</button>
          </div>
          <div id="chatHistory" className="flex-1 p-4 overflow-y-auto space-y-3 text-sm">
            <div className="chat-message ai bg-zinc-800 rounded-lg px-3 py-2">Ask me anything about your graph.</div>
          </div>
          <div id="chatInputContainer" className="p-3 border-t border-zinc-800 flex gap-2">
            <input id="chatInput" type="text" placeholder="Type a message..." className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <button id="sendChatBtn" className="bg-white text-zinc-900 px-3 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 transition">Send</button>
          </div>
        </div>

        {/* Chat toggle button */}
        <button id="toggleChatBtn" className="fixed bottom-6 right-6 w-12 h-12 bg-white text-zinc-900 rounded-full flex items-center justify-center shadow-lg hover:bg-zinc-200 transition z-30">
          💬
        </button>

        {/* Node popup */}
        <div id="nodeInfoPopup" className="hidden absolute z-50 bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-72 shadow-xl">
          <button id="closeNodeInfoPopup" className="absolute top-2 right-2 text-zinc-500 hover:text-white">✕</button>
          <h3 id="popupNodeTitle" className="font-semibold mb-2"></h3>
          <div id="popupNodeSummary" className="text-sm text-zinc-400"></div>
        </div>

        {/* Alert dialog */}
        <div id="messageBox" className="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm text-center">
            <p id="messageBoxText" className="mb-4"></p>
            <button id="messageBoxOkBtn" className="bg-white text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 transition">OK</button>
          </div>
        </div>
      </div>
    </>
  );
}
