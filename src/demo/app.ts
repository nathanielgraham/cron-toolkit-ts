// src/demo/app.ts — FINAL, CRASH-PROOF VERSION
import { CronToolkit } from '../CronToolkit';
import { DateTime } from 'luxon';

const EXAMPLES = [
  '* * * * * * *',
  '0 0 12 ? * 6L *',
  '0 0 9 ? * MON#1 *',
  '0 0 0 L * ? *',
  '0 0 0 29 2 ? *',
  '0 30 14 ? * 6-2 *',
  '0 0 17 15W * ? *',
  '@daily',
  '0 0 0 ? * 5#5 *',
  '0 0 12 ? * 6-2 *',
];

function update() {
  // Get elements safely inside the function (they exist by now)
  const exprInput = document.getElementById('expr') as HTMLInputElement;
  const tzSelect = document.getElementById('tz') as HTMLSelectElement;
  const descriptionEl = document.getElementById('description');
  const nextListEl = document.getElementById('next-list');
  const treeEl = document.getElementById('tree');
  const errorEl = document.getElementById('error');
  const permalinkEl = document.getElementById('permalink');

  if (!exprInput || !tzSelect || !descriptionEl || !nextListEl || !treeEl || !errorEl || !permalinkEl) {
    console.warn('Missing DOM elements — skipping update');
    return;
  }

  const expr = exprInput.value.trim() || '* * * * *';
  const tz = tzSelect.value;

  errorEl.textContent = '';
  treeEl.textContent = '';
  nextListEl.innerHTML = '';
  descriptionEl.textContent = 'every second';

  try {
    const cron = new CronToolkit(expr, { timeZone: tz });

    descriptionEl.textContent = cron.describe() || 'every second';

    let cursor = DateTime.now().setZone(tz).plus({ seconds: 1 });
    const runs: string[] = [];

    for (let i = 0; i < 3; i++) {
      const epoch = cron.next(cursor.toSeconds());
      if (epoch === null) break;

      const dt = DateTime.fromSeconds(epoch).setZone(tz);
      runs.push(dt.toLocaleString(DateTime.DATETIME_FULL));
      cursor = dt.plus({ seconds: 1 });
    }

    nextListEl.innerHTML = runs.length
      ? runs.map(r => `<li>${r}</li>`).join('')
      : '<li style="color:#888;font-style:italic">No upcoming runs</li>';

    treeEl.textContent = cron.dumpTree();

    const encoded = encodeURIComponent(expr);
    permalinkEl.innerHTML = `<a href="#${encoded}">permalink</a>`;
    history.replaceState(null, '', '#' + encoded);

  } catch (e: any) {
    descriptionEl.textContent = '';
    errorEl.textContent = e.message || 'Invalid cron expression';
    nextListEl.innerHTML = '';
    treeEl.textContent = '';
    permalinkEl.innerHTML = '';
  }
}

// Load from hash (safe — runs immediately)
if (location.hash) {
  const hashExpr = decodeURIComponent(location.hash.slice(1));
  if (hashExpr) {
    const exprInput = document.getElementById('expr') as HTMLInputElement;
    if (exprInput) exprInput.value = hashExpr;
  }
}

// === ALL EVENT LISTENERS + INITIAL RENDER — INSIDE DOMContentLoaded ===
document.addEventListener('DOMContentLoaded', () => {
  const exprInput = document.getElementById('expr') as HTMLInputElement;
  const tzSelect = document.getElementById('tz') as HTMLSelectElement;
  const randomBtn = document.getElementById('random-btn');
  const legendToggle = document.getElementById('legend-toggle');
  const syntaxDetails = document.getElementById('syntax-details') as HTMLDetailsElement;

  if (!exprInput || !tzSelect) {
    console.error('Required elements missing — page not ready');
    return;
  }

  // Input events
  exprInput.addEventListener('input', update);
  tzSelect.addEventListener('change', update);

  // Random button
  if (randomBtn) {
    randomBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const ex = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
      exprInput.value = ex;
      update();
    });
  }

  // Legend toggle → syntax table
  if (legendToggle && syntaxDetails) {
    legendToggle.addEventListener('click', () => {
      syntaxDetails.open = !syntaxDetails.open;
    });
  }

  // Initial render
  update();
});
