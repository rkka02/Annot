import { spawn } from 'child_process';
import os from 'os';
import path from 'path';

import { buildExecutableCandidates, resolveExecutable } from '@/lib/command-runtime';
import { mergeHighlights, normalizeHighlightRects } from '@/lib/highlight-utils';
import { resolveFolderPath } from '@/lib/annot-sessions';
import { Highlight } from '@/types';

export interface PdfHighlightPayload {
  page: number;
  type: Highlight['type'];
  text: string;
  rects: Highlight['rects'];
  note?: string;
}

export interface PdfHighlightUpdatePayload {
  annotationId: string;
  text?: string;
  note?: string;
  type?: Highlight['type'];
}

export interface PdfHighlight extends Highlight {
  annotationId?: string;
}

interface PdfAnnotationResponse {
  highlights: PdfHighlight[];
  migrated?: number;
  added?: number;
  deleted?: number;
  updated?: number;
}

type PdfAnnotationAction = 'list' | 'upsert' | 'delete' | 'update';

interface ResolvedPythonCommand {
  command: string;
  argsPrefix: string[];
}

const PYTHON_PDF_ANNOTATION_SCRIPT = String.raw`
import json
import math
import os
import sys
import tempfile

import fitz

IMPORTANT_COLOR = (0.9882352941, 0.6980392157, 0.3490196078)
UNKNOWN_COLOR = (0.9960784314, 0.5372549020, 0.5137254902)
RECT_TOLERANCE = 0.003
ANNOT_PAYLOAD_VERSION = "annot-v1"


def approx(a, b, tol=RECT_TOLERANCE):
    return abs(float(a) - float(b)) <= tol


def normalize_rect(rect):
    return {
        "x": float(rect["x"]),
        "y": float(rect["y"]),
        "width": float(rect["width"]),
        "height": float(rect["height"]),
    }


def group_vertices(vertices):
    if not vertices:
        return []
    return [vertices[i:i + 4] for i in range(0, len(vertices), 4)]


def rect_from_points(points):
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return fitz.Rect(min(xs), min(ys), max(xs), max(ys))


def rect_to_normalized(rect, page_rect):
    return {
        "x": rect.x0 / page_rect.width,
        "y": rect.y0 / page_rect.height,
        "width": rect.width / page_rect.width,
        "height": rect.height / page_rect.height,
    }


def quad_from_normalized_rect(rect, page_rect):
    x0 = rect["x"] * page_rect.width
    y0 = rect["y"] * page_rect.height
    x1 = x0 + rect["width"] * page_rect.width
    y1 = y0 + rect["height"] * page_rect.height
    absolute_rect = fitz.Rect(x0, y0, x1, y1)
    return fitz.Quad(absolute_rect.tl, absolute_rect.tr, absolute_rect.bl, absolute_rect.br)


def infer_type(annot):
    info = annot.info or {}
    subject = (info.get("subject") or "").strip().lower()
    if subject in ("important", "unknown"):
        return subject

    return "important"


def decode_content(info):
    raw_content = (info.get("content") or "").strip()
    if not raw_content:
        return {
            "text": "",
            "note": "",
        }

    try:
        payload = json.loads(raw_content)
        if payload.get("annot") == ANNOT_PAYLOAD_VERSION:
            return {
                "text": str(payload.get("text") or ""),
                "note": str(payload.get("note") or ""),
            }
    except Exception:
        pass

    return {
        "text": raw_content,
        "note": "",
    }


def encode_content(text, note):
    return json.dumps({
        "annot": ANNOT_PAYLOAD_VERSION,
        "text": text or "",
        "note": note or "",
    }, ensure_ascii=False, separators=(",", ":"))


def extract_text(annot):
    info = annot.info or {}
    return decode_content(info)["text"]


def extract_note(annot):
    info = annot.info or {}
    return decode_content(info)["note"]


def export_annotation(page_number, annot, page_rect):
    rects = []
    vertices = getattr(annot, "vertices", None)
    if vertices:
      for points in group_vertices(vertices):
          rects.append(rect_to_normalized(rect_from_points(points), page_rect))

    if not rects:
        rects = [rect_to_normalized(annot.rect, page_rect)]

    return {
        "id": f"pdf:{annot.xref}",
        "annotationId": str(annot.xref),
        "pdfPath": "",
        "page": int(page_number),
        "type": infer_type(annot),
        "text": extract_text(annot),
        "note": extract_note(annot),
        "rects": rects,
        "position": rects[0],
    }


def collect_annotations(doc):
    highlights = []
    for page_index in range(doc.page_count):
        page = doc[page_index]
        annot = page.first_annot
        while annot:
            annot_type = annot.type[1] if annot.type else ""
            if annot_type == "Highlight":
                highlights.append(export_annotation(page_index + 1, annot, page.rect))
            annot = annot.next
    return highlights


def rects_match(a_rects, b_rects):
    if len(a_rects) != len(b_rects):
        return False

    for a_rect, b_rect in zip(a_rects, b_rects):
        if not (
            approx(a_rect["x"], b_rect["x"]) and
            approx(a_rect["y"], b_rect["y"]) and
            approx(a_rect["width"], b_rect["width"]) and
            approx(a_rect["height"], b_rect["height"])
        ):
            return False

    return True


def highlight_exists(existing, candidate):
    for item in existing:
        if int(item["page"]) != int(candidate["page"]):
            continue
        if item["type"] != candidate["type"]:
            continue
        if rects_match(item.get("rects", []), candidate.get("rects", [])):
            return True

    return False


def save_document(doc, pdf_path):
    try:
        doc.saveIncr()
        return doc
    except Exception:
        handle, temp_path = tempfile.mkstemp(suffix=".pdf")
        os.close(handle)
        doc.save(temp_path, garbage=3, deflate=True)
        doc.close()
        os.replace(temp_path, pdf_path)
        return fitz.open(pdf_path)


payload = json.load(sys.stdin)
action = payload["action"]
pdf_path = payload["pdfPath"]
doc = fitz.open(pdf_path)

try:
    if action == "list":
        result = {
            "highlights": collect_annotations(doc),
        }
    elif action == "upsert":
        existing = collect_annotations(doc)
        added = 0

        for item in payload.get("highlights", []):
            candidate = {
                "page": int(item["page"]),
                "type": item.get("type", "important"),
                "text": item.get("text", ""),
                "note": item.get("note", ""),
                "rects": [normalize_rect(rect) for rect in item.get("rects", []) if rect is not None],
            }

            if not candidate["rects"]:
                continue

            if highlight_exists(existing, candidate):
                continue

            page = doc[candidate["page"] - 1]
            quads = [quad_from_normalized_rect(rect, page.rect) for rect in candidate["rects"]]
            annotation = page.add_highlight_annot(quads)
            color = UNKNOWN_COLOR if candidate["type"] == "unknown" else IMPORTANT_COLOR
            annotation.set_colors(stroke=color)
            annotation.set_info(
                title="Annot",
                subject=candidate["type"],
                content=encode_content(candidate["text"], candidate["note"]),
            )
            annotation.update()
            added += 1

        if added > 0:
            doc = save_document(doc, pdf_path)

        result = {
            "highlights": collect_annotations(doc),
            "added": added,
            "migrated": added,
        }
    elif action == "delete":
        target_ids = {int(value) for value in payload.get("annotationIds", [])}
        deleted = 0

        if target_ids:
            for page_index in range(doc.page_count):
                page = doc[page_index]
                annot = page.first_annot
                while annot:
                    next_annot = annot.next
                    if annot.xref in target_ids:
                        page.delete_annot(annot)
                        deleted += 1
                    annot = next_annot

            if deleted > 0:
                doc = save_document(doc, pdf_path)

        result = {
            "highlights": collect_annotations(doc),
            "deleted": deleted,
        }
    elif action == "update":
        updated = 0
        updates = {}

        for item in payload.get("updates", []):
            annotation_id = item.get("annotationId")
            if annotation_id is None:
                continue

            try:
                updates[int(annotation_id)] = item
            except Exception:
                continue

        if updates:
            for page_index in range(doc.page_count):
                page = doc[page_index]
                annot = page.first_annot
                while annot:
                    target = updates.get(annot.xref)
                    if target is not None:
                        current_type = infer_type(annot)
                        current_payload = decode_content(annot.info or {})
                        next_type = target.get("type", current_type) or current_type
                        next_text = target.get("text", current_payload.get("text", "")) or ""
                        next_note = target.get("note", current_payload.get("note", "")) or ""

                        if (
                            next_type != current_type or
                            next_text != current_payload.get("text", "") or
                            next_note != current_payload.get("note", "")
                        ):
                            color = UNKNOWN_COLOR if next_type == "unknown" else IMPORTANT_COLOR
                            annot.set_colors(stroke=color)
                            annot.set_info(
                                title="Annot",
                                subject=next_type,
                                content=encode_content(next_text, next_note),
                            )
                            annot.update()
                            updated += 1

                    annot = annot.next

            if updated > 0:
                doc = save_document(doc, pdf_path)

        result = {
            "highlights": collect_annotations(doc),
            "updated": updated,
        }
    else:
        raise ValueError(f"Unsupported action: {action}")

    json.dump(result, sys.stdout)
finally:
    doc.close()
`;

let resolvedPythonCommandPromise: Promise<ResolvedPythonCommand> | null = null;

function getPythonCandidates(): string[] {
  const home = os.homedir();
  return buildExecutableCandidates(
    [
      process.env.ANNOT_PYTHON_BIN,
      process.env.PYTHON_BIN,
      process.env.PYTHON,
    ],
    'python',
    [
      path.join(home, 'AppData', 'Local', 'Programs', 'Python', 'Python313', 'python'),
      path.join(home, 'AppData', 'Local', 'Programs', 'Python', 'Python312', 'python'),
      path.join(home, 'AppData', 'Local', 'Programs', 'Python', 'Python311', 'python'),
      path.join(home, 'miniconda3', 'python'),
      path.join(home, 'anaconda3', 'python'),
      path.join('/usr/local/bin', 'python3'),
      path.join('/opt/homebrew/bin', 'python3'),
      path.join('/usr/bin', 'python3'),
      path.join(process.env.SystemRoot || 'C:\\Windows', 'py'),
    ],
  );
}

async function resolvePythonCommand(): Promise<ResolvedPythonCommand> {
  const candidates = [
    ...buildExecutableCandidates(
      [
        process.env.ANNOT_PYTHON_BIN,
        process.env.PYTHON_BIN,
      ],
      'python3',
      [],
    ),
    ...getPythonCandidates(),
    ...buildExecutableCandidates(
      [
        process.env.ANNOT_PYTHON_LAUNCHER,
      ],
      'py',
      [
        path.join(process.env.SystemRoot || 'C:\\Windows', 'py'),
      ],
    ),
  ];

  const executable = await resolveExecutable([...new Set(candidates)]);
  if (!executable) {
    throw new Error(
      'Could not find a Python 3 executable. Set ANNOT_PYTHON_BIN to the full path to python if needed.',
    );
  }

  if (/([\\/]|^)py(\.exe)?$/i.test(executable)) {
    return {
      command: executable,
      argsPrefix: ['-3'],
    };
  }

  return {
    command: executable,
    argsPrefix: [],
  };
}

function runPdfAnnotationScript(payload: Record<string, unknown>): Promise<PdfAnnotationResponse> {
  if (!resolvedPythonCommandPromise) {
    resolvedPythonCommandPromise = resolvePythonCommand();
  }

  return new Promise((resolve, reject) => {
    const pythonCommandPromise = resolvedPythonCommandPromise;
    if (!pythonCommandPromise) {
      reject(new Error('Python command resolution was not initialized'));
      return;
    }

    void pythonCommandPromise.then((python) => {
      const child = spawn(python.command, [...python.argsPrefix, '-c', PYTHON_PDF_ANNOTATION_SCRIPT], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr.trim() || `PDF annotation worker failed with exit code ${code}`));
          return;
        }

        try {
          const parsed = JSON.parse(stdout) as PdfAnnotationResponse;
          resolve(parsed);
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Failed to parse PDF annotation response'));
        }
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    }).catch(reject);
  });
}

function normalizeReturnedHighlights(pdfPath: string, highlights: PdfHighlight[]): PdfHighlight[] {
  return mergeHighlights(highlights.map((highlight) => {
    const rects = normalizeHighlightRects(highlight.rects?.length ? highlight.rects : [highlight.position]);

    return {
      ...highlight,
      pdfPath,
      note: typeof highlight.note === 'string' ? highlight.note : '',
      rects,
      position: rects[0] ?? highlight.position,
    };
  }));
}

async function runPdfAnnotationAction(
  action: PdfAnnotationAction,
  pdfPath: string,
  payload: Record<string, unknown> = {},
): Promise<PdfAnnotationResponse> {
  const absolutePdfPath = resolveFolderPath(pdfPath);
  const response = await runPdfAnnotationScript({
    action,
    pdfPath: absolutePdfPath,
    ...payload,
  });

  return {
    ...response,
    highlights: normalizeReturnedHighlights(pdfPath, response.highlights ?? []),
  };
}

export async function listPdfAnnotations(pdfPath: string): Promise<PdfAnnotationResponse> {
  return runPdfAnnotationAction('list', pdfPath);
}

export async function savePdfAnnotations(
  pdfPath: string,
  highlights: PdfHighlightPayload[],
): Promise<PdfAnnotationResponse> {
  return runPdfAnnotationAction('upsert', pdfPath, { highlights });
}

export async function updatePdfAnnotations(
  pdfPath: string,
  updates: PdfHighlightUpdatePayload[],
): Promise<PdfAnnotationResponse> {
  return runPdfAnnotationAction('update', pdfPath, { updates });
}

export async function deletePdfAnnotations(
  pdfPath: string,
  annotationIds: string[],
): Promise<PdfAnnotationResponse> {
  return runPdfAnnotationAction('delete', pdfPath, { annotationIds });
}

function escapeMarkdownBlock(value: string): string {
  return value
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/^>/, '\\>'))
    .join('\n');
}

function compareHighlights(a: PdfHighlight, b: PdfHighlight): number {
  if (a.page !== b.page) {
    return a.page - b.page;
  }

  const aRect = a.rects?.[0] ?? a.position;
  const bRect = b.rects?.[0] ?? b.position;
  if (Math.abs(aRect.y - bRect.y) > 0.0005) {
    return aRect.y - bRect.y;
  }

  return aRect.x - bRect.x;
}

function formatSection(
  title: string,
  highlights: PdfHighlight[],
): string[] {
  if (highlights.length === 0) {
    return [`## ${title}`, '', 'None.', ''];
  }

  const lines = [`## ${title}`, ''];

  highlights.forEach((highlight, index) => {
    lines.push(`### ${index + 1}. Page ${highlight.page}`);
    lines.push('');
    lines.push(`> ${escapeMarkdownBlock(highlight.text)}`);

    if (highlight.note?.trim()) {
      lines.push('');
      lines.push(`Memo: ${highlight.note.trim()}`);
    }

    lines.push('');
  });

  return lines;
}

export function buildPdfHighlightsMarkdown(pdfPath: string, highlights: PdfHighlight[]): string {
  const normalizedHighlights = mergeHighlights(highlights).sort(compareHighlights);
  const yellowHighlights = normalizedHighlights.filter((highlight) => highlight.type === 'important');
  const redHighlights = normalizedHighlights.filter((highlight) => highlight.type === 'unknown');
  const title = path.basename(pdfPath).replace(/\.pdf$/i, '');

  return [
    `# ${title} Highlights`,
    '',
    `Source PDF: \`${pdfPath}\``,
    `Generated: ${new Date().toISOString()}`,
    '',
    ...formatSection('Yellow Highlights', yellowHighlights),
    ...formatSection('Red Highlights', redHighlights),
  ].join('\n').trimEnd() + '\n';
}

export function getPdfHighlightsMarkdownFileName(pdfPath: string): string {
  return `${path.basename(pdfPath).replace(/\.pdf$/i, '')}.highlights.md`;
}
