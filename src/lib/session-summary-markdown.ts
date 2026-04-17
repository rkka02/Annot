import path from 'path';

import { Session } from '@/types';

function escapeMarkdownBlock(value: string): string {
  return value
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/^>/, '\\>'))
    .join('\n');
}

export function buildSessionSummaryMarkdown(session: Session): string {
  const title = session.title || 'Session';
  const sourceLabel = session.pdfPath
    ? `Source PDF: \`${session.pdfPath}\``
    : `Source Folder: \`${session.folderPath || '.'}\``;
  const summaries = session.turnSummaries ?? [];

  const lines = [
    `# ${title} Summaries`,
    '',
    sourceLabel,
    `Generated: ${new Date().toISOString()}`,
    '',
  ];

  if (summaries.length === 0) {
    lines.push('No saved summaries yet.', '');
    return lines.join('\n');
  }

  summaries.forEach((summary, index) => {
    lines.push(`## Turn ${index + 1}`);
    lines.push('');
    lines.push('### User Question');
    lines.push('');
    lines.push(`> ${escapeMarkdownBlock(summary.question)}`);
    lines.push('');
    lines.push('### Assistant Summary');
    lines.push('');
    lines.push(summary.answerSummary);
    lines.push('');
  });

  return lines.join('\n').trimEnd() + '\n';
}

export function getSessionSummaryMarkdownFileName(session: Session): string {
  const baseName = session.pdfPath
    ? path.basename(session.pdfPath).replace(/\.pdf$/i, '')
    : (session.title || 'session');

  return `${baseName}.summary.md`;
}
