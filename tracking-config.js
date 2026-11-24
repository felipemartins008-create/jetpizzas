/**
 * Configuração Central de Tracking — Jet Pizzas Jundiaí
 *
 * - Supabase (First-Party Tracking): já configurado para salvar visitas e cliques por UTM no painel /painel.html
 * - Meta Pixel / GA4 / Clarity: basta colar seus IDs abaixo quando criar
 * - Para testar no console do navegador, abra a URL com ?debug=1
 */
window.JET_TRACKING_CONFIG = {
  // First-Party Analytics (Supabase — projeto appfamília)
  SUPABASE_URL: 'https://tsdavykfxplviclvvacd.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_VBI9GiEutc4ShkICX0d4Wg_ZYKDLhLc',

  // Meta Pixel ID (ex: '1234567890123456') — encontre no Gerenciador de Eventos da Meta
  META_PIXEL_ID: '',

  // Opcional: Google Analytics 4 (ex: 'G-XXXXXXXXXX')
  GA4_MEASUREMENT_ID: '',

  // Opcional: Microsoft Clarity (ex: 'abc123xyz') — mapa de calor e gravações gratuitas
  CLARITY_PROJECT_ID: '',

  // Nome da unidade enviado em todos os eventos
  UNIT_NAME: 'Jundiai',

  // Ativa logs detalhados no console (também pode ativar via ?debug=1 na URL)
  DEBUG: false,
};
