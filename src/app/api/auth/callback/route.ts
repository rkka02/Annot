import { NextResponse } from 'next/server';

export async function GET() {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Codex Login Required — Annot</title>
  <style>
    body {
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f7fafc;
      color: #283439;
    }
    .card {
      text-align: center;
      padding: 3rem;
      background: #ffffff;
      border-radius: 1rem;
      max-width: 460px;
      box-shadow: 0 20px 40px rgba(40, 52, 57, 0.05);
    }
    h1 {
      font-size: 1.35rem;
      color: #283439;
      margin: 0 0 0.75rem;
      font-weight: 700;
    }
    p {
      color: #6b7a82;
      font-size: 0.95rem;
      line-height: 1.6;
    }
    .brand {
      margin-top: 1.5rem;
      font-size: 0.75rem;
      color: #8a969d;
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Browser OAuth is disabled</h1>
    <p>Annot now reuses the existing Codex login on this machine. Return to Settings and refresh the status after signing in to Codex.</p>
    <div class="brand">Annot &mdash; PDF Research Assistant</div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 410,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
