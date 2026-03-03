import { NextResponse } from "next/server";

type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
};

function extractVideoId(rawInput: string): string | null {
  try {
    const input = rawInput.trim();

    if (!input) {
      return null;
    }

    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
      return input;
    }

    const parsed = new URL(input);

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const watchId = parsed.searchParams.get("v");
      if (watchId && /^[a-zA-Z0-9_-]{11}$/.test(watchId)) {
        return watchId;
      }

      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const shortsIndex = pathParts.indexOf("shorts");
      if (shortsIndex !== -1 && pathParts[shortsIndex + 1]) {
        const shortsId = pathParts[shortsIndex + 1];
        return /^[a-zA-Z0-9_-]{11}$/.test(shortsId) ? shortsId : null;
      }

      const embedIndex = pathParts.indexOf("embed");
      if (embedIndex !== -1 && pathParts[embedIndex + 1]) {
        const embedId = pathParts[embedIndex + 1];
        return /^[a-zA-Z0-9_-]{11}$/.test(embedId) ? embedId : null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function extractJsonObjectAfterMarker(source: string, marker: string): string | null {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const jsonStart = source.indexOf("{", markerIndex);
  if (jsonStart === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = jsonStart; i < source.length; i += 1) {
    const char = source[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      isEscaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(jsonStart, i + 1);
      }
    }
  }

  return null;
}

function extractPlayerResponse(html: string): Record<string, unknown> | null {
  const markers = [
    "ytInitialPlayerResponse = ",
    "var ytInitialPlayerResponse = ",
    "window['ytInitialPlayerResponse'] = ",
  ];

  for (const marker of markers) {
    const jsonText = extractJsonObjectAfterMarker(html, marker);
    if (!jsonText) {
      continue;
    }

    try {
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      return parsed;
    } catch {
      continue;
    }
  }

  return null;
}

function decodeHtmlEntities(text: string): string {
  const named: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&nbsp;": " ",
  };

  const withNamed = text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (match) => named[match] ?? match);

  return withNamed
    .replace(/&#(\d+);/g, (_full, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_full, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function parseXmlTranscript(xmlText: string): string {
  const regex = /<text\b[^>]*>([\s\S]*?)<\/text>/g;
  const parts: string[] = [];
  let match: RegExpExecArray | null = regex.exec(xmlText);

  while (match) {
    const cleaned = decodeHtmlEntities(match[1] || "")
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned) {
      parts.push(cleaned);
    }

    match = regex.exec(xmlText);
  }

  const transcript = parts.join(" ").trim();

  return transcript;
}

function parseJson3Transcript(jsonText: string): string {
  try {
    const parsed = JSON.parse(jsonText) as {
      events?: Array<{
        segs?: Array<{ utf8?: string }>;
      }>;
    };

    const transcript = (parsed.events || [])
      .flatMap((event) => event.segs || [])
      .map((segment) => segment.utf8 || "")
      .join("")
      .replace(/\s+/g, " ")
      .trim();

    return transcript;
  } catch {
    return "";
  }
}

function selectCaptionTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  if (tracks.length === 0) {
    return null;
  }

  const preferredEnglish =
    tracks.find((track) => track.languageCode === "en" && track.kind !== "asr") ||
    tracks.find((track) => track.languageCode?.startsWith("en")) ||
    tracks.find((track) => track.kind !== "asr") ||
    tracks[0];

  return preferredEnglish;
}

async function fetchTranscriptFromTrack(track: CaptionTrack): Promise<string> {
  const transcriptUrl = track.baseUrl.includes("fmt=") ? track.baseUrl : `${track.baseUrl}&fmt=json3`;

  const response = await fetch(transcriptUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept-Language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch transcript stream from YouTube.");
  }

  const bodyText = await response.text();

  if (!bodyText) {
    throw new Error("Transcript body was empty.");
  }

  const json3Transcript = parseJson3Transcript(bodyText);
  if (json3Transcript) {
    return json3Transcript;
  }

  const xmlTranscript = parseXmlTranscript(bodyText);
  if (xmlTranscript) {
    return xmlTranscript;
  }

  throw new Error("Could not parse transcript payload.");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url") || "";

  const videoId = extractVideoId(rawUrl);
  if (!videoId) {
    return NextResponse.json({ error: "Invalid YouTube URL." }, { status: 400 });
  }

  try {
    const watchResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });

    if (!watchResponse.ok) {
      return NextResponse.json({ error: "Unable to fetch YouTube video page." }, { status: 502 });
    }

    const watchHtml = await watchResponse.text();
    const playerResponse = extractPlayerResponse(watchHtml);

    if (!playerResponse) {
      return NextResponse.json({ error: "Unable to parse YouTube player metadata." }, { status: 502 });
    }

    const captions =
      ((playerResponse.captions as { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } } | undefined)
        ?.playerCaptionsTracklistRenderer?.captionTracks as CaptionTrack[] | undefined) || [];

    const selectedTrack = selectCaptionTrack(captions);
    if (!selectedTrack) {
      return NextResponse.json({ error: "No captions found for this video." }, { status: 422 });
    }

    const transcript = await fetchTranscriptFromTrack(selectedTrack);
    if (!transcript) {
      return NextResponse.json({ error: "Transcript exists but contains no text." }, { status: 422 });
    }

    const title =
      (playerResponse.videoDetails as { title?: string } | undefined)?.title ||
      "YouTube Video";

    return NextResponse.json({
      videoId,
      title,
      language: selectedTrack.languageCode || "unknown",
      transcript,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to import YouTube transcript.",
      },
      { status: 500 },
    );
  }
}
