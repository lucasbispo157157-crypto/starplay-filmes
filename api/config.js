import { getConfig, updateConfig, incrementDownloads } from '../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const current = await getConfig();

    if (req.method === 'GET') {
      const adminKey = req.headers['x-admin-key'] || req.query?.admin_key;
      const isAdmin = !!(adminKey && adminKey === current.admin_senha);

      return res.status(200).json({
        ok: true,
        apk_url: current.apk_url,
        apk_nome: current.apk_nome,
        versao: current.versao,
        tamanho: current.tamanho,
        downloads_count: current.downloads_count,
        atualizado_em: current.atualizado_em,
        ...(isAdmin ? { isAdmin: true, admin_senha: current.admin_senha } : {})
      });
    }

    if (req.method === 'POST') {
      // Contador de download
      if (req.query?.action === 'track_download') {
        const total = await incrementDownloads();
        return res.status(200).json({ ok: true, downloads_count: total });
      }

      const body = req.body || {};
      const senhaFornecida = body.admin_senha_atual || req.headers['x-admin-key'];

      if (!senhaFornecida || senhaFornecida !== current.admin_senha) {
        return res.status(401).json({ ok: false, erro: 'Senha administrativa incorreta.' });
      }

      const apk_url = body.apk_url !== undefined ? body.apk_url.trim() : current.apk_url;
      const apk_nome = body.apk_nome !== undefined ? body.apk_nome.trim() : current.apk_nome;
      const versao = body.versao !== undefined ? body.versao.trim() : current.versao;
      const tamanho = body.tamanho !== undefined ? body.tamanho.trim() : current.tamanho;
      const nova_senha = body.nova_admin_senha !== undefined && body.nova_admin_senha.trim() ? body.nova_admin_senha.trim() : current.admin_senha;

      const updated = await updateConfig({
        apk_url,
        apk_nome: apk_nome || 'StarPlay.apk',
        versao: versao || 'v3.2',
        tamanho: tamanho || '6.2 MB',
        admin_senha: nova_senha
      });

      return res.status(200).json({
        ok: true,
        mensagem: 'Configurações do aplicativo atualizadas com sucesso!',
        config: {
          apk_url: updated.apk_url,
          apk_nome: updated.apk_nome,
          versao: updated.versao,
          tamanho: updated.tamanho,
          downloads_count: updated.downloads_count
        }
      });
    }

    return res.status(405).json({ ok: false, erro: 'Método não permitido.' });
  } catch (err) {
    console.error('Erro na API /api/config:', err);
    return res.status(500).json({ ok: false, erro: 'Erro interno no servidor.', detalhe: err.message });
  }
}
