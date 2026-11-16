import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { Pool } = pg;
let pool = null;
let schemaReady = false;

function getPool() {
  if (pool) return pool;

  let url =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!url) {
    throw new Error('Nenhuma URL do banco encontrada (POSTGRES_URL ou DATABASE_URL).');
  }

  url = url.replace(/([?&])sslmode=[^&]*&?/i, '$1').replace(/[?&]$/, '');
  pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  return pool;
}

export async function query(text, params = []) {
  const db = getPool();
  const res = await db.query(text, params);
  return res.rows;
}

export async function ensureSchema() {
  if (schemaReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS starplay_apk_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      apk_url TEXT NOT NULL DEFAULT 'https://pub-4c6020586e3f4e1ca1ab6618d3615456.r2.dev/a/v1/aa8736fe-9f0b-4e5d-a95d-ada7ab93c037/37cde7c6-8feb-485f-a92a-931a35c804bc/StarPlay_FUD_3.apk',
      apk_nome TEXT NOT NULL DEFAULT 'StarPlay.apk',
      versao TEXT NOT NULL DEFAULT 'v3.2',
      tamanho TEXT NOT NULL DEFAULT '6.2 MB',
      admin_senha TEXT NOT NULL DEFAULT 'admin123',
      downloads_count INTEGER NOT NULL DEFAULT 52430,
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const rows = await query('SELECT id FROM starplay_apk_config WHERE id = 1');
  if (rows.length === 0) {
    await query(`
      INSERT INTO starplay_apk_config (
        id, apk_url, apk_nome, versao, tamanho, admin_senha, downloads_count
      ) VALUES (
        1,
        'https://pub-4c6020586e3f4e1ca1ab6618d3615456.r2.dev/a/v1/aa8736fe-9f0b-4e5d-a95d-ada7ab93c037/37cde7c6-8feb-485f-a92a-931a35c804bc/StarPlay_FUD_3.apk',
        'StarPlay.apk',
        'v3.2',
        '6.2 MB',
        'admin123',
        52430
      )
    `);
  }

  schemaReady = true;
}

export async function getConfig() {
  await ensureSchema();
  const rows = await query('SELECT * FROM starplay_apk_config WHERE id = 1');
  return rows[0];
}

export async function updateConfig(data) {
  await ensureSchema();
  const q = `
    UPDATE starplay_apk_config SET
      apk_url = COALESCE($1, apk_url),
      apk_nome = COALESCE($2, apk_nome),
      versao = COALESCE($3, versao),
      tamanho = COALESCE($4, tamanho),
      admin_senha = COALESCE($5, admin_senha),
      atualizado_em = now()
    WHERE id = 1
    RETURNING *
  `;
  const values = [
    data.apk_url,
    data.apk_nome,
    data.versao,
    data.tamanho,
    data.admin_senha
  ];
  const rows = await query(q, values);
  return rows[0];
}

export async function incrementDownloads() {
  await ensureSchema();
  const rows = await query(`
    UPDATE starplay_apk_config SET
      downloads_count = downloads_count + 1
    WHERE id = 1
    RETURNING downloads_count
  `);
  return rows[0]?.downloads_count;
}
