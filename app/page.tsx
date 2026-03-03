import Script from "next/script";

export default function HomePage() {
  return (
    <>
      <Script src="https://d3js.org/d3.v7.min.js" strategy="beforeInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" strategy="beforeInteractive" />
      <Script src="/app.js" strategy="afterInteractive" type="module" />

      <div id="welcomePortal" className="relative min-h-screen overflow-hidden px-6 py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(16,185,129,0.15),transparent_35%),radial-gradient(circle_at_50%_85%,rgba(250,204,21,0.12),transparent_38%)]" />
        <div className="relative mx-auto flex min-h-[calc(100vh-96px)] max-w-4xl items-center justify-center">
          <section className="w-full rounded-3xl border border-white/10 bg-zinc-950/65 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl md:p-12">
            <span className="inline-flex rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-cyan-200">
              Research Intelligence
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-zinc-100 md:text-6xl">
              DeepGraph turns unstructured content into navigable knowledge maps.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-zinc-300 md:text-lg">
              Upload a PDF, drop a Markdown file, or import a YouTube transcript. Then explore concepts, relationships, and ask questions against the generated graph.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                id="getStartedBtn"
                className="rounded-xl bg-cyan-300 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
              >
                Launch Workspace
              </button>
              <p className="text-sm text-zinc-400">Supports OpenAI, Anthropic, and Gemini APIs</p>
            </div>
          </section>
        </div>
      </div>

      <div id="appContainer" className="hidden min-h-screen">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80 px-4 py-4 backdrop-blur-xl md:px-6">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">DeepGraph</p>
              <p className="text-lg font-semibold text-zinc-100">Knowledge Workspace</p>
            </div>
            <button
              id="openInputModalBtn"
              className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20"
            >
              New Graph
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 md:p-6">
          <div
            id="graphContainer"
            className="relative h-[calc(100vh-112px)] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-2xl shadow-black/30"
          >
            <svg id="knowledgeGraphSvg" className="h-full w-full" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.12),transparent_36%)]" />
            <p
              id="graphPlaceholder"
              className="absolute inset-0 flex items-center justify-center px-6 text-center text-lg text-zinc-400"
            >
              Generate a graph to start exploring entities and relationships.
            </p>

            <section
              id="graphDynamicsPanel"
              className="absolute left-4 top-4 z-10 w-[min(92vw,300px)] rounded-xl border border-white/10 bg-zinc-950/85 p-4 shadow-xl backdrop-blur-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Graph Dynamics</p>
                  <p className="text-sm font-medium text-zinc-100">Tune force layout live</p>
                </div>
                <button
                  id="resetDynamicsBtn"
                  className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-300 transition hover:border-white/20 hover:text-zinc-100"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-xs text-zinc-300">
                  Link Distance
                  <span id="linkDistanceValue" className="ml-2 text-zinc-500">
                    180
                  </span>
                  <input id="linkDistanceInput" type="range" min={80} max={320} step={5} defaultValue={180} className="mt-1 w-full" />
                </label>

                <label className="block text-xs text-zinc-300">
                  Charge Strength
                  <span id="chargeStrengthValue" className="ml-2 text-zinc-500">
                    -430
                  </span>
                  <input id="chargeStrengthInput" type="range" min={-1200} max={-80} step={10} defaultValue={-430} className="mt-1 w-full" />
                </label>

                <label className="block text-xs text-zinc-300">
                  Collision Radius
                  <span id="collisionRadiusValue" className="ml-2 text-zinc-500">
                    34
                  </span>
                  <input id="collisionRadiusInput" type="range" min={10} max={90} step={1} defaultValue={34} className="mt-1 w-full" />
                </label>

                <label className="block text-xs text-zinc-300">
                  Node Size
                  <span id="nodeRadiusValue" className="ml-2 text-zinc-500">
                    19
                  </span>
                  <input id="nodeRadiusInput" type="range" min={8} max={34} step={1} defaultValue={19} className="mt-1 w-full" />
                </label>
              </div>
            </section>
          </div>
        </main>

        <div id="inputModal" className="hidden fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl shadow-black/40 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-6">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-100">Generate Knowledge Graph</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Configure your provider, ingest source content, then generate a structured graph.
                </p>
              </div>
              <button id="closeModalBtn" className="text-sm text-zinc-400 transition hover:text-zinc-100">
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="providerSelect" className="text-sm font-medium text-zinc-300">
                  Provider
                </label>
                <select
                  id="providerSelect"
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                  defaultValue="openai"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="modelInput" className="text-sm font-medium text-zinc-300">
                  Model
                </label>
                <input
                  id="modelInput"
                  type="text"
                  defaultValue="gpt-4o-mini"
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label htmlFor="apiKeyInput" className="text-sm font-medium text-zinc-300">
                API Key
              </label>
              <input
                id="apiKeyInput"
                type="password"
                placeholder="OpenAI API Key (sk-...)"
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
              />
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">Source Inputs</p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-zinc-900 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="pdfUploadInput"
                      className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/10"
                    >
                      Upload PDF
                    </label>
                    <span id="fileNameDisplay" className="max-w-[62%] truncate text-xs text-zinc-500">
                      No PDFs selected
                    </span>
                    <input type="file" id="pdfUploadInput" accept=".pdf" multiple className="hidden" />
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-zinc-900 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="markdownUploadInput"
                      className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/10"
                    >
                      Upload Markdown
                    </label>
                    <span id="markdownFileNameDisplay" className="max-w-[62%] truncate text-xs text-zinc-500">
                      No Markdown files selected
                    </span>
                    <input type="file" id="markdownUploadInput" accept=".md,.markdown,text/markdown,text/plain" multiple className="hidden" />
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                <textarea
                  id="youtubeUrlInput"
                  placeholder="One or more YouTube URLs (comma/newline separated)"
                  rows={2}
                  className="w-full resize-y rounded-lg border border-white/10 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                />
                <button
                  id="loadYoutubeBtn"
                  className="self-end rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-300/20"
                >
                  Import YouTube
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <label htmlFor="reportInput" className="text-sm font-medium text-zinc-300">
                Source Text
              </label>
              <textarea
                id="reportInput"
                rows={8}
                placeholder="Paste text here, or use one of the upload/import options above..."
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button id="cancelModalBtn" className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition hover:text-zinc-100">
                Cancel
              </button>
              <button
                id="submitInputBtn"
                className="rounded-lg bg-cyan-300 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
              >
                Generate Graph
              </button>
            </div>
          </div>
        </div>

        <div id="progressBarOverlay" className="hidden fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm">
          <p className="mb-4 text-lg font-medium text-zinc-100">Generating graph...</p>
          <div id="progressBarContainer" className="h-1.5 w-72 overflow-hidden rounded-full bg-zinc-800">
            <div id="progressBarFill" className="h-full bg-cyan-300 transition-all" />
          </div>
          <span id="progressText" className="mt-2 text-sm text-zinc-400">
            0%
          </span>
        </div>

        <div
          id="chatBotContainer"
          className="hidden fixed bottom-5 right-5 z-40 flex h-[470px] w-[min(92vw,390px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/45"
        >
          <div id="chatHeader" className="border-b border-white/10 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-zinc-100">Graph Chat</p>
                <p className="text-xs text-zinc-500">
                  Provider:
                  <span id="chatProviderBadge" className="ml-1 text-cyan-200">
                    OpenAI
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="clearChatBtn"
                  className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-300 transition hover:border-white/20 hover:text-zinc-100"
                >
                  New Chat
                </button>
                <button id="closeChatBtn" className="text-zinc-500 transition hover:text-zinc-100">
                  ✕
                </button>
              </div>
            </div>
          </div>
          <div id="chatHistory" className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            <div className="chat-message ai rounded-lg px-3 py-2">
              Ask questions about entities, links, or inferred implications in your graph.
            </div>
          </div>
          <div id="chatInputContainer" className="border-t border-white/10 p-3">
            <div id="chatTypingIndicator" className="mb-2 hidden text-xs text-zinc-500">
              Thinking...
            </div>
            <div className="flex gap-2">
              <textarea
                id="chatInput"
                placeholder="Ask about the graph..."
                rows={2}
                className="max-h-28 min-h-[44px] flex-1 resize-y rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
              />
              <button id="sendChatBtn" className="self-end rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200">
                Send
              </button>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">Enter to send, Shift+Enter for a new line.</p>
          </div>
        </div>

        <button
          id="toggleChatBtn"
          className="hidden fixed bottom-5 right-5 z-30 rounded-full border border-cyan-300/40 bg-cyan-300/15 px-4 py-3 text-sm font-medium text-cyan-100 shadow-lg shadow-black/25 transition hover:bg-cyan-300/25"
        >
          Open Chat
        </button>

        <div
          id="nodeInfoPopup"
          className="hidden absolute z-50 w-80 rounded-xl border border-white/10 bg-zinc-950/95 p-4 shadow-2xl shadow-black/35"
        >
          <button id="closeNodeInfoPopup" className="absolute right-2 top-2 text-zinc-500 transition hover:text-zinc-100">
            ✕
          </button>
          <h3 id="popupNodeTitle" className="mb-2 pr-6 text-base font-semibold text-zinc-100" />
          <div id="popupNodeSummary" className="text-sm leading-relaxed text-zinc-300" />
        </div>

        <div id="messageBox" className="hidden fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-zinc-950 p-6 text-center shadow-2xl shadow-black/35">
            <p id="messageBoxText" className="mb-4 text-sm text-zinc-200" />
            <button
              id="messageBoxOkBtn"
              className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
