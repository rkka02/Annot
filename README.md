# Annot

Annot is a local-first PDF reading workspace with a built-in AI chat panel.

It is designed for a simple loop:

1. organize papers in folders
2. open a PDF and read it in place
3. highlight and annotate while you read
4. ask questions in a chat session tied to that folder or PDF

Annot uses your existing local Codex or Claude Code login on the same machine. No `OPENAI_API_KEY` setup is required.

## Screenshots

### PDF reading + chat

![Annot workspace](./screenshots/1.png)

### Settings

![Annot settings](./screenshots/3.png)

## What It Does

- Real filesystem-backed workspace rooted at `~/Annot` by default
- Folder tree with create, rename, move, and delete actions
- Real PDF rendering with vertical scroll mode and page mode
- Text selection, PDF highlights, and eraser mode inside the PDF viewer
- Separate folder sessions and PDF-specific chat sessions
- Provider-based chat runtime with support for Codex and Claude Code
- Streaming chat output with resumable session state
- Math rendering in chat via KaTeX
- PDF highlights written back into the original PDF as native annotations
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

For example:

```bash
python3 -m pip install --user pymupdf pdfplumber pypdf reportlab
brew install poppler
```

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

Annot creates its workspace under `~/Annot` by default.

If you want to use a different root directory, start the app with:

```bash
ANNOT_ROOT=/your/path npm run dev
```

## How Sessions Work

Annot has two kinds of chat sessions:

- Folder sessions: broader discussions that can span a folder and its papers
- PDF sessions: focused discussions tied to one specific PDF

Each session is also tied to the provider that created it. This keeps paper-specific conversations from mixing with broader folder-level research threads and avoids switching a live session between runtimes unexpectedly.

## Typical Workflow

### 1. Build your workspace

Use the explorer on the left to create folders and upload PDFs.

### 2. Read in the viewer

Open a paper and read it directly in Annot. You can switch between page mode and vertical scroll mode.

### 3. Mark important passages

Select text to highlight it. Use the eraser mode to remove highlights by selecting overlapping text. Annot stores these as native PDF highlight annotations in the original file.

### 4. Ask context-aware questions

Use the chat panel to ask for:

- summaries
- section explanations
- equation walkthroughs
- translations
- comparisons across papers

### 5. Return later

Annot restores the right session for the current folder or PDF so you can continue where you left off.

## Notes

- Annot is designed to work with your local Codex or Claude Code authentication state.
- The app reads and manages files locally.
- The default provider is configured in `Settings` and only saved after a live validation check succeeds.
- Existing sessions stay on the provider they were created with.
- PDF highlights are written back into the original PDF file.
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
