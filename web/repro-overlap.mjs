import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const OUT = 'C:/Users/teus_/AppData/Local/Temp/claude/C--Users-teus--Documents-hackthon/c4727ca4-f135-4da9-ae7e-9b2f21ac341a/scratchpad';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
page.on('console', (msg) => console.log('[console]', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

await page.goto(`${BASE}/login`);
await page.fill('#email', 'professor@demo.foco');
await page.fill('#password', 'demo1234');
await page.click('button[type="submit"]');
await page.waitForURL(/\/professor/, { timeout: 15000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/01-professor-home.png`, fullPage: true });

// Fill topic and start session on the first class
const topicInput = page.locator('#session-topic');
if (await topicInput.count()) {
  await topicInput.fill('Frações');
  const startBtn = page.locator('button', { hasText: 'Iniciar Modo Aula' }).first();
  await startBtn.click();
  await page.waitForTimeout(1500);
} else {
  console.log('NOTE: session already active, skipping start');
}
await page.screenshot({ path: `${OUT}/02-session-started.png`, fullPage: true });

// Launch open_question
const typeSelect = page.locator('#activity-type');
await typeSelect.selectOption('open_question');
await page.fill('#activity-question', 'O que voce achou da aula ate agora?');
await page.click('button:has-text("Lançar atividade")');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/03-after-open-question.png`, fullPage: true });

// Log the DOM structure of the activity card area to check for duplicate/overlap nodes
const html1 = await page.locator('section').first().innerHTML();
console.log('--- SECTION HTML AFTER OPEN QUESTION (first 2000 chars) ---');
console.log(html1.slice(0, 2000));

// Now launch a new activity: click "Nova atividade" then Quiz
const novaBtn = page.locator('button:has-text("Nova atividade")');
if (await novaBtn.count()) {
  await novaBtn.click();
  await page.waitForTimeout(500);
}
await page.locator('#activity-type').selectOption('quiz');
await page.fill('#activity-question', 'Quanto e 2+2?');
const opt1 = page.locator('input[aria-label="Opção 1"]');
const opt2 = page.locator('input[aria-label="Opção 2"]');
await opt1.fill('3');
await opt2.fill('4');
await page.click('button:has-text("Lançar atividade")');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/04-after-quiz.png`, fullPage: true });

const html2 = await page.locator('section').first().innerHTML();
console.log('--- SECTION HTML AFTER QUIZ (first 3000 chars) ---');
console.log(html2.slice(0, 3000));

// Check bounding boxes of all direct children of the main section to detect visual overlap
const boxes = await page.evaluate(() => {
  const section = document.querySelector('main section');
  if (!section) return null;
  return Array.from(section.children).map((el) => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, text: el.textContent?.slice(0, 60), top: r.top, bottom: r.bottom, left: r.left, right: r.right };
  });
});
console.log('--- CHILD BOXES ---');
console.log(JSON.stringify(boxes, null, 2));

await browser.close();
console.log('DONE');
