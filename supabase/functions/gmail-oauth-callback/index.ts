import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  const renderHtml = (title: string, message: string, ok: boolean, returnTo?: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;background:#0a0a1a;color:#e8e8e8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);padding:32px 40px;border-radius:16px;text-align:center;max-width:420px}.icon{font-size:48px;margin-bottom:12px}h1{margin:0 0 8px;font-size:20px}p{color:#a0a0b0;margin:0 0 20px}a{color:#c9a84c;text-decoration:none}</style></head>
<body><div class="box"><div class="icon">${ok ? '✅' : '⚠️'}</div><h1>${title}</h1><p>${message}</p>${returnTo ? `<a href="${returnTo}">Voltar ao app</a>` : ''}</div>
<script>setTimeout(()=>{${returnTo ? `window.location.href=${JSON.stringify(returnTo)}` : 'window.close()'}}, 2500);</script></body></html>`;

  try {
    if (errorParam) {
      return new Response(renderHtml('Conexão cancelada', errorParam, false), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    if (!code || !stateRaw) throw new Error('Faltam parâmetros code/state');

    const state = JSON.parse(atob(stateRaw));
    const { userId, origin } = state;
    if (!userId) throw new Error('State inválido');

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;
    const projectId = Deno.env.get('SUPABASE_URL')!.split('//')[1].split('.')[0];
    const redirectUri = `https://${projectId}.supabase.co/functions/v1/gmail-oauth-callback`;

    // Exchange code → tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(`Token exchange falhou: ${JSON.stringify(tokens)}`);

    // Userinfo (email)
    const uiRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userinfo = await uiRes.json();
    const emailAddress = userinfo.email;
    if (!emailAddress) throw new Error('Email não retornado pelo Google');

    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

    // Persist with service role (RLS bypass — userId comes from signed state)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: upErr } = await admin.from('user_integrations').upsert({
      user_id: userId,
      provider: 'gmail',
      email_address: emailAddress,
      display_name: userinfo.name ?? emailAddress,
      oauth_access_token: tokens.access_token,
      oauth_refresh_token: tokens.refresh_token,
      oauth_expires_at: expiresAt,
      oauth_scope: tokens.scope,
      status: 'ativa',
      last_error: null,
    }, { onConflict: 'user_id,provider,email_address' });

    if (upErr) throw new Error(`DB: ${upErr.message}`);

    const returnTo = origin ? `${origin}/integracoes?connected=${encodeURIComponent(emailAddress)}` : undefined;
    return new Response(renderHtml('Gmail conectado!', `${emailAddress} foi vinculado à sua conta.`, true, returnTo), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return new Response(renderHtml('Falha ao conectar', msg, false), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 400,
    });
  }
});
