(() => {
  const cfg = window.JET_TRACKING_CONFIG || {};
  const AUTH_KEY = 'jet_painel_pwd_v1';

  const EVENT_LABELS = {
    PageView: 'Visualização na página',
    ClickWhatsApp: 'Clique no WhatsApp',
    ClickCardapioSite: 'Clique no Cardápio',
    ClickAppiOS: 'Clique no App (iPhone)',
    ClickAppAndroid: 'Clique no App (Android)',
    ClickTelefoneJundiai: 'Clique no Telefone',
    ClickInstagram: 'Clique no Instagram',
    SharePage: 'Compartilhou a página',
    ShareLink: 'Compartilhou um link',
    Engaged10s: 'Ficou 10s na página',
    Engaged30s: 'Ficou 30s na página',
  };

  const state = {
    password: sessionStorage.getItem(AUTH_KEY) || '',
    groupBy: 'campaign', // 'campaign' | 'adset' | 'ad' | 'full'
    period: 'all', // 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'
    customStart: '',
    customEnd: '',
    pageVersion: '',
    deviceType: '',
    utmCampaign: '',
    utmTerm: '',
    utmContent: '',
    utmHierarchy: [],
    search: '',
    lastData: null,
    chart: null,
  };

  // DOM references
  const loginScreen = document.getElementById('login-screen');
  const dashboardApp = document.getElementById('dashboard-app');
  const loginForm = document.getElementById('login-form');
  const passwordInput = document.getElementById('password-input');
  const loginError = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');

  const refreshBtn = document.getElementById('refresh-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const lastUpdatedEl = document.getElementById('last-updated');
  const copyUtmBtn = document.getElementById('copy-utm-btn');
  const metaUtmCode = document.getElementById('meta-utm-code');

  const filterCampaign = document.getElementById('filter-campaign');
  const filterAdset = document.getElementById('filter-adset');
  const filterAd = document.getElementById('filter-ad');
  const utmSearch = document.getElementById('utm-search');
  const dateStartInput = document.getElementById('date-start');
  const dateEndInput = document.getElementById('date-end');
  const applyDatesBtn = document.getElementById('apply-dates-btn');

  function getDateRange() {
    if (state.period === 'custom' && (state.customStart || state.customEnd)) {
      const start = state.customStart
        ? new Date(`${state.customStart}T00:00:00-03:00`).toISOString()
        : new Date('2025-01-01T00:00:00.000Z').toISOString();
      const end = state.customEnd
        ? new Date(`${state.customEnd}T23:59:59-03:00`).toISOString()
        : new Date().toISOString();
      return { start, end };
    }

    const now = new Date();
    const end = now.toISOString();
    let startDate = new Date(now);

    if (state.period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (state.period === 'yesterday') {
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      const endYest = new Date(startDate);
      endYest.setHours(23, 59, 59, 999);
      return { start: startDate.toISOString(), end: endYest.toISOString() };
    } else if (state.period === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (state.period === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      startDate = new Date('2025-01-01T00:00:00.000Z');
    }

    return { start: startDate.toISOString(), end };
  }

  async function fetchAnalytics() {
    const { start, end } = getDateRange();
    const res = await fetch(`${cfg.SUPABASE_URL}/rest/v1/rpc/get_jetpizzas_analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${cfg.SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        p_password: state.password,
        p_start: start,
        p_end: end,
        p_page_version: state.pageVersion || null,
        p_device_type: state.deviceType || null,
        p_utm_campaign: state.utmCampaign || null,
        p_utm_term: state.utmTerm || null,
        p_utm_content: state.utmContent || null,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  function pct(part, total) {
    if (!total) return '0%';
    return `${((part / total) * 100).toFixed(1)}%`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function friendlyEvent(name) {
    return EVENT_LABELS[name] || name;
  }

  function renderSummary(s) {
    const pv = Number(s.total_pageviews || 0);
    const clicks = Number(s.total_clicks || 0);
    const wa = Number(s.whatsapp_clicks || 0);
    const cardapio = Number(s.cardapio_clicks || 0);
    const ios = Number(s.app_ios_clicks || 0);
    const android = Number(s.app_android_clicks || 0);
    const phone = Number(s.phone_clicks || 0);
    const insta = Number(s.instagram_clicks || 0);
    const shares = Number(s.share_clicks || 0);

    document.getElementById('kpi-visitors').textContent = Number(s.unique_visitors || 0).toLocaleString('pt-BR');
    document.getElementById('kpi-pageviews').textContent = `${pv.toLocaleString('pt-BR')} visualizações na página`;

    document.getElementById('kpi-clicks').textContent = clicks.toLocaleString('pt-BR');
    document.getElementById('kpi-ctr').textContent = `${pct(clicks, pv)} de taxa de clique`;

    document.getElementById('kpi-whatsapp').textContent = wa.toLocaleString('pt-BR');
    document.getElementById('kpi-whatsapp-pct').textContent = `${pct(wa, pv)} das visualizações`;

    document.getElementById('kpi-cardapio').textContent = cardapio.toLocaleString('pt-BR');
    document.getElementById('kpi-cardapio-pct').textContent = `${pct(cardapio, pv)} das visualizações`;

    document.getElementById('kpi-apps').textContent = (ios + android).toLocaleString('pt-BR');
    document.getElementById('kpi-apps-split').textContent = `${ios} iPhone · ${android} Android`;

    document.getElementById('kpi-phone').textContent = phone.toLocaleString('pt-BR');
    document.getElementById('kpi-social-split').textContent = `${insta} Instagram · ${shares} Compartilhamentos`;

    document.getElementById('kpi-eng10').textContent = Number(s.engaged_10s || 0).toLocaleString('pt-BR');
    document.getElementById('kpi-eng30').textContent = Number(s.engaged_30s || 0).toLocaleString('pt-BR');
  }

  function renderBreakdowns(byDevice = []) {
    const deviceEl = document.getElementById('device-breakdown');
    if (!byDevice.length) {
      deviceEl.innerHTML = '<div class="breakdown-item"><span class="breakdown-meta">Sem dados ainda</span></div>';
    } else {
      deviceEl.innerHTML = byDevice
        .map((d) => {
          const label = d.device_type === 'mobile' ? '📱 Celular' : '💻 Computador';
          return `
            <div class="breakdown-item">
              <span class="breakdown-name">${label}</span>
              <span class="breakdown-meta">
                ${d.visitors} pessoas · <strong>${d.total_clicks} cliques</strong>
              </span>
            </div>
          `;
        })
        .join('');
    }
  }

  function renderChart(byDay = []) {
    const canvas = document.getElementById('daily-chart');
    if (!canvas || typeof window.Chart !== 'function') return;

    const labels = byDay.map((d) => {
      const [, m, day] = d.day.split('-');
      return `${day}/${m}`;
    });
    const pageviews = byDay.map((d) => Number(d.pageviews || 0));
    const whatsapp = byDay.map((d) => Number(d.whatsapp || 0));
    const cardapio = byDay.map((d) => Number(d.cardapio || 0));

    if (state.chart) {
      state.chart.destroy();
    }

    state.chart = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Sem dados'],
        datasets: [
          {
            label: 'Visualizações na página',
            data: pageviews.length ? pageviews : [0],
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderColor: 'rgba(255, 255, 255, 0.42)',
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Cliques no WhatsApp',
            data: whatsapp.length ? whatsapp : [0],
            backgroundColor: '#FFF700',
            borderRadius: 6,
          },
          {
            label: 'Cliques no Cardápio',
            data: cardapio.length ? cardapio : [0],
            backgroundColor: '#38bdf8',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#c4c4d0', font: { size: 12 } },
          },
        },
        scales: {
          x: {
            ticks: { color: '#9a9aa8' },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#9a9aa8', precision: 0 },
            grid: { color: 'rgba(255,255,255,0.06)' },
          },
        },
      },
    });
  }

  function renderHierarchyFilters(hierarchy = []) {
    state.utmHierarchy = hierarchy;

    // 1. Campanhas
    const campaigns = [...new Set(hierarchy.map((h) => h.utm_campaign))].sort();
    const campOptions = ['<option value="">Todas as campanhas</option>'].concat(
      campaigns.map((c) => {
        const label = c === '(direto / sem utm)' ? 'Acesso direto (sem anúncio)' : c;
        return `<option value="${escapeHtml(c)}">${escapeHtml(label)}</option>`;
      })
    );
    filterCampaign.innerHTML = campOptions.join('');
    if (!campaigns.includes(state.utmCampaign)) state.utmCampaign = '';
    filterCampaign.value = state.utmCampaign;

    // 2. Conjuntos (filtrados pela campanha selecionada)
    const adsetRows = state.utmCampaign
      ? hierarchy.filter((h) => h.utm_campaign === state.utmCampaign)
      : hierarchy;
    const adsets = [...new Set(adsetRows.map((h) => h.utm_term).filter((t) => t && t !== '-'))].sort();
    const adsetOptions = ['<option value="">Todos os conjuntos</option>'].concat(
      adsets.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
    );
    filterAdset.innerHTML = adsetOptions.join('');
    if (!adsets.includes(state.utmTerm)) state.utmTerm = '';
    filterAdset.value = state.utmTerm;

    // 3. Anúncios (filtrados pela campanha e conjunto selecionados)
    let adRows = adsetRows;
    if (state.utmTerm) {
      adRows = adRows.filter((h) => h.utm_term === state.utmTerm);
    }
    const ads = [...new Set(adRows.map((h) => h.utm_content).filter((a) => a && a !== '-'))].sort();
    const adOptions = ['<option value="">Todos os anúncios</option>'].concat(
      ads.map((a) => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`)
    );
    filterAd.innerHTML = adOptions.join('');
    if (!ads.includes(state.utmContent)) state.utmContent = '';
    filterAd.value = state.utmContent;
  }

  // Group rows by campaign, adset, ad, or full view
  function aggregateUtmRows(rows, groupBy) {
    if (groupBy === 'full') return rows;

    const map = new Map();
    rows.forEach((r) => {
      let key = '';
      let primaryLabel = '';
      let secondaryLabel = '';

      if (groupBy === 'campaign') {
        key = r.utm_campaign;
        primaryLabel = r.utm_campaign === '(direto / sem utm)' ? 'Acesso direto (sem anúncio)' : r.utm_campaign;
      } else if (groupBy === 'adset') {
        key = `${r.utm_campaign}|||${r.utm_term}`;
        primaryLabel = r.utm_term === '-' ? '(Sem conjunto definido)' : r.utm_term;
        secondaryLabel = r.utm_campaign === '(direto / sem utm)' ? 'Acesso direto' : r.utm_campaign;
      } else if (groupBy === 'ad') {
        key = `${r.utm_campaign}|||${r.utm_term}|||${r.utm_content}`;
        primaryLabel = r.utm_content === '-' ? '(Sem anúncio definido)' : r.utm_content;
        secondaryLabel = r.utm_campaign === '(direto / sem utm)' ? 'Acesso direto' : r.utm_campaign;
      }

      const prev = map.get(key) || {
        primaryLabel,
        secondaryLabel,
        visitors: 0,
        pageviews: 0,
        whatsapp: 0,
        cardapio: 0,
        app_ios: 0,
        app_android: 0,
        phone: 0,
        total_clicks: 0,
      };

      prev.visitors += Number(r.visitors || 0);
      prev.pageviews += Number(r.pageviews || 0);
      prev.whatsapp += Number(r.whatsapp || 0);
      prev.cardapio += Number(r.cardapio || 0);
      prev.app_ios += Number(r.app_ios || 0);
      prev.app_android += Number(r.app_android || 0);
      prev.phone += Number(r.phone || 0);
      prev.total_clicks += Number(r.total_clicks || 0);
      map.set(key, prev);
    });

    return Array.from(map.values()).sort((a, b) => b.pageviews - a.pageviews || b.total_clicks - a.total_clicks);
  }

  function renderUtmTable(rows = []) {
    const thead = document.getElementById('utm-thead');
    const tbody = document.getElementById('utm-tbody');
    const q = state.search.trim().toLowerCase();

    const filteredRaw = q
      ? rows.filter((r) =>
          `${r.utm_campaign} ${r.utm_term} ${r.utm_content} ${r.utm_source} ${r.utm_medium}`
            .toLowerCase()
            .includes(q)
        )
      : rows;

    const grouped = aggregateUtmRows(filteredRaw, state.groupBy);

    if (state.groupBy === 'full') {
      thead.innerHTML = `
        <tr>
          <th>Campanha</th>
          <th>Conjunto</th>
          <th>Anúncio</th>
          <th>Origem / Local</th>
          <th class="num">Visualizações</th>
          <th class="num">WhatsApp</th>
          <th class="num">Cardápio</th>
          <th class="num">Apps</th>
          <th class="num">Telefone</th>
          <th class="num">Total Cliques</th>
          <th class="num">Taxa</th>
        </tr>
      `;
    } else {
      const colTitle =
        state.groupBy === 'campaign'
          ? 'Campanha'
          : state.groupBy === 'adset'
          ? 'Conjunto de Anúncios'
          : 'Anúncio (Criativo)';
      const extraCol = state.groupBy === 'campaign' ? '' : '<th>Campanha</th>';
      thead.innerHTML = `
        <tr>
          <th>${colTitle}</th>
          ${extraCol}
          <th class="num">Visualizações</th>
          <th class="num">WhatsApp</th>
          <th class="num">Cardápio</th>
          <th class="num">Apps</th>
          <th class="num">Telefone</th>
          <th class="num">Total Cliques</th>
          <th class="num">Taxa de Clique</th>
        </tr>
      `;
    }

    const colSpan = state.groupBy === 'full' ? 11 : state.groupBy === 'campaign' ? 8 : 9;

    if (!grouped.length) {
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="empty-cell">Nenhum dado encontrado para os filtros selecionados.</td></tr>`;
      return;
    }

    if (state.groupBy === 'full') {
      tbody.innerHTML = grouped
        .map((r) => {
          const apps = Number(r.app_ios || 0) + Number(r.app_android || 0);
          const conv = pct(Number(r.total_clicks || 0), Number(r.pageviews || 0));
          const campLabel = r.utm_campaign === '(direto / sem utm)' ? 'Acesso direto' : r.utm_campaign;
          return `
            <tr>
              <td><strong>${escapeHtml(campLabel)}</strong></td>
              <td>${escapeHtml(r.utm_term)}</td>
              <td>${escapeHtml(r.utm_content)}</td>
              <td>${escapeHtml(r.utm_source)} / ${escapeHtml(r.utm_medium)}</td>
              <td class="num">${r.pageviews}</td>
              <td class="num"><strong style="color:#FFF700">${r.whatsapp}</strong></td>
              <td class="num">${r.cardapio}</td>
              <td class="num">${apps}</td>
              <td class="num">${r.phone}</td>
              <td class="num"><strong>${r.total_clicks}</strong></td>
              <td class="num"><span class="conv-pill">${conv}</span></td>
            </tr>
          `;
        })
        .join('');
    } else {
      tbody.innerHTML = grouped
        .map((r) => {
          const apps = Number(r.app_ios || 0) + Number(r.app_android || 0);
          const conv = pct(Number(r.total_clicks || 0), Number(r.pageviews || 0));
          const extraCell = state.groupBy === 'campaign' ? '' : `<td>${escapeHtml(r.secondaryLabel)}</td>`;
          return `
            <tr>
              <td><strong>${escapeHtml(r.primaryLabel)}</strong></td>
              ${extraCell}
              <td class="num">${r.pageviews}</td>
              <td class="num"><strong style="color:#FFF700">${r.whatsapp}</strong></td>
              <td class="num">${r.cardapio}</td>
              <td class="num">${apps}</td>
              <td class="num">${r.phone}</td>
              <td class="num"><strong>${r.total_clicks}</strong></td>
              <td class="num"><span class="conv-pill">${conv}</span></td>
            </tr>
          `;
        })
        .join('');
    }
  }

  function renderDaysTable(byDay = []) {
    const tbody = document.getElementById('days-tbody');
    if (!byDay.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">Nenhuma data registrada neste período.</td></tr>';
      return;
    }

    const sortedDesc = [...byDay].reverse();
    tbody.innerHTML = sortedDesc
      .map((d) => {
        const [y, m, day] = d.day.split('-');
        const dateLabel = `${day}/${m}/${y}`;
        const conv = pct(Number(d.total_clicks || 0), Number(d.pageviews || 0));
        return `
          <tr>
            <td><strong>${dateLabel}</strong></td>
            <td class="num">${d.visitors}</td>
            <td class="num">${d.pageviews}</td>
            <td class="num"><strong style="color:#FFF700">${d.whatsapp}</strong></td>
            <td class="num">${d.cardapio}</td>
            <td class="num"><strong>${d.total_clicks}</strong></td>
            <td class="num"><span class="conv-pill">${conv}</span></td>
          </tr>
        `;
      })
      .join('');
  }

  function eventBadgeClass(name) {
    if (name === 'ClickWhatsApp') return 'badge--yellow';
    if (name === 'ClickCardapioSite') return 'badge--blue';
    if (name === 'PageView') return 'badge--neutral';
    return 'badge--green';
  }

  function renderRecentEvents(events = []) {
    const tbody = document.getElementById('recent-tbody');
    if (!events.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Nenhuma atividade registrada neste período.</td></tr>';
      return;
    }

    tbody.innerHTML = events
      .map((ev) => {
        const dt = new Date(ev.created_at).toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        const dev = ev.device_type === 'mobile' ? 'Celular' : 'Computador';
        return `
          <tr>
            <td>${dt}</td>
            <td><span class="badge ${eventBadgeClass(ev.event_name)}">${escapeHtml(friendlyEvent(ev.event_name))}</span></td>
            <td>${dev}</td>
            <td>${escapeHtml(ev.utm_campaign || 'Acesso direto')}</td>
            <td>${escapeHtml(ev.utm_content || '-')}</td>
            <td>${escapeHtml(ev.utm_source || 'Direto')}</td>
          </tr>
        `;
      })
      .join('');
  }

  function exportCsv() {
    if (!state.lastData || !state.lastData.by_utm) return;
    const headers = [
      'Campanha',
      'Conjunto',
      'Anuncio',
      'Origem',
      'Posicionamento',
      'Pessoas',
      'Visualizacoes_Pagina',
      'Cliques_WhatsApp',
      'Cliques_Cardapio',
      'Cliques_App_iPhone',
      'Cliques_App_Android',
      'Cliques_Telefone',
      'Total_Cliques',
    ];
    const keys = [
      'utm_campaign',
      'utm_term',
      'utm_content',
      'utm_source',
      'utm_medium',
      'visitors',
      'pageviews',
      'whatsapp',
      'cardapio',
      'app_ios',
      'app_android',
      'phone',
      'total_clicks',
    ];
    const lines = [headers.join(';')];
    state.lastData.by_utm.forEach((r) => {
      const vals = keys.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`);
      lines.push(vals.join(';'));
    });

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jetpizzas-jundiai-resultados.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function loadDashboard() {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Carregando...';
    try {
      const data = await fetchAnalytics();
      state.lastData = data;
      renderSummary(data.summary || {});
      renderBreakdowns(data.by_device || []);
      renderChart(data.by_day || []);
      renderHierarchyFilters(data.utm_hierarchy || []);
      renderUtmTable(data.by_utm || []);
      renderDaysTable(data.by_day || []);
      renderRecentEvents(data.recent_events || []);
      const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      lastUpdatedEl.textContent = `Atualizado às ${nowStr}`;
      return true;
    } catch (err) {
      if (String(err.message).includes('INVALID_PASSWORD')) {
        sessionStorage.removeItem(AUTH_KEY);
        state.password = '';
        dashboardApp.hidden = true;
        loginScreen.hidden = false;
        loginError.hidden = false;
      } else {
        alert(`Erro ao carregar dados: ${err.message}`);
      }
      return false;
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Atualizar';
    }
  }

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Verificando...';
    state.password = passwordInput.value;

    const ok = await loadDashboard();
    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar no Painel';

    if (ok) {
      sessionStorage.setItem(AUTH_KEY, state.password);
      loginScreen.hidden = true;
      dashboardApp.hidden = false;
    } else {
      loginError.hidden = false;
    }
  });

  // Sub-tabs (Por Campanha / Conjunto / Anúncio / Completa)
  document.querySelectorAll('.sub-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sub-tab').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.groupBy = btn.getAttribute('data-group');
      if (state.lastData) renderUtmTable(state.lastData.by_utm || []);
    });
  });

  // Period shortcuts
  document.querySelectorAll('.pill[data-period]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pill[data-period]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.period = btn.getAttribute('data-period');
      dateStartInput.value = '';
      dateEndInput.value = '';
      state.customStart = '';
      state.customEnd = '';
      loadDashboard();
    });
  });

  // Custom date range (De / Até)
  applyDatesBtn.addEventListener('click', () => {
    if (!dateStartInput.value && !dateEndInput.value) return;
    document.querySelectorAll('.pill[data-period]').forEach((b) => b.classList.remove('is-active'));
    state.period = 'custom';
    state.customStart = dateStartInput.value;
    state.customEnd = dateEndInput.value;
    loadDashboard();
  });

  filterCampaign.addEventListener('change', () => {
    state.utmCampaign = filterCampaign.value;
    state.utmTerm = '';
    state.utmContent = '';
    renderHierarchyFilters(state.utmHierarchy);
    loadDashboard();
  });

  filterAdset.addEventListener('change', () => {
    state.utmTerm = filterAdset.value;
    state.utmContent = '';
    renderHierarchyFilters(state.utmHierarchy);
    loadDashboard();
  });

  filterAd.addEventListener('change', () => {
    state.utmContent = filterAd.value;
    loadDashboard();
  });

  utmSearch.addEventListener('input', () => {
    state.search = utmSearch.value;
    if (state.lastData) renderUtmTable(state.lastData.by_utm || []);
  });

  refreshBtn.addEventListener('click', () => loadDashboard());
  exportCsvBtn.addEventListener('click', () => exportCsv());

  if (copyUtmBtn && metaUtmCode) {
    copyUtmBtn.addEventListener('click', async () => {
      const text = metaUtmCode.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const range = document.createRange();
        range.selectNodeContents(metaUtmCode);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
      }
      copyUtmBtn.textContent = 'Copiado!';
      copyUtmBtn.classList.add('is-copied');
      setTimeout(() => {
        copyUtmBtn.textContent = 'Copiar parâmetro';
        copyUtmBtn.classList.remove('is-copied');
      }, 2000);
    });
  }

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_KEY);
    state.password = '';
    passwordInput.value = '';
    dashboardApp.hidden = true;
    loginScreen.hidden = false;
  });

  // Auto-login if session password is already saved
  if (state.password) {
    loadDashboard().then((ok) => {
      if (ok) {
        loginScreen.hidden = true;
        dashboardApp.hidden = false;
      }
    });
  }
})();
