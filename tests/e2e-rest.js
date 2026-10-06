// E2E REST do gasto rápido: tokens de acesso + Edge Function + gravação do gasto.
// Requer: .env apontando para o Supabase, schema.sql + integration.sql executados,
//         supabase secrets set GEMINI_API_KEY=… e supabase functions deploy registrar-gasto.
// Uso: npm test
import { createHash, randomBytes } from 'node:crypto';

const URL = 'https://mpgwmglwwjlxagjawwhi.supabase.co';
const ANON = 'sb_publishable_j6Jdzu5VGzoJfQzVOUqTmw_L1vod1DT';
const EF = `${URL}/functions/v1/registrar-gasto`;
const email = `ia-e2e-${Date.now()}@exemplo.com`;
let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}${extra !== undefined ? ' -> ' + JSON.stringify(extra) : ''}`);
  if (cond) pass++; else fail++;
};
const q = async (path, init = {}, bearer) => {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: ANON, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  return { status: r.status, data: await r.json().catch(() => null) };
};
const ef = async (body, bearer) => {
  const r = await fetch(EF, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json().catch(() => null) };
};
const sha256hex = (s) => createHash('sha256').update(s).digest('hex');

(async () => {
  const su = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'senha123', data: { name: 'IA E2E' } }),
  });
  const sess = await su.json();
  check('signup (200/201)', su.ok && !!sess.access_token, su.status);
  if (!sess.access_token) { console.log('abort'); process.exit(1); }
  const at = sess.access_token;
  const uid = sess.user.id;

  const cat = await q('categories', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: uid, id: 'outros', name: 'Outros', type: 'expense' }),
  }, at);
  check('criar categoria expense (RLS propria)', cat.status === 201, cat.status);

  const t1 = 'cofre_sk_' + randomBytes(24).toString('hex');
  const ins1 = await q('integration_tokens', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: uid, label: 'iPhone', token_hash: sha256hex(t1) }),
  }, at);
  check('criar token 1 (insert direto) -> 201', ins1.status === 201, ins1);

  const t2 = 'cofre_sk_' + randomBytes(24).toString('hex');
  const ins2 = await q('integration_tokens', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: uid, label: 'iPad', token_hash: sha256hex(t2) }),
  }, at);
  check('criar token 2 (vários por usuario) -> 201', ins2.status === 201, ins2);

  const st1 = await q('integration_tokens?select=id,label,created_at,last_used_at&order=created_at.desc', {}, at);
  check('lista: 2 tokens (RLS proprios)',
    st1.status === 200 && Array.isArray(st1.data) && st1.data.length === 2 &&
    st1.data.some(t => t.label === 'iPhone') && st1.data.some(t => t.label === 'iPad'),
    st1.data);
  check('lista nao expoe token_hash',
    Array.isArray(st1.data) && st1.data.length === 2 && st1.data.every(t => !('token_hash' in t)),
    st1.data && st1.data[0] && Object.keys(st1.data[0]));

  const probe = await ef({ token: t1, texto: '12,50 almoço' }, ANON);
  const efUp = probe.status !== 404;
  check('Edge Function registrar-gasto respondendo (deploy)', efUp, probe.status);

  if (efUp) {
    check('dry-run responde HTTP 200', probe.status === 200, probe.status);
    if (probe.data && probe.data.ok === true && probe.data.dry_run === true) {
      check('dry-run com IA -> amount 12.5', Math.abs(probe.data.amount - 12.5) < 0.01, probe.data);

      const conf = await ef({
        token: t1, confirmar: true, amount: 12.5, category_id: 'outros',
        note: 'e2e confirmacao', date: new Date().toISOString().slice(0, 10),
      }, ANON);
      check('confirmacao grava transacao', conf.data && conf.data.ok === true && !!conf.data.id, conf.data);
      if (conf.data?.id) {
        const del = await q(`transactions?id=eq.${conf.data.id}`, { method: 'DELETE' }, at);
        check('limpeza da transacao de teste', del.status >= 200 && del.status < 300, del.status);
      }
    } else if (probe.data && probe.data.ok === false && /Chave da API de IA/.test(probe.data.message)) {
      check('segredo GEMINI_API_KEY ausente -> mensagem clara', true, probe.data.message);
      console.log('  (defina a chave: supabase secrets set GEMINI_API_KEY=sua_chave_aqui e rode de novo para testar a IA)');
    } else {
      check('dry-run ok', false, probe.data);
    }

    const bad = await ef({ token: 'cofre_sk_' + '0'.repeat(48), texto: 'teste' }, ANON);
    check('token invalido -> "Token invalido"', bad.data && /Token inválido/.test(bad.data.message), bad.data);

    const id1 = st1.data.find(t => t.label === 'iPhone').id;
    const del1 = await q(`integration_tokens?id=eq.${id1}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    }, at);
    check('apagar token 1 -> 1 linha removida',
      del1.status === 200 && Array.isArray(del1.data) && del1.data.length === 1, del1);

    const r3 = await ef({ token: t1, confirmar: true, amount: 5, category_id: 'outros' }, ANON);
    check('token 1 apagado -> "Token invalido"', r3.data && /Token inválido/.test(r3.data.message), r3.data);

    const r4 = await ef({
      token: t2, confirmar: true, amount: 9.99, category_id: 'outros', note: 'e2e token2',
    }, ANON);
    check('token 2 continua ativo -> grava (sem IA)', r4.data && r4.data.ok === true && !!r4.data.id, r4.data);
    if (r4.data?.id) {
      const del2 = await q(`transactions?id=eq.${r4.data.id}`, { method: 'DELETE' }, at);
      check('limpeza transacao token 2', del2.status >= 200 && del2.status < 300, del2.status);
    }
  } else {
    console.log('SKIP testes da Edge Function: rode "supabase functions deploy registrar-gasto" e depois de novo');
  }

  const su2 = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `ia-e2e2-${Date.now()}@exemplo.com`, password: 'senha123', data: { name: 'E2E 2' } }),
  });
  const sess2 = await su2.json();
  const bList = await q('integration_tokens?select=id', {}, sess2.access_token);
  check('usuario B: sem tokens (RLS)',
    bList.status === 200 && Array.isArray(bList.data) && bList.data.length === 0, bList.data);

  console.log(`\n${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
