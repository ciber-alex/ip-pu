const express = require("express");
const app = express();

const REFRESH_SECONDS = parseInt(process.env.REFRESH_SECONDS || "10", 10);

// Página HTML servida por el backend (el navegador consulta ipify directamente)
// y, si falla, usa un proxy sencillo del propio backend.
app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Mi IP pública</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');

    :root {
      --neon: #39ff14; /* verde fosforito */
      --bg: #000000;
    }
    * { box-sizing: border-box; }
    html, body {
      height: 100%;
      margin: 0;
      background: var(--bg);
      color: var(--neon);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    .wrap {
      height: 100%;
      display: grid;
      place-items: center;
      text-align: center;
      padding: 2rem;
      position: relative;
    }
    h1 {
      font-size: clamp(48px, 12vw, 180px);
      margin: 0 0 1rem 0;
      letter-spacing: 2px;
      text-shadow:
        0 0 6px rgba(57,255,20,0.8),
        0 0 18px rgba(57,255,20,0.6),
        0 0 36px rgba(57,255,20,0.4);
      animation: blink 1.2s steps(2, start) infinite;
      user-select: all;
      word-break: break-word;
    }
    @keyframes blink {
      0% { opacity: 1; }
      49% { opacity: 1; }
      50% { opacity: 0.35; }
      100% { opacity: 0.35; }
    }
    .sub {
      opacity: 0.85;
      line-height: 1.4;
      max-width: 900px;
      margin: 0 auto 1.5rem;
      font-size: clamp(14px, 2.4vw, 20px);
    }
    .row {
      display: inline-flex;
      gap: .75rem;
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
    }
    button {
      background: transparent;
      border: 2px solid var(--neon);
      color: var(--neon);
      padding: .6rem 1.1rem;
      border-radius: 12px;
      cursor: pointer;
      font-size: 1rem;
      transition: transform .08s ease, box-shadow .2s ease;
      box-shadow: 0 0 10px rgba(57,255,20,0.2);
    }
    button:hover { transform: translateY(-1px); box-shadow: 0 0 18px rgba(57,255,20,0.35); }
    .muted { opacity: .65; font-size: .95rem; }
    .mono { font-variant-ligatures: none; }
    .status { min-height: 1.5em; }

    /* Encabezado personalizado */
    .brand {
      position: absolute;
      top: 1.5rem;
      width: 100%;
      text-align: center;
      font-family: "Orbitron", sans-serif;
      color: #00ff9f; /* verde diferente al fosforito */
      letter-spacing: 1px;
      text-shadow:
        0 0 5px rgba(0,255,159,0.8),
        0 0 10px rgba(0,255,159,0.5),
        0 0 20px rgba(0,255,159,0.3);
    }
    .brand span {
      font-weight: bold;
      color: #39ff14; /* verde fosforito para tu nombre */
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="brand">
      <h2>Created by <span>CiberAlex</span> — Ip-Pu</h2>
    </header>
    <main>
      <h1 id="ip">—.—.—.—</h1>
      <div class="sub">
        <div class="status mono" id="status">Detectando tu IP pública…</div>
        <div class="row" style="margin-top: 1rem;">
          <button id="refresh">Refrescar ahora</button>
          <span class="muted">Auto-refresco cada ${REFRESH_SECONDS}s</span>
        </div>
      </div>
    </main>
  </div>
  <script>
    const ipEl = document.getElementById('ip');
    const statusEl = document.getElementById('status');
    const REFRESH_MS = ${REFRESH_SECONDS} * 1000;

    async function tryFetchers() {
      const fetchers = [
        // Cliente → ipify (principal)
        () => fetch('https://api.ipify.org?format=json', {cache:'no-store'}).then(r => r.json()).then(j => j.ip),
        // Cliente → ifconfig.co (alternativa)
        () => fetch('https://ifconfig.co/json', {cache:'no-store'}).then(r => r.json()).then(j => j.ip),
        // Fallback: proxy del backend (por si CORS/red bloquea)
        () => fetch('/ip-proxy', {cache:'no-store'}).then(r => r.json()).then(j => j.ip),
      ];
      let lastErr = null;
      for (const f of fetchers) {
        try { return await f(); } catch (e) { lastErr = e; }
      }
      throw lastErr || new Error('No se pudo obtener IP');
    }

    async function updateIP() {
      statusEl.textContent = 'Detectando tu IP pública…';
      try {
        const ip = await tryFetchers();
        ipEl.textContent = ip;
        statusEl.textContent = 'IP detectada (vista desde tu navegador).';
      } catch (e) {
        statusEl.textContent = 'No se pudo detectar la IP. ¿Firewall/CORS?';
      }
    }

    document.getElementById('refresh').addEventListener('click', updateIP);
    updateIP();
    setInterval(updateIP, REFRESH_MS);
  </script>
</body>
</html>`);
});

// Proxy súper simple (fallback) que pide la IP desde el servidor (Node 20 tiene fetch nativo)
app.get("/ip-proxy", async (_req, res) => {
  try {
    let ip = null;

    // Intento 1: ipify
    try {
      const r1 = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
      const j1 = await r1.json();
      ip = j1.ip;
    } catch (_) {}

    // Intento 2: ifconfig.me
    if (!ip) {
      const r2 = await fetch("https://ifconfig.me/ip", { cache: "no-store" });
      ip = (await r2.text()).trim();
    }

    // Intento 3: ifconfig.co
    if (!ip) {
      const r3 = await fetch("https://ifconfig.co/ip", { cache: "no-store" });
      ip = (await r3.text()).trim();
    }

    if (!ip) throw new Error("No IP from upstream");
    res.json({ ip });
  } catch (e) {
    res.status(502).json({ error: "No se pudo obtener IP desde upstream" });
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Public IP Web escuchando en http://0.0.0.0:${PORT}`);
});
