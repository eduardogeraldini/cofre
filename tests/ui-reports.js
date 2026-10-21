// Teste de UI da tela de Relatórios — filtro de período (De/Até).
// Pré-requisito: npm run preview (http://localhost:4173) com o build atualizado.
// Uso: node tests/ui-reports.js
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const email = `ui-${Date.now()}@exemplo.com`;
const errors = [];
let pass = 0;
let fail = 0;

function check(name, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (ok) pass++; else fail++;
}

async function cardText(page, label) {
  const card = page.locator('article', { hasText: label }).first();
  const txt = (await card.textContent()) || '';
  return txt.replace(/\u00a0/g, ' ');
}

async function addTx(page, { type, amount, note }) {
  await page.getByRole('button', { name: 'Nova transação' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  if (type === 'income') {
    await dialog.getByRole('radio', { name: 'Receita' }).click();
  }
  await dialog.locator('#amount').fill(String(amount));
  await dialog.locator('#note').fill(note);
  // seleciona a primeira categoria (o auto-select ao trocar o tipo não preenche o campo)
  await dialog.getByRole('combobox').first().click();
  const menu = page.getByRole('option');
  await menu.first().waitFor({ state: 'visible', timeout: 3000 });
  await menu.first().click();
  await dialog.getByRole('button', { name: 'Adicionar transação' }).click();
  await dialog.waitFor({ state: 'hidden', timeout: 5000 });
}

(async () => {
  try {
    await fetch(BASE);
  } catch {
    console.error('Preview não responde em ' + BASE + ' — rode: npm run preview');
    process.exit(1);
  }

  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });

  // 1. cadastro
  await p.goto(BASE + '/cadastro', { waitUntil: 'load' });
  await p.getByLabel('Nome').fill('UI Test');
  await p.getByLabel('E-mail').fill(email);
  await p.getByLabel('Senha', { exact: true }).fill('senha123');
  await p.getByLabel('Confirmar senha').fill('senha123');
  await p.getByRole('button', { name: 'Criar conta' }).click();
  await p.waitForURL((u) => !u.pathname.includes('cadastro'), { timeout: 8000 });
  check('cadastro ok', true);

  // 2. semear transações (data padrão = hoje, no mês corrente)
  await p.goto(BASE + '/transacoes', { waitUntil: 'load' });
  await p.getByRole('button', { name: 'Nova transação' }).first().waitFor({ timeout: 5000 });
  await addTx(p, { type: 'income', amount: 300, note: 'Salário' });
  await addTx(p, { type: 'expense', amount: 120, note: 'Mercado' });
  await addTx(p, { type: 'expense', amount: 30, note: 'Café' });
  // aguarda a sincronização com a nuvem antes de recarregar em outra tela
  await p.waitForTimeout(3000);
  check('3 transações semeadas', true);

  // 3. relatórios — padrão = mês corrente
  await p.goto(BASE + '/relatorios', { waitUntil: 'load' });
  await p.locator('#report-from').waitFor({ timeout: 5000 });
  const fromBtn = await p.locator('#report-from').textContent();
  const toBtn = await p.locator('#report-to').textContent();
  check('picker "De" mostra dd/MM/yyyy', /\d{2}\/\d{2}\/\d{4}/.test(fromBtn || ''));
  check('picker "Até" mostra dd/MM/yyyy', /\d{2}\/\d{2}\/\d{4}/.test(toBtn || ''));

  const now = new Date();
  const monthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  await p.waitForTimeout(400);
  const recNow = await cardText(p, 'Receitas');
  const expNow = await cardText(p, 'Despesas');
  check('mês corrente: receitas = R$ 300', recNow.includes('300'));
  check('mês corrente: despesas = R$ 150', expNow.includes('150'));
  check(`mês corrente: rótulo = ${monthName}`, (await p.locator('main, body').first().textContent()).includes(monthName));

  mkdirSync('shots', { recursive: true });
  await p.screenshot({ path: 'shots/ui-reports-month.png', fullPage: true });

  // 4. intervalo passado (sem transações) via URL params
  await p.goto(BASE + '/relatorios?de=2020-01-01&ate=2020-01-31', { waitUntil: 'load' });
  await p.locator('#report-from').waitFor({ timeout: 5000 });
  await p.waitForTimeout(400);
  const pastFrom = await p.locator('#report-from').textContent();
  const recPast = await cardText(p, 'Receitas');
  const expPast = await cardText(p, 'Despesas');
  check('intervalo passado: picker De = 01/01/2020', (pastFrom || '').includes('01/01/2020'));
  check('intervalo passado: receitas zeradas', recPast.includes('R$ 0'));
  check('intervalo passado: despesas zeradas', expPast.includes('R$ 0'));
  check('intervalo passado: rótulo janeiro de 2020', (await p.locator('body').textContent()).includes('janeiro de 2020'));
  check('intervalo passado: estado vazio de despesas', (await p.getByText('Sem despesas no período').count()) > 0);
  await p.screenshot({ path: 'shots/ui-reports-empty.png', fullPage: true });

  // 5. intervalo parcial do mês corrente (só dia 01) — excluir transações de hoje se hoje > dia 1
  if (now.getDate() > 1) {
    const dayOneMonth = `${String(now.getMonth() + 1).padStart(2, '0')}`;
    const partialTo = `${now.getFullYear()}-${dayOneMonth}-01`;
    await p.goto(`${BASE}/relatorios?de=${now.getFullYear()}-${dayOneMonth}-01&ate=${partialTo}`, { waitUntil: 'load' });
    await p.locator('#report-from').waitFor({ timeout: 5000 });
    await p.waitForTimeout(400);
    const recPartial = await cardText(p, 'Receitas');
    const expPartial = await cardText(p, 'Despesas');
    check('intervalo só dia 01: receitas zeradas (txs de hoje fora)', recPartial.includes('R$ 0'));
    check('intervalo só dia 01: despesas zeradas', expPartial.includes('R$ 0'));
  } else {
    check('intervalo parcial pulado (hoje é dia 1º)', true);
  }

  // 6. voltar ao mês inteiro via URL — stats retornam
  const dayOneMonth = `${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  await p.goto(`${BASE}/relatorios?de=${now.getFullYear()}-${dayOneMonth}-01&ate=${now.getFullYear()}-${dayOneMonth}-${lastDay}`, { waitUntil: 'load' });
  await p.locator('#report-from').waitFor({ timeout: 5000 });
  await p.waitForTimeout(400);
  const recBack = await cardText(p, 'Receitas');
  const expBack = await cardText(p, 'Despesas');
  check('mês inteiro via URL: receitas = R$ 300', recBack.includes('300'));
  check('mês inteiro via URL: despesas = R$ 150', expBack.includes('150'));

  // 7. gráficos renderizam (área e barras presentes)
  const areaCount = await p.locator('path.recharts-area-curve').count();
  const barCount = await p.locator('.recharts-rectangle').count();
  check('gráfico de saldo (curva) renderiza', areaCount > 0);
  check('gráfico de fluxo (barras) renderiza', barCount > 0);

  console.log(`\nerros de console/página: ${errors.length ? errors.join(' | ') : 'nenhum'}`);
  console.log(`resultado: ${pass} pass, ${fail} fail`);
  await b.close();
  process.exit(errors.length || fail ? 1 : 0);
})().catch((e) => {
  console.error('FALHOU:', e.message);
  process.exit(1);
});
