export function formatConversationDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

export function parseDateFromSearchParams(searchParams: URLSearchParams): Date {
  const dateParam = searchParams.get("date");
  if (!dateParam) return new Date();
  const parsed = new Date(dateParam);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function getTrailingWords(
  segments: { text: string }[],
  interimTranscript: string,
  count: number,
): string {
  const full = [...segments.map((s) => s.text), interimTranscript].filter(Boolean).join(" ");
  const words = full.trim().split(/\s+/).filter(Boolean);
  return words.slice(-count).join(" ");
}

export function captureSegmentsWithInterim(
  segments: { text: string }[],
  interimTranscript: string,
): string[] {
  const items = segments.map((s) => s.text).filter(Boolean);
  if (interimTranscript.trim()) items.push(interimTranscript.trim());
  return items;
}
