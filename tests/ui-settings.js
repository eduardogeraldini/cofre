// Teste de UI da tela de Configurações — tokens do Atalho do iPhone.
// Pré-requisito: npm run preview (http://localhost:4173) com o build atualizado.
// Uso: npm run test:ui
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const email = `ui-${Date.now()}@exemplo.com`;
const errors = [];

(async () => {
  try {
    await fetch(BASE);
  } catch {
    console.error('Preview não responde em ' + BASE + ' — rode: npm run preview');
    process.exit(1);
  }

  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await p.goto(BASE + '/cadastro', { waitUntil: 'load' });
  await p.getByLabel('Nome').fill('UI Test');
  await p.getByLabel('E-mail').fill(email);
  await p.getByLabel('Senha', { exact: true }).fill('senha123');
  await p.getByLabel('Confirmar senha').fill('senha123');
  await p.getByRole('button', { name: 'Criar conta' }).click();
  await p.waitForURL(u => !u.pathname.includes('cadastro'), { timeout: 8000 });
  console.log('1. cadastro ok');

  await p.goto(BASE + '/configuracoes', { waitUntil: 'load' });
  await p.getByText('Acesso rápido (iPhone)').waitFor({ state: 'visible', timeout: 5000 });
  console.log('2. card visivel: true');

  console.log('3. estado vazio:', (await p.getByText('Nenhum token gerado ainda.').count()) > 0);
  console.log('4. Gerar token habilitado:', !(await p.getByRole('button', { name: 'Gerar token' }).isDisabled()));
  console.log('5. campo de chave ausente (0):', (await p.locator('#gemini-key').count()) === 0);

  await p.locator('#token-label').fill('iPhone');
  await p.getByRole('button', { name: 'Gerar token' }).click();
  await p.waitForTimeout(1200);
  console.log('6. banner token criado:', (await p.getByText(/exibido apenas uma vez/).count()) > 0);
  const listAfter = await p.locator('ul li').count();
  console.log('7. itens na lista apos gerar (esperado 1):', listAfter);

  mkdirSync('shots', { recursive: true });
  await p.screenshot({ path: 'shots/ui-settings.png', fullPage: true });
  console.log('erros:', errors.length ? errors : 'nenhum');
  await b.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
