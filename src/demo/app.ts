// src/demo/app.ts
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

const $ = (s: string) => document.querySelector(s)! as HTMLElement;
const exprInput = $('#expr') as HTMLInputElement;
const tzSelect = $('#tz') as HTMLSelectElement;
const descriptionEl = $('#description');
const nextRunsEl = $('#next-runs');
const treeEl = $('#tree');
const errorEl = $('#error');
const permalinkEl = $('#permalink');

function update() {
  const expr = exprInput.value.trim() || '* * * * *';
  const tz = tzSelect.value;

  try {
    const cron = new CronToolkit(expr, { timeZone: tz });

    descriptionEl.textContent = cron.describe() || 'every second';
    errorEl.textContent = '';
    treeEl.style.display = 'block';
    treeEl.textContent = cron.dumpTree();

    // Next 8 runs
    let next = DateTime.now().setZone(tz);
    const runs: string[] = [];
    for (let i = 0; i < 8; i++) {
      const epoch = cron.next(next.toSeconds());
      if (epoch === null) break;
      next = DateTime.fromSeconds(epoch).plus({ seconds: 1 });
      runs.push(DateTime.fromSeconds(epoch).setZone(tz).toLocaleString(DateTime.DATETIME_FULL));
    }
    nextRunsEl.innerHTML = runs.length ? '<ul><li>' + runs.join('</li><li>') + '</li></ul>' : '<p>no upcoming runs</p>';

    // Shareable URL
    const hash = encodeURIComponent(expr);
    permalinkEl.innerHTML = `<a href="#${hash}">permalink</a>`;
    history.replaceState(null, '', '#' + hash);

  } catch (e: any) {
    descriptionEl.textContent = '';
    errorEl.textContent = e.message;
    treeEl.style.display = 'none';
    nextRunsEl.innerHTML = '';
    permalinkEl.innerHTML = '';
  }
}

// Load from hash
if (location.hash) {
  exprInput.value = decodeURIComponent(location.hash.slice(1));
}

// Random example
$('#random').addEventListener('click', (e) => {
  e.preventDefault();
  const ex = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
  exprInput.value = ex;
  update();
});

exprInput.addEventListener('input', update);
tzSelect.addEventListener('change', update);
window.addEventListener('load', update);
