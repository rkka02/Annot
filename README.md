# Annot

Annot is a local-first PDF reading workspace with a built-in AI chat panel.

It now supports both macOS and Windows development/runtime workflows.

It is designed for a simple loop:

1. organize papers in folders
2. open a PDF and read it in place
3. highlight and annotate while you read
4. ask questions in a chat session tied to that folder or PDF

Annot uses your existing local Codex or Claude Code login on the same machine. No `OPENAI_API_KEY` setup is required.

## Screenshots

### PDF reading + chat

![Annot workspace](https://raw.githubusercontent.com/rkka02/Annot/b2c5cfe1f4c6bad7aa82cfc1194269f33d95ed93/screenshots/1.png)

### Highlight markdown export preview

![Highlight markdown preview](https://raw.githubusercontent.com/rkka02/Annot/codex/highlight-summary-export/screenshots/highlight-markdown.png)

### LLM summary markdown export preview

![LLM summary markdown preview](https://raw.githubusercontent.com/rkka02/Annot/codex/highlight-summary-export/screenshots/llm-markdown.png)

### Settings

![Annot settings](https://raw.githubusercontent.com/rkka02/Annot/main/screenshots/settings.png?rev=20260330-1540)

## What It Does

- Real filesystem-backed workspace rooted at your home directory's `Annot` folder by default
- Folder tree with create, rename, move, and delete actions
- Real PDF rendering with vertical scroll mode and page mode
- Text selection, PDF highlights, memo-attached highlights, and eraser mode inside the PDF viewer
- Separate folder sessions and PDF-specific chat sessions
- Provider-based chat runtime with support for Codex and Claude Code
- Streaming chat output with resumable session state
- Math rendering in chat via KaTeX
- PDF highlights written back into the original PDF as native annotations
- Per-PDF markdown export for yellow/red highlights with preview before download
- Session-level markdown export for LLM-generated chat summaries with preview before download
- Adjustable chat font size and resizable chat panel

## Requirements

Before you start, make sure you have:

- Node.js 20+ installed
- npm installed
- Python 3 available on your system
- Codex installed locally if you want to use Codex
- Claude Code installed locally if you want to use Claude Code
- `PyMuPDF` installed for reading and writing PDF annotations
- `poppler` installed if you want reliable PDF page rendering utilities outside the browser viewer

Annot reuses your local CLI authentication state. Sign in through the provider you want to use before opening the app.

For the best paper-reading experience, it is also recommended to install the official PDF or document-reading skill/package for the agent runtime you plan to use most. Annot works without those extras, but Codex and Claude Code generally do better on PDF-heavy workflows when their official PDF-focused tools are available.

For example:

```bash
python3 -m pip install --user pymupdf pdfplumber pypdf reportlab
brew install poppler
```

On Windows PowerShell:

```powershell
py -3 -m pip install --user pymupdf pdfplumber pypdf reportlab
```

If you need Poppler on Windows too, install a Windows build and make sure its `bin` directory is on `PATH`.

## Quick Start

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## First-Time Setup

If this is your first time opening Annot:

1. Go to `Settings`.
2. Choose your default provider: `Codex` or `Claude Code`.
3. Click `Validate and set as default`.
4. Confirm the provider test succeeds.
5. Return to the workspace.
6. Create a folder in the explorer.
7. Upload one or more PDF files.
8. Open a PDF and start reading.
9. Ask your first question in the chat panel.

Annot creates its workspace under your home directory by default:

- macOS/Linux: `~/Annot`
- Windows: `%USERPROFILE%\Annot`

If you want to use a different root directory, start the app with:

```bash
ANNOT_ROOT=/your/path npm run dev
```

On Windows PowerShell, the equivalent is:

```powershell
$env:ANNOT_ROOT = 'C:\path\to\Annot'
npm run dev
```

## How Sessions Work

Annot has two kinds of chat sessions:

- Folder sessions: broader discussions that can span a folder and its papers
- PDF sessions: focused discussions tied to one specific PDF

Each session is also tied to the provider that created it. This keeps paper-specific conversations from mixing with broader folder-level research threads and avoids switching a live session between runtimes unexpectedly.

Session summaries are generated on demand when you export them. Annot uses the full saved chat history for that session, writes per-turn summaries back into the session record, and then lets you review the generated markdown before downloading it.

## Typical Workflow

### 1. Build your workspace

Use the explorer on the left to create folders and upload PDFs.

### 2. Read in the viewer

Open a paper and read it directly in Annot. You can switch between page mode and vertical scroll mode.

### 3. Mark important passages

Select text to highlight it. Use the eraser mode to remove highlights by selecting overlapping text. Annot stores these as native PDF highlight annotations in the original file, and you can click any saved highlight to attach a memo directly to that annotation.

### 4. Ask context-aware questions

Use the chat panel to ask for:

- summaries
- section explanations
- equation walkthroughs
- translations
- comparisons across papers

### 5. Export what matters

Annot supports two markdown export paths:

- highlight export: generate a mechanical markdown list of yellow and red highlights for the current PDF
- summary export: generate LLM-written turn summaries from the full saved chat history for the current session

Both exports open a preview dialog before download so you can inspect the markdown first.

### 6. Return later

Annot restores the right session for the current folder or PDF so you can continue where you left off.

## Notes

- Annot is designed to work with your local Codex or Claude Code authentication state.
- The app reads and manages files locally.
- On Windows, Annot will automatically look for `codex`, `codex.exe`, `claude`, `claude.exe`, `python`, and `py`.
- If your preferred agent has an official PDF/document-reading skill, install that too for better PDF-specific assistance.
- The default provider is configured in `Settings` and only saved after a live validation check succeeds.
- Existing sessions stay on the provider they were created with.
- PDF highlights are written back into the original PDF file.
- Highlight memos are stored with the native PDF annotations.
- Summary markdown export is generated from saved chat messages when you click `Export` in the chat panel.
- The development flow is the main supported setup here:

```bash
npm run dev
```

## Tech Stack

- Next.js
- React
- Tailwind CSS
- react-pdf / pdf.js
- Codex CLI
- Claude Code CLI
- PyMuPDF

## License

Apache-2.0. See [LICENSE](./LICENSE).
