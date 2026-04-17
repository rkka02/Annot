import { ProviderRuntime } from '@/lib/ai-providers/types';
import { AIProvider, ChatMessage, Session, SessionTurnSummary } from '@/types';

interface GenerateSessionTurnSummariesInput {
  runtime: ProviderRuntime;
  provider: AIProvider;
  model: string;
  session: Session;
}

interface SessionTurnPair {
  turnNumber: number;
  questionMessageId: string;
  assistantMessageId: string;
  question: string;
  answer: string;
}

interface ModelSummaryItem {
  turnNumber: number;
  answerSummary: string;
}

function stripCodeFences(value: string): string {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return trimmed;
}

function collectTurnPairs(messages: ChatMessage[]): SessionTurnPair[] {
  const pairs: SessionTurnPair[] = [];

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message?.role !== 'user') {
      continue;
    }

    const assistantMessage = messages.slice(index + 1).find((candidate) => candidate.role === 'assistant');
    if (!assistantMessage) {
      continue;
    }

    pairs.push({
      turnNumber: pairs.length + 1,
      questionMessageId: message.id,
      assistantMessageId: assistantMessage.id,
      question: message.content.trim(),
      answer: assistantMessage.content.trim(),
    });

    index = messages.indexOf(assistantMessage);
  }

  return pairs;
}

function fallbackAnswerSummary(answer: string): string {
  const normalized = answer
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (normalized.length <= 260) {
    return normalized;
  }

  const firstParagraph = normalized.split(/\n\s*\n/)[0]?.trim() || normalized;
  if (firstParagraph.length <= 260) {
    return firstParagraph;
  }

  return `${firstParagraph.slice(0, 257).trimEnd()}...`;
}

function parseModelSummaryItems(value: string): ModelSummaryItem[] | null {
  const raw = stripCodeFences(value);

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    const items = parsed
      .filter((item): item is { turnNumber?: unknown; answerSummary?: unknown } => (
        typeof item === 'object' &&
        item !== null
      ))
      .map((item) => ({
        turnNumber: typeof item.turnNumber === 'number' ? item.turnNumber : Number(item.turnNumber),
        answerSummary: typeof item.answerSummary === 'string' ? item.answerSummary.trim() : '',
      }))
      .filter((item) => Number.isInteger(item.turnNumber) && item.turnNumber > 0 && item.answerSummary.length > 0);

    return items;
  } catch {
    return null;
  }
}

export async function generateSessionTurnSummaries({
  runtime,
  provider,
  model,
  session,
}: GenerateSessionTurnSummariesInput): Promise<SessionTurnSummary[]> {
  const pairs = collectTurnPairs(session.messages);
  if (pairs.length === 0) {
    return [];
  }

  const transcript = pairs.map((pair) => (
    [
      `Turn ${pair.turnNumber}`,
      `Question: ${pair.question}`,
      `Answer: ${pair.answer}`,
    ].join('\n')
  )).join('\n\n');

  const prompt = [
    'Summarize this full chat history turn by turn.',
    'Return JSON only.',
    'Schema: [{"turnNumber":1,"answerSummary":"<1-3 sentence factual summary of the assistant answer>"}]',
    'Rules:',
    '- Include one item for every turn in the transcript.',
    '- Preserve turn numbers exactly.',
    '- Summaries should focus on what the assistant actually answered.',
    '- Do not include markdown fences or extra keys.',
    '',
    'Transcript:',
    transcript,
  ].join('\n');

  let modelItems: ModelSummaryItem[] | null = null;

  try {
    const result = await runtime.runTurn({
      model,
      folderPath: session.folderPath,
      prompt,
      sessionKind: session.sessionKind,
      currentPdfPath: session.pdfPath ?? null,
    });
    modelItems = parseModelSummaryItems(result.content);
  } catch {
    // Fall back to deterministic summaries below.
  }

  const modelSummaryMap = new Map<number, string>(
    (modelItems ?? []).map((item) => [item.turnNumber, item.answerSummary]),
  );

  return pairs.map((pair) => ({
    id: crypto.randomUUID(),
    questionMessageId: pair.questionMessageId,
    assistantMessageId: pair.assistantMessageId,
    question: pair.question,
    answerSummary: modelSummaryMap.get(pair.turnNumber) || fallbackAnswerSummary(pair.answer),
    createdAt: new Date().toISOString(),
    model: `${provider}:${model}`,
  }));
}
