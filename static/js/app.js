'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  activeTab: 'yearly',
  topN: 10,
  filters: { years: [], customers: [], manufacturers: [], suppliers: [], reps: [] },
  options: null,
  charts: {},
  loaded: new Set(),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = {
  억(v)  { return (v / 1e8).toFixed(1) + '억'; },
  만(v)  { return (v / 1e4).toFixed(0) + '만'; },
  num(v) { return Number(v).toLocaleString('ko-KR'); },
  pct(v) { return Number(v).toFixed(2) + '%'; },
};

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => { t.className = 'toast'; }, 2800);
}

function buildQuery(extra = {}) {
  const p = new URLSearchParams();
  state.filters.years.forEach(v => p.append('years', v));
  state.filters.customers.forEach(v => p.append('customers', v));
  state.filters.manufacturers.forEach(v => p.append('manufacturers', v));
  state.filters.suppliers.forEach(v => p.append('suppliers', v));
  state.filters.reps.forEach(v => p.append('reps', v));
  Object.entries(extra).forEach(([k, v]) => p.append(k, v));
  return p.toString();
}

function destroyChart(id) {
  if (state.charts[id]) { state.charts[id].destroy(); delete state.charts[id]; }
}

function renderChart(id, options) {
  destroyChart(id);
  const el = document.getElementById(id);
  if (!el) return;
  state.charts[id] = new ApexCharts(el, options);
  state.charts[id].render();
}

function loading(html = '') {
  return html || '<div class="loading"><div class="spinner"></div></div>';
}

function section(title, id, content = '') {
  return `<div class="section"><div class="section-title">${title}</div>${content}<div class="chart-wrap" id="${id}"></div></div>`;
}

// ── API ───────────────────────────────────────────────────────────────────────
async function apiFetch(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── KPI ───────────────────────────────────────────────────────────────────────
async function loadKPI() {
  try {
    const d = await apiFetch('/api/kpi?' + buildQuery());
    document.getElementById('kpi-section').innerHTML = `
      <div class="kpi-card">
        <div><div class="kpi-label">총 매출금액</div><div class="kpi-value">${fmt.억(d.total_sales)}</div></div>
        <div><div class="kpi-label">총 이익금액</div><div class="kpi-value" style="color:var(--success)">${fmt.억(d.total_profit)}</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">평균 이익율</div>
        <div class="kpi-value">${fmt.pct(d.avg_margin)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">총 판매수량</div>
        <div class="kpi-value">${fmt.num(d.total_qty)}개</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">거래 건수</div>
        <div class="kpi-value">${fmt.num(d.total_count)}건</div>
      </div>
    `;
  } catch (e) { console.error(e); }
}

// ── Chart defaults ────────────────────────────────────────────────────────────
const COLORS = ['#6366F1','#10B981','#F59E0B','#3B82F6','#8B5CF6','#EF4444','#06B6D4','#F97316'];

function baseOpts(extra = {}) {
  return {
    chart: { toolbar: { show: false }, fontFamily: 'inherit', ...extra.chart },
    tooltip: { style: { fontSize: '12px' } },
    dataLabels: { enabled: false },
    grid: { borderColor: '#E2E8F0', strokeDashArray: 3 },
    ...extra,
  };
}

function hbarOpts(categories, values, color = COLORS[0], title = '') {
  return baseOpts({
    chart: { type: 'bar', height: Math.max(180, categories.length * 36), toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top' } } },
    colors: [color],
    series: [{ name: title, data: values.map(v => Math.round(v / 1e4)) }],
    xaxis: { categories, labels: { formatter: v => v >= 10000 ? fmt.억(v * 1e4) : fmt.만(v * 1e4) } },
    tooltip: { y: { formatter: v => fmt.num(v * 1e4) + '원' } },
    yaxis: { labels: { style: { fontSize: '11px' }, maxWidth: 140 } },
  });
}

function barOpts(categories, series, title = '') {
  return baseOpts({
    chart: { type: 'bar', height: 240, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
    colors: COLORS,
    series,
    xaxis: { categories },
    yaxis: { labels: { formatter: v => v >= 10000 ? fmt.억(v * 1e4) : v.toFixed(0) } },
    legend: { position: 'top', fontSize: '12px' },
    tooltip: { y: { formatter: v => fmt.num(v * 1e4) + '원' } },
  });
}

// ── Tab: 연도별 ───────────────────────────────────────────────────────────────
async function renderYearly() {
  const tab = document.getElementById('tab-yearly');
  tab.innerHTML = loading();
  try {
    const data = await apiFetch('/api/yearly?' + buildQuery());
    const years = data.map(r => r['연도']);
    tab.innerHTML = `
      ${section('연도별 매출 vs 이익', 'chart-year-bar')}
      ${section('연도별 평균 이익율', 'chart-year-margin')}
      <div class="section">
        <div class="section-title">연도별 상세</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>연도</th><th>건수</th><th>수량</th><th>총매출</th><th>총이익</th><th>이익율</th></tr></thead>
            <tbody>${data.map(r => `<tr>
              <td>${r['연도']}</td><td>${fmt.num(r.count)}</td><td>${fmt.num(r.qty)}</td>
              <td>${fmt.억(r.sales)}</td><td>${fmt.억(r.profit)}</td><td>${fmt.pct(r.avg_margin)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
    renderChart('chart-year-bar', baseOpts({
      chart: { type: 'bar', height: 240, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
      colors: [COLORS[0], COLORS[1]],
      series: [
        { name: '매출', data: data.map(r => Math.round(r.sales / 1e4)) },
        { name: '이익', data: data.map(r => Math.round(r.profit / 1e4)) },
      ],
      xaxis: { categories: years },
      yaxis: { labels: { formatter: v => fmt.억(v * 1e4) } },
      tooltip: { y: { formatter: v => fmt.억(v * 1e4) } },
      legend: { position: 'top' },
    }));
    renderChart('chart-year-margin', baseOpts({
      chart: { type: 'line', height: 200, toolbar: { show: false } },
      colors: [COLORS[2]],
      series: [{ name: '평균이익율', data: data.map(r => +r.avg_margin.toFixed(2)) }],
      xaxis: { categories: years },
      yaxis: { labels: { formatter: v => v.toFixed(1) + '%' } },
      markers: { size: 6 },
      stroke: { curve: 'smooth', width: 3 },
      tooltip: { y: { formatter: v => v.toFixed(2) + '%' } },
    }));
  } catch (e) { tab.innerHTML = `<div class="loading">오류: ${e.message}</div>`; }
}

// ── Tab: 매출처별 ─────────────────────────────────────────────────────────────
async function renderCustomers() {
  const tab = document.getElementById('tab-customers');
  tab.innerHTML = loading();
  try {
    const data = await apiFetch('/api/customers?' + buildQuery({ top_n: state.topN }));
    tab.innerHTML = `
      ${section('매출처 Top (실매출금액)', 'chart-cust-sales')}
      ${section('매출처 Top (실이익금액)', 'chart-cust-profit')}
      ${section('매출처 연도별 비교', 'chart-cust-year')}
    `;
    const s = data.by_sales.slice().reverse();
    renderChart('chart-cust-sales', hbarOpts(s.map(r => r['매출처']), s.map(r => r['실매출금액']), COLORS[0], '매출'));
    const p = data.by_profit.slice().reverse();
    renderChart('chart-cust-profit', hbarOpts(p.map(r => r['매출처']), p.map(r => r['실이익금액']), COLORS[1], '이익'));

    // Year comparison grouped bar
    const allYears = [...new Set(data.by_year.map(r => r['연도']))].sort();
    const allCusts = [...new Set(data.by_year.map(r => r['매출처']))];
    const ySeries = allYears.map((y, i) => ({
      name: y,
      data: allCusts.map(c => {
        const row = data.by_year.find(r => r['연도'] === y && r['매출처'] === c);
        return row ? Math.round(row['실매출금액'] / 1e4) : 0;
      }),
    }));
    renderChart('chart-cust-year', baseOpts({
      chart: { type: 'bar', height: 280, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 3, columnWidth: '70%' } },
      colors: COLORS,
      series: ySeries,
      xaxis: { categories: allCusts, labels: { rotate: -35, style: { fontSize: '10px' } } },
      yaxis: { labels: { formatter: v => fmt.억(v * 1e4) } },
      legend: { position: 'top', fontSize: '12px' },
      tooltip: { y: { formatter: v => fmt.num(v * 1e4) + '원' } },
    }));
  } catch (e) { tab.innerHTML = `<div class="loading">오류: ${e.message}</div>`; }
}

// ── Tab: 제조사·매입처별 ───────────────────────────────────────────────────────
async function renderMfr() {
  const tab = document.getElementById('tab-mfr');
  tab.innerHTML = loading();
  try {
    const data = await apiFetch('/api/manufacturers?' + buildQuery({ top_n: state.topN }));
    tab.innerHTML = `
      ${section('제조사 Top (실매출금액)', 'chart-mfr-bar')}
      ${section('매입처 Top (실매출금액)', 'chart-sup-bar')}
      ${section('제조사 매출 비중 Top 10', 'chart-mfr-pie')}
    `;
    const m = data.by_manufacturer.slice().reverse();
    renderChart('chart-mfr-bar', hbarOpts(m.map(r => r['제조사']), m.map(r => r['실매출금액']), COLORS[4], '매출'));
    const s = data.by_supplier.slice().reverse();
    renderChart('chart-sup-bar', hbarOpts(s.map(r => r['매입처']), s.map(r => r['실매출금액']), COLORS[2], '매출'));
    renderChart('chart-mfr-pie', baseOpts({
      chart: { type: 'pie', height: 280, toolbar: { show: false } },
      colors: COLORS,
      series: data.pie.map(r => Math.round(r['실매출금액'])),
      labels: data.pie.map(r => r['제조사']),
      legend: { position: 'bottom', fontSize: '11px' },
      tooltip: { y: { formatter: v => fmt.num(v) + '원' } },
    }));
  } catch (e) { tab.innerHTML = `<div class="loading">오류: ${e.message}</div>`; }
}

// ── Tab: 담당자별 ─────────────────────────────────────────────────────────────
async function renderReps() {
  const tab = document.getElementById('tab-reps');
  tab.innerHTML = loading();
  try {
    const data = await apiFetch('/api/reps?' + buildQuery({ top_n: state.topN }));
    tab.innerHTML = `
      ${section('담당자별 실매출금액', 'chart-rep-bar')}
      ${section('담당자별 매출 vs 이익', 'chart-rep-scatter')}
      ${section('담당자 연도별 비교', 'chart-rep-year')}
      <div class="section">
        <div class="section-title">담당자 상세</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>담당자</th><th>건수</th><th>총매출</th><th>총이익</th><th>이익율</th></tr></thead>
            <tbody>${data.summary.map(r => `<tr>
              <td>${r['담당자']}</td><td>${fmt.num(r.count)}</td>
              <td>${fmt.억(r.sales)}</td><td>${fmt.억(r.profit)}</td><td>${fmt.pct(r.avg_margin)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
    const top = data.top_n;
    renderChart('chart-rep-bar', baseOpts({
      chart: { type: 'bar', height: 240, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      colors: [COLORS[0]],
      series: [{ name: '매출', data: top.map(r => Math.round(r.sales / 1e4)) }],
      xaxis: { categories: top.map(r => r['담당자']), labels: { style: { fontSize: '11px' } } },
      yaxis: { labels: { formatter: v => fmt.억(v * 1e4) } },
      tooltip: { y: { formatter: v => fmt.억(v * 1e4) } },
    }));
    renderChart('chart-rep-scatter', baseOpts({
      chart: { type: 'scatter', height: 260, toolbar: { show: false } },
      colors: [COLORS[3]],
      series: [{ name: '담당자', data: data.summary.map(r => ({ x: Math.round(r.sales / 1e4), y: Math.round(r.profit / 1e4), z: r['담당자'] })) }],
      xaxis: { title: { text: '매출(만원)' }, labels: { formatter: v => fmt.억(v * 1e4) } },
      yaxis: { title: { text: '이익(만원)' }, labels: { formatter: v => fmt.억(v * 1e4) } },
      tooltip: {
        custom({ dataPointIndex }) {
          const r = data.summary[dataPointIndex];
          return `<div style="padding:8px;font-size:12px"><b>${r['담당자']}</b><br>매출: ${fmt.억(r.sales)}<br>이익: ${fmt.억(r.profit)}<br>이익율: ${fmt.pct(r.avg_margin)}</div>`;
        }
      },
    }));
    const allYears = [...new Set(data.by_year.map(r => r['연도']))].sort();
    const allReps = top.map(r => r['담당자']);
    renderChart('chart-rep-year', baseOpts({
      chart: { type: 'bar', height: 260, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 3, columnWidth: '70%' } },
      colors: COLORS,
      series: allYears.map(y => ({
        name: y,
        data: allReps.map(rep => {
          const row = data.by_year.find(r => r['연도'] === y && r['담당자'] === rep);
          return row ? Math.round(row['실매출금액'] / 1e4) : 0;
        }),
      })),
      xaxis: { categories: allReps, labels: { style: { fontSize: '11px' } } },
      yaxis: { labels: { formatter: v => fmt.억(v * 1e4) } },
      legend: { position: 'top', fontSize: '12px' },
      tooltip: { y: { formatter: v => fmt.억(v * 1e4) } },
    }));
  } catch (e) { tab.innerHTML = `<div class="loading">오류: ${e.message}</div>`; }
}

// ── Tab: 제품별 ───────────────────────────────────────────────────────────────
async function renderProducts() {
  const tab = document.getElementById('tab-products');
  tab.innerHTML = loading();
  try {
    const data = await apiFetch('/api/products?' + buildQuery({ top_n: state.topN }));
    tab.innerHTML = `
      ${section('제품 Top (실매출금액)', 'chart-prod-sales')}
      ${section('제품 Top (판매수량)', 'chart-prod-qty')}
      ${section('실이익율 분포', 'chart-prod-hist')}
      <div class="section">
        <div class="section-title">제품 검색</div>
        <input class="search-input" id="prod-search" placeholder="제품명 검색...">
        <div id="prod-search-result"></div>
      </div>
    `;
    const s = data.by_sales.slice().reverse();
    renderChart('chart-prod-sales', hbarOpts(s.map(r => r['제품명']), s.map(r => r['실매출금액']), COLORS[0], '매출'));
    const q = data.by_qty.slice().reverse();
    renderChart('chart-prod-qty', baseOpts({
      chart: { type: 'bar', height: Math.max(180, q.length * 36), toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      colors: [COLORS[1]],
      series: [{ name: '수량', data: q.map(r => r['수량']) }],
      xaxis: { categories: q.map(r => r['제품명']) },
      yaxis: { labels: { style: { fontSize: '11px' }, maxWidth: 140 } },
      tooltip: { y: { formatter: v => fmt.num(v) + '개' } },
    }));
    renderChart('chart-prod-hist', baseOpts({
      chart: { type: 'bar', height: 200, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 2, columnWidth: '90%' } },
      colors: [COLORS[4]],
      series: [{ name: '건수', data: data.margin_hist.map(r => r.y) }],
      xaxis: { categories: data.margin_hist.map(r => r.x), labels: { rotate: -45, style: { fontSize: '9px' } } },
      annotations: { xaxis: [{ x: data.margin_avg.toFixed(0) + '~', label: { text: `평균 ${fmt.pct(data.margin_avg)}`, style: { color: '#EF4444' } } }] },
    }));
    document.getElementById('prod-search').addEventListener('input', async function () {
      const q = this.value.trim();
      const res = document.getElementById('prod-search-result');
      if (!q) { res.innerHTML = ''; return; }
      try {
        const d = await apiFetch('/api/products?' + buildQuery({ search: q, top_n: state.topN }));
        if (!d.search.length) { res.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0">결과 없음</div>'; return; }
        res.innerHTML = `<div class="table-wrap"><table>
          <thead><tr><th>연도</th><th>제품명</th><th>제조사</th><th>매출처</th><th>수량</th><th>매출금액</th><th>이익율</th></tr></thead>
          <tbody>${d.search.map(r => `<tr>
            <td>${r['연도']||''}</td><td>${r['제품명']||''}</td><td>${r['제조사']||''}</td>
            <td>${r['매출처']||''}</td><td>${fmt.num(r['수량']||0)}</td>
            <td>${fmt.num(r['실매출금액']||0)}</td><td>${fmt.pct(r['실이익율']||0)}</td>
          </tr>`).join('')}</tbody>
        </table></div>`;
      } catch (e) { console.error(e); }
    });
  } catch (e) { tab.innerHTML = `<div class="loading">오류: ${e.message}</div>`; }
}

// ── Tab: 데이터 입력 ───────────────────────────────────────────────────────────
async function renderEntry() {
  const tab = document.getElementById('tab-entry');
  tab.innerHTML = loading();
  try {
    const opts = state.options || await apiFetch('/api/options');
    const sel = (name, arr) => `<select class="form-input" name="${name}">
      ${arr.map(v => `<option value="${v}">${v}</option>`).join('')}
    </select>`;
    tab.innerHTML = `
      <div class="section">
        <div class="section-title">➕ 새 거래 건 입력</div>
        <form id="entry-form">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">연도 *</label>
              <select class="form-input" name="year"><option>2025</option><option>2024</option><option>2023</option></select>
            </div>
            <div class="form-group">
              <label class="form-label">수량 *</label>
              <input class="form-input" type="number" name="qty" value="1" min="1" required>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">매입처 *</label>
            ${sel('supplier', opts.suppliers)}
          </div>
          <div class="form-group">
            <label class="form-label">매입처 직접입력 (신규)</label>
            <input class="form-input" type="text" name="new_supplier" placeholder="신규일 때만">
          </div>
          <div class="form-group">
            <label class="form-label">제조사 *</label>
            ${sel('manufacturer', opts.manufacturers)}
          </div>
          <div class="form-group">
            <label class="form-label">제조사 직접입력 (신규)</label>
            <input class="form-input" type="text" name="new_manufacturer" placeholder="신규일 때만">
          </div>
          <div class="form-group">
            <label class="form-label">매출처 *</label>
            ${sel('customer', opts.customers)}
          </div>
          <div class="form-group">
            <label class="form-label">매출처 직접입력 (신규)</label>
            <input class="form-input" type="text" name="new_customer" placeholder="신규일 때만">
          </div>
          <div class="form-group">
            <label class="form-label">재고적용처</label>
            <input class="form-input" type="text" name="inv_loc" placeholder="매출처와 같으면 비워도 됩니다">
          </div>
          <div class="form-group">
            <label class="form-label">담당자 *</label>
            ${sel('rep', opts.reps)}
          </div>
          <div class="divider"></div>
          <div class="form-group">
            <label class="form-label">제품명 *</label>
            <input class="form-input" type="text" name="product" required placeholder="필수 입력">
          </div>
          <div class="form-group">
            <label class="form-label">규격</label>
            <input class="form-input" type="text" name="spec">
          </div>
          <div class="form-group">
            <label class="form-label">보험코드</label>
            <input class="form-input" type="text" name="ins_code">
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">기준가</label>
              <input class="form-input" type="number" name="ref_price" value="0" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">매출단가</label>
              <input class="form-input" type="number" name="unit_price" value="0" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">실매출단가</label>
              <input class="form-input" type="number" name="actual_unit_price" value="0" min="0">
            </div>
            <div class="form-group">
              <label class="form-label">실매입단가</label>
              <input class="form-input" type="number" name="actual_unit_purch" value="0" min="0">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">자동 계산 미리보기</label>
            <div class="calc-preview" id="calc-preview">
              <div class="calc-row"><span>매출금액</span><span id="c-sales">0원</span></div>
              <div class="calc-row"><span>실매출금액</span><span id="c-act-sales">0원</span></div>
              <div class="calc-row"><span>실매입금액</span><span id="c-act-purch">0원</span></div>
              <div class="calc-row"><span>실이익금액</span><span id="c-profit">0원</span></div>
              <div class="calc-row"><span>실이익율</span><span id="c-margin">0%</span></div>
            </div>
          </div>
          <button type="submit" class="btn-submit">💾 저장</button>
        </form>
      </div>
    `;
    const form = document.getElementById('entry-form');
    const calc = () => {
      const d = Object.fromEntries(new FormData(form));
      const qty = +d.qty || 0;
      const sales = (+d.unit_price || 0) * qty;
      const actSales = (+d.actual_unit_price || 0) * qty;
      const actPurch = (+d.actual_unit_purch || 0) * qty;
      const profit = actSales - actPurch;
      const margin = actSales > 0 ? (profit / actSales * 100) : 0;
      document.getElementById('c-sales').textContent = fmt.num(sales) + '원';
      document.getElementById('c-act-sales').textContent = fmt.num(actSales) + '원';
      document.getElementById('c-act-purch').textContent = fmt.num(actPurch) + '원';
      document.getElementById('c-profit').textContent = fmt.num(profit) + '원';
      document.getElementById('c-margin').textContent = margin.toFixed(2) + '%';
    };
    form.addEventListener('input', calc);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      const body = {
        year: d.year,
        supplier: d.new_supplier?.trim() || d.supplier,
        manufacturer: d.new_manufacturer?.trim() || d.manufacturer,
        customer: d.new_customer?.trim() || d.customer,
        inv_loc: d.inv_loc?.trim() || '',
        product: d.product?.trim(),
        spec: d.spec?.trim() || '',
        ins_code: d.ins_code?.trim() || '',
        ref_price: +d.ref_price || 0,
        qty: +d.qty || 1,
        unit_price: +d.unit_price || 0,
        actual_unit_price: +d.actual_unit_price || 0,
        actual_unit_purch: +d.actual_unit_purch || 0,
        rep: d.rep,
      };
      if (!body.product) { showToast('제품명은 필수입니다', 'error'); return; }
      try {
        const btn = form.querySelector('.btn-submit');
        btn.disabled = true; btn.textContent = '저장 중...';
        const res = await fetch('/api/entry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(await res.text());
        const result = await res.json();
        showToast(`✅ ${body.year}년 데이터에 저장되었습니다 (순번 ${result.seq})`, 'success');
        form.reset();
        calc();
        state.loaded.clear();
        loadKPI();
      } catch (err) {
        showToast('저장 실패: ' + err.message, 'error');
      } finally {
        const btn = form.querySelector('.btn-submit');
        if (btn) { btn.disabled = false; btn.textContent = '💾 저장'; }
      }
    });
  } catch (e) { tab.innerHTML = `<div class="loading">오류: ${e.message}</div>`; }
}

// ── Tab router ────────────────────────────────────────────────────────────────
const TAB_RENDERERS = {
  yearly: renderYearly,
  customers: renderCustomers,
  mfr: renderMfr,
  reps: renderReps,
  products: renderProducts,
  entry: renderEntry,
};

function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelector(`.nav-btn[data-tab="${tab}"]`).classList.add('active');
  state.activeTab = tab;
  if (!state.loaded.has(tab)) {
    state.loaded.add(tab);
    TAB_RENDERERS[tab]();
  }
}

// ── Filter Panel ──────────────────────────────────────────────────────────────
function openFilter() {
  const overlay = document.getElementById('filter-overlay');
  overlay.classList.add('open');
  buildFilterUI();
}

function closeFilter() {
  document.getElementById('filter-overlay').classList.remove('open');
}

function buildFilterUI() {
  if (!state.options) return;
  const o = state.options;
  const f = state.filters;
  const group = (label, key, arr) => `
    <div class="filter-group">
      <div class="filter-group-label">${label}</div>
      <div class="checkbox-list">
        ${arr.map(v => `<label class="chip-label ${f[key].includes(v) ? 'checked' : ''}" data-key="${key}" data-val="${v}">
          <input type="checkbox" ${f[key].includes(v) ? 'checked' : ''}>${v}
        </label>`).join('')}
      </div>
    </div>
  `;
  document.getElementById('filter-body').innerHTML =
    group('연도', 'years', o.years) +
    group('매출처', 'customers', o.customers) +
    group('제조사', 'manufacturers', o.manufacturers) +
    group('매입처', 'suppliers', o.suppliers) +
    group('담당자', 'reps', o.reps);

  document.querySelectorAll('.chip-label').forEach(lbl => {
    lbl.addEventListener('click', () => {
      lbl.classList.toggle('checked');
    });
  });
}

function applyFilter() {
  const keys = ['years', 'customers', 'manufacturers', 'suppliers', 'reps'];
  keys.forEach(key => {
    state.filters[key] = [...document.querySelectorAll(`.chip-label.checked[data-key="${key}"]`)].map(el => el.dataset.val);
  });
  updateFilterBadge();
  closeFilter();
  state.loaded.clear();
  loadKPI();
  TAB_RENDERERS[state.activeTab]();
  state.loaded.add(state.activeTab);
}

function resetFilter() {
  state.filters = { years: [], customers: [], manufacturers: [], suppliers: [], reps: [] };
  updateFilterBadge();
  closeFilter();
  state.loaded.clear();
  loadKPI();
  TAB_RENDERERS[state.activeTab]();
  state.loaded.add(state.activeTab);
}

function updateFilterBadge() {
  const count = Object.values(state.filters).flat().length;
  const badge = document.getElementById('filter-badge');
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  // PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Load filter options
  try {
    state.options = await apiFetch('/api/options');
  } catch (e) { console.error('옵션 로드 실패', e); }

  // Load initial data
  loadKPI();
  renderYearly();
  state.loaded.add('yearly');

  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Top N
  document.getElementById('topn-select').addEventListener('change', function () {
    state.topN = +this.value;
    state.loaded.delete(state.activeTab);
    switchTab(state.activeTab);
  });

  // Filter
  document.getElementById('filter-btn').addEventListener('click', openFilter);
  document.getElementById('filter-close').addEventListener('click', closeFilter);
  document.getElementById('filter-apply').addEventListener('click', applyFilter);
  document.getElementById('filter-reset').addEventListener('click', resetFilter);
  document.getElementById('filter-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('filter-overlay')) closeFilter();
  });
}

document.addEventListener('DOMContentLoaded', init);
