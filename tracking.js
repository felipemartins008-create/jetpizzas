(() => {
  const cfg = window.JET_TRACKING_CONFIG || {};
  const urlParams = new URLSearchParams(window.location.search);
  const DEBUG = Boolean(cfg.DEBUG || urlParams.get('debug') === '1');

  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
  const ATTR_STORAGE_KEY = 'jet_jundiai_attribution_v1';
  const VISITOR_STORAGE_KEY = 'jet_jundiai_visitor_id_v1';
  const SESSION_STORAGE_KEY = 'jet_jundiai_session_id_v1';

  function randomId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return `${prefix}_${window.crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function getOrCreateStorageId(storage, key, prefix) {
    try {
      let id = storage.getItem(key);
      if (!id) {
        id = randomId(prefix);
        storage.setItem(key, id);
      }
      return id;
    } catch {
      return randomId(prefix);
    }
  }

  const visitorId = getOrCreateStorageId(window.localStorage, VISITOR_STORAGE_KEY, 'v');
  const sessionId = getOrCreateStorageId(window.sessionStorage, SESSION_STORAGE_KEY, 's');

  // Persist UTMs / fbclid in sessionStorage so navigation keeps attribution
  function getAttribution() {
    let saved = {};
    try {
      saved = JSON.parse(sessionStorage.getItem(ATTR_STORAGE_KEY) || '{}') || {};
    } catch {
      saved = {};
    }

    let updated = false;
    UTM_KEYS.forEach((key) => {
      const val = urlParams.get(key);
      if (val) {
        saved[key] = val;
        updated = true;
      }
    });

    if (updated) {
      try {
        sessionStorage.setItem(ATTR_STORAGE_KEY, JSON.stringify(saved));
      } catch {
        // ignore storage restrictions
      }
    }
    return saved;
  }

  function generateEventId(prefix) {
    const rand = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${Date.now()}_${rand}`;
  }

  function getPageVersion() {
    const path = (window.location.pathname || '').toLowerCase();
    if (path.includes('v2')) return 'v2_video';
    return 'v1_linktree';
  }

  function getDeviceType() {
    return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
  }

  const attribution = getAttribution();
  const basePayload = {
    unit: cfg.UNIT_NAME || 'Jundiai',
    page_version: getPageVersion(),
    device_type: getDeviceType(),
    page_path: window.location.pathname || '/',
    referrer: document.referrer || 'direct',
    ...attribution,
  };

  function logDebug(label, data) {
    if (DEBUG) {
      console.log(`[JetTracking] ${label}`, data);
    }
  }

  // First-Party Tracking: Send event directly to Supabase (keepalive ensures zero dropped clicks)
  function sendToSupabase(eventName, extra = {}) {
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY) return;

    const row = {
      visitor_id: visitorId,
      session_id: sessionId,
      event_name: eventName,
      page_version: basePayload.page_version,
      device_type: basePayload.device_type,
      button_position: extra.button_position || null,
      utm_source: attribution.utm_source || null,
      utm_medium: attribution.utm_medium || null,
      utm_campaign: attribution.utm_campaign || null,
      utm_content: attribution.utm_content || null,
      utm_term: attribution.utm_term || null,
      fbclid: attribution.fbclid || null,
      referrer: basePayload.referrer || null,
      destination_url: extra.destination_url || null,
      page_path: basePayload.page_path,
    };

    const endpoint = `${cfg.SUPABASE_URL}/rest/v1/jetpizzas_events`;
    try {
      fetch(endpoint, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          apikey: cfg.SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${cfg.SUPABASE_PUBLISHABLE_KEY}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(row),
      }).catch(() => {});
      logDebug(`Supabase Saved -> ${eventName}`, row);
    } catch {
      // never block UI on network error
    }
  }

  // 1. Load Meta Pixel if ID is configured
  function initMetaPixel(pixelId) {
    if (!pixelId) {
      logDebug('Meta Pixel desativado (preencha META_PIXEL_ID em tracking-config.js)', {});
      return;
    }
    if (window.fbq) return;

    /* eslint-disable */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    window.fbq('init', pixelId);
    const pvId = generateEventId('pv');
    window.fbq('track', 'PageView', basePayload, { eventID: pvId });
    logDebug('Meta Standard: PageView', { ...basePayload, eventID: pvId });
  }

  // 2. Load GA4 if ID is configured
  function initGA4(measurementId) {
    if (!measurementId) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      page_title: document.title,
      unit: basePayload.unit,
      page_version: basePayload.page_version,
    });
    logDebug('GA4 inicializado', { measurementId });
  }

  // 3. Load Microsoft Clarity if ID is configured
  function initClarity(projectId) {
    if (!projectId) return;
    /* eslint-disable */
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r);
      t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', projectId);
    /* eslint-enable */
    logDebug('Microsoft Clarity inicializado', { projectId });
  }

  // Unified event dispatcher (Supabase First-Party + Meta Standard + Meta Custom + GA4)
  function trackEvent({ customName, standardName, params = {}, skipSupabase = false }) {
    const payload = { ...basePayload, ...params };
    const eventID = generateEventId(customName || standardName || 'ev');

    if (!skipSupabase && (customName || standardName)) {
      sendToSupabase(customName || standardName, params);
    }

    if (typeof window.fbq === 'function') {
      if (standardName) {
        window.fbq('track', standardName, payload, { eventID: `${eventID}_std` });
      }
      if (customName) {
        window.fbq('trackCustom', customName, payload, { eventID });
      }
    }

    if (typeof window.gtag === 'function') {
      window.gtag('event', customName || standardName, payload);
    }

    logDebug(`Event -> ${standardName ? `Meta:${standardName} + ` : ''}${customName || ''}`, {
      ...payload,
      eventID,
    });
  }

  // Expose helper globally so script.js can track share buttons too
  window.JetTrack = trackEvent;

  // Map each button's data-track-event to Meta Standard Event + rich metadata
  const EVENT_MAP = {
    ClickWhatsApp: {
      standardName: 'Contact',
      params: { content_name: 'WhatsApp Jundiai', content_category: 'order_channel', channel: 'whatsapp' },
    },
    ClickCardapioSite: {
      standardName: 'InitiateCheckout',
      params: { content_name: 'Cardapio Site', content_category: 'order_channel', channel: 'site' },
    },
    ClickAppiOS: {
      standardName: 'Lead',
      params: { content_name: 'App iPhone', content_category: 'app_download', channel: 'app_ios' },
    },
    ClickAppAndroid: {
      standardName: 'Lead',
      params: { content_name: 'App Android', content_category: 'app_download', channel: 'app_android' },
    },
    ClickTelefoneJundiai: {
      standardName: 'Contact',
      params: { content_name: 'Telefone Jundiai', content_category: 'order_channel', channel: 'phone' },
    },
    ClickInstagram: {
      standardName: null,
      params: { content_name: 'Instagram Jet Pizzas', content_category: 'social', channel: 'instagram' },
    },
  };

  // Initialize providers
  initMetaPixel(cfg.META_PIXEL_ID);
  initGA4(cfg.GA4_MEASUREMENT_ID);
  initClarity(cfg.CLARITY_PROJECT_ID);

  // Record PageView in Supabase (first-party) and ViewContent in Meta Pixel
  sendToSupabase('PageView');
  trackEvent({
    standardName: 'ViewContent',
    customName: 'LandingPageView',
    skipSupabase: true,
    params: {
      content_name: `Jet Pizzas Jundiai (${basePayload.page_version})`,
      content_category: 'landing_page',
    },
  });

  // Track engagement milestones (great for Meta Remarketing & real attention metrics)
  setTimeout(() => {
    if (document.visibilityState === 'visible') {
      trackEvent({ customName: 'Engaged10s', params: { seconds: 10 } });
    }
  }, 10000);

  setTimeout(() => {
    if (document.visibilityState === 'visible') {
      trackEvent({ customName: 'Engaged30s', params: { seconds: 30 } });
    }
  }, 30000);

  // Attach click tracking to all elements with [data-track-event]
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-track-event]').forEach((el) => {
      el.addEventListener('click', (event) => {
        const customName = el.getAttribute('data-track-event');
        const position = el.getAttribute('data-track-position') || 'main';
        const mapped = EVENT_MAP[customName] || { standardName: null, params: {} };

        trackEvent({
          customName,
          standardName: mapped.standardName,
          params: {
            ...mapped.params,
            button_position: position,
            destination_url: el.getAttribute('href') || '',
          },
        });

        // For same-tab links like tel:, give beacons 150ms to flush before navigating
        const href = el.getAttribute('href') || '';
        const target = el.getAttribute('target');
        if (href && !target && href.startsWith('tel:')) {
          event.preventDefault();
          setTimeout(() => {
            window.location.href = href;
          }, 150);
        }
      });
    });

    // Forward UTMs to pedidos.jetpizzas.com.br if present
    if (Object.keys(attribution).length > 0) {
      document.querySelectorAll('a[href*="pedidos.jetpizzas.com.br"]').forEach((link) => {
        try {
          const url = new URL(link.href);
          Object.entries(attribution).forEach(([k, v]) => {
            if (k.startsWith('utm_') && !url.searchParams.has(k)) {
              url.searchParams.set(k, v);
            }
          });
          link.href = url.toString();
        } catch {
          // ignore invalid URL
        }
      });
    }
  });
})();
