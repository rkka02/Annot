import { spawn } from 'child_process';

import { resolveFolderPath } from '@/lib/annot-sessions';
import { Highlight } from '@/types';

export interface PdfHighlightPayload {
  page: number;
  type: Highlight['type'];
  text: string;
  rects: Highlight['rects'];
}

export interface PdfHighlight extends Highlight {
  annotationId?: string;
}

interface PdfAnnotationResponse {
  highlights: PdfHighlight[];
  migrated?: number;
  added?: number;
  deleted?: number;
}

type PdfAnnotationAction = 'list' | 'upsert' | 'delete';

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


def extract_text(annot):
    info = annot.info or {}
    return (info.get("content") or "").strip()


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
            annotation.set_info(title="Annot", subject=candidate["type"], content=candidate["text"])
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
    else:
        raise ValueError(f"Unsupported action: {action}")

    json.dump(result, sys.stdout)
finally:
    doc.close()
`;

function runPdfAnnotationScript(payload: Record<string, unknown>): Promise<PdfAnnotationResponse> {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', ['-c', PYTHON_PDF_ANNOTATION_SCRIPT], {
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
  });
}

function normalizeReturnedHighlights(pdfPath: string, highlights: PdfHighlight[]): PdfHighlight[] {
  return highlights.map((highlight) => ({
    ...highlight,
    pdfPath,
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

export async function deletePdfAnnotations(
  pdfPath: string,
  annotationIds: string[],
): Promise<PdfAnnotationResponse> {
  return runPdfAnnotationAction('delete', pdfPath, { annotationIds });
}
