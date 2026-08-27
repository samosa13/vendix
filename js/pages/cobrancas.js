/* ============================================
   VendIX - Cobranças Page
   ============================================ */

async function renderCobrancas() {
    const hoje = getToday();

    // Get all pending parcelas
    const pendentes = await getParcelasPendentes();

    // Split into categories
    const atrasadas = pendentes.filter(p => p.dataVencimento < hoje);
    const paraHoje = pendentes.filter(p => p.dataVencimento === hoje);
    const proximos7 = pendentes.filter(p => {
        const diff = daysDiff(p.dataVencimento);
        return diff > 0 && diff <= 7;
    });

    // Update overdue status
    for (const p of atrasadas) {
        if (p.status !== 'atrasado') {
            await db.parcelas.update(p.id, { status: 'atrasado' });
        }
    }

    // Build client list for search
    const clienteIds = [...new Set(pendentes.map(p => p.clienteId))];
    const clientes = [];
    for (const cid of clienteIds) {
        const c = await getCliente(cid);
        if (c) clientes.push(c);
    }
    clientes.sort((a, b) => a.nome.localeCompare(b.nome));

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <!-- Client search -->
        <div class="form-group" style="margin-bottom: 12px;">
            <div class="search-dropdown" id="cob-cliente-dropdown">
                <input type="text" class="form-input" id="cob-cliente-search" placeholder="🔍 Filtrar por cliente..." autocomplete="off" 
                    oninput="filtrarDropdownCobranca()" onfocus="filtrarDropdownCobranca()" style="font-size: 13px; padding: 10px 36px 10px 12px;">
                <span onclick="filtrarCobrancasPorCliente(0)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:16px; color:var(--text-muted); display:none;" id="cob-cliente-clear">✕</span>
                <div class="dropdown-list" id="cob-cliente-dropdown-list">
                    <div class="dropdown-item" onclick="filtrarCobrancasPorCliente(0)"><strong>Todos os clientes</strong></div>
                    ${clientes.map(c => `<div class="dropdown-item" data-id="${c.id}" onclick="filtrarCobrancasPorCliente(${c.id})">${c.nome}</div>`).join('')}
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
            <button class="tab-btn active" id="tab-hoje" onclick="switchTabCobranca('hoje')">
                Hoje (${paraHoje.length + atrasadas.length})
            </button>
            <button class="tab-btn" id="tab-proximos" onclick="switchTabCobranca('proximos')">
                Próximos 7d (${proximos7.length})
            </button>
            <button class="tab-btn" id="tab-todos" onclick="switchTabCobranca('todos')">
                Todos (${pendentes.length})
            </button>
        </div>

        <div id="cobrancas-content"></div>
    `;

    // Render default tab (with filter if set)
    await renderTabCobrancaFiltered('hoje');
}

// Global filter state
window._cobFilterClienteId = 0;

function filtrarDropdownCobranca() {
    const input = document.getElementById('cob-cliente-search');
    const list = document.getElementById('cob-cliente-dropdown-list');
    const term = input.value.toLowerCase().trim();
    const items = list.querySelectorAll('.dropdown-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = (!term || text.includes(term)) ? 'block' : 'none';
    });
    list.style.display = 'block';
}

async function filtrarCobrancasPorCliente(clienteId) {
    window._cobFilterClienteId = clienteId;
    const input = document.getElementById('cob-cliente-search');
    const list = document.getElementById('cob-cliente-dropdown-list');
    const clearBtn = document.getElementById('cob-cliente-clear');
    if (clienteId === 0) {
        if (input) input.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
    } else {
        const cliente = await getCliente(clienteId);
        if (input && cliente) input.value = cliente.nome;
        if (clearBtn) clearBtn.style.display = 'block';
    }
    if (list) list.style.display = 'none';
    // Get active tab
    const activeTab = document.querySelector('.tabs .tab-btn.active');
    const tab = activeTab ? activeTab.id.replace('tab-', '') : 'hoje';
    await renderTabCobrancaFiltered(tab);
}

async function renderTabCobrancaFiltered(tab) {
    const hoje = getToday();
    const pendentes = await getParcelasPendentes();
    const filterId = window._cobFilterClienteId || 0;

    // Filter all pendentes by client if needed
    const filtered = filterId > 0 ? pendentes.filter(p => p.clienteId === filterId) : pendentes;

    // Update tab counters
    const atrasadasCount = filtered.filter(p => p.dataVencimento < hoje).length;
    const hojeCount = filtered.filter(p => p.dataVencimento === hoje).length;
    const prox7Count = filtered.filter(p => { const d = daysDiff(p.dataVencimento); return d > 0 && d <= 7; }).length;
    const tabHoje = document.getElementById('tab-hoje');
    const tabProx = document.getElementById('tab-proximos');
    const tabTodos = document.getElementById('tab-todos');
    if (tabHoje) tabHoje.textContent = `Hoje (${atrasadasCount + hojeCount})`;
    if (tabProx) tabProx.textContent = `Próximos 7d (${prox7Count})`;
    if (tabTodos) tabTodos.textContent = `Todos (${filtered.length})`;

    let items;
    if (tab === 'hoje') {
        items = filtered.filter(p => p.dataVencimento <= hoje);
    } else if (tab === 'proximos') {
        items = filtered.filter(p => { const d = daysDiff(p.dataVencimento); return d > 0 && d <= 7; });
    } else {
        items = filtered;
    }

    await renderTabCobranca(tab, items);
}

async function switchTabCobranca(tab) {
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    await renderTabCobrancaFiltered(tab);
}

async function renderTabCobranca(tab, items) {
    const container = document.getElementById('cobrancas-content');
    const hoje = getToday();

    if (items.length === 0) {
        // Still show totals if client filter is active
        const filtroAtivo = window._cobFilterClienteId > 0;
        let emptyHTML = '';
        if (filtroAtivo) {
            const allPendentes = await getParcelasPendentes();
            const allFiltered = allPendentes.filter(p => p.clienteId === window._cobFilterClienteId);
            const totalDivida = allFiltered.reduce((s, p) => s + p.valor - (p.valorPago || 0), 0);
            emptyHTML += `
                <div class="card" style="text-align: center; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-around; align-items: center;">
                        <div>
                            <div style="font-size: 11px; color: var(--text-secondary);">${tab === 'hoje' ? 'COBRAR AGORA' : tab === 'proximos' ? 'PRÓXIMOS 7D' : 'NESTA VISTA'}</div>
                            <div style="font-size: 22px; font-weight: 800; color: var(--accent);">R$ 0,00</div>
                            <div style="font-size: 11px; color: var(--text-muted);">0 parcelas</div>
                        </div>
                        <div style="width: 1px; height: 40px; background: var(--border);"></div>
                        <div>
                            <div style="font-size: 11px; color: var(--text-secondary);">DÍVIDA TOTAL</div>
                            <div style="font-size: 22px; font-weight: 800; color: var(--warning);">${formatMoney(totalDivida)}</div>
                            <div style="font-size: 11px; color: var(--text-muted);">${allFiltered.length} parcela${allFiltered.length > 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 8px;"><span onclick="filtrarCobrancasPorCliente(0)" style="color:var(--accent);cursor:pointer;">limpar filtro ✕</span></div>
                </div>
            `;
        }
        emptyHTML += `
            <div class="empty-state">
                <div class="empty-icon">${tab === 'hoje' ? '🎉' : '📅'}</div>
                <div class="empty-text">
                    ${filtroAtivo ? 'Nenhuma parcela nesta vista para este cliente' : (tab === 'hoje' ? 'Nenhuma cobrança para hoje!' : 'Nenhuma parcela pendente')}
                </div>
            </div>
        `;
        container.innerHTML = emptyHTML;
        return;
    }

    // Split into atrasadas vs hoje (only for tab 'hoje')
    const atrasadas = items.filter(p => p.dataVencimento < hoje);
    const doHoje = items.filter(p => p.dataVencimento >= hoje);

    // Sort: atrasadas first (oldest first), then by date
    atrasadas.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
    doHoje.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));

    let html = '';

    // Totals: tab total + overall debt
    const totalTab = items.reduce((s, p) => s + p.valor - (p.valorPago || 0), 0);
    const filtroAtivo = window._cobFilterClienteId > 0;

    // Get ALL pending parcelas (not just this tab) for total debt
    const allPendentes = await getParcelasPendentes();
    const allFiltered = filtroAtivo ? allPendentes.filter(p => p.clienteId === window._cobFilterClienteId) : allPendentes;
    const totalDivida = allFiltered.reduce((s, p) => s + p.valor - (p.valorPago || 0), 0);

    html += `
        <div class="card" style="text-align: center; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-around; align-items: center;">
                <div>
                    <div style="font-size: 11px; color: var(--text-secondary);">${tab === 'hoje' ? 'COBRAR AGORA' : tab === 'proximos' ? 'PRÓXIMOS 7D' : 'NESTA VISTA'}</div>
                    <div style="font-size: 22px; font-weight: 800; color: var(--accent);">${formatMoney(totalTab)}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${items.length} parcela${items.length > 1 ? 's' : ''}</div>
                </div>
                <div style="width: 1px; height: 40px; background: var(--border);"></div>
                <div>
                    <div style="font-size: 11px; color: var(--text-secondary);">DÍVIDA TOTAL</div>
                    <div style="font-size: 22px; font-weight: 800; color: var(--warning);">${formatMoney(totalDivida)}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${allFiltered.length} parcela${allFiltered.length > 1 ? 's' : ''}</div>
                </div>
            </div>
            ${filtroAtivo ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 8px; text-align: center;"><span onclick="filtrarCobrancasPorCliente(0)" style="color:var(--accent);cursor:pointer;">limpar filtro ✕</span></div>` : ''}
        </div>
    `;

    // Render atrasadas section
    if (atrasadas.length > 0 && tab === 'hoje') {
        html += `<div class="section-title" style="color: var(--danger);">🔴 Atrasadas (${atrasadas.length})</div>`;
        html += await renderCobrancaCards(atrasadas, hoje);
    }

    // Render hoje section
    if (doHoje.length > 0 && tab === 'hoje') {
        html += `<div class="section-title" style="color: var(--warning);">🟡 Vence Hoje (${doHoje.length})</div>`;
        html += await renderCobrancaCards(doHoje, hoje);
    }

    // For other tabs, render all together (grouped by year/month)
    if (tab !== 'hoje') {
        // Sort toggle
        window._cobOrdenAsc = window._cobOrdenAsc !== undefined ? window._cobOrdenAsc : true; // oldest first by default
        html += `<button class="btn btn-ghost btn-sm mb-8" onclick="toggleOrdenCobrancas()" style="width: auto; font-size: 12px;">
            ${window._cobOrdenAsc ? '📅 Mais antigas primeiro' : '📅 Mais recentes primeiro'} ↕️
        </button>`;

        items.sort((a, b) => window._cobOrdenAsc 
            ? a.dataVencimento.localeCompare(b.dataVencimento) 
            : b.dataVencimento.localeCompare(a.dataVencimento));

        // Group by year/month
        const byMonth = {};
        for (const p of items) {
            const key = p.dataVencimento.substring(0, 7); // "2026-08"
            if (!byMonth[key]) byMonth[key] = [];
            byMonth[key].push(p);
        }

        const monthKeys = Object.keys(byMonth).sort((a, b) => window._cobOrdenAsc ? a.localeCompare(b) : b.localeCompare(a));
        for (const key of monthKeys) {
            const [year, month] = key.split('-');
            const monthName = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(month)-1];
            const monthItems = byMonth[key];
            const monthTotal = monthItems.reduce((s, p) => s + p.valor - (p.valorPago || 0), 0);
            html += `
                <div class="collapse-toggle" onclick="toggleCollapse('cob-${key}')">
                    <span>${monthName} ${year} (${monthItems.length}) • ${formatMoney(monthTotal)}</span>
                    <span class="arrow">▼</span>
                </div>
                <div id="cob-${key}" class="collapse-content${monthKeys.indexOf(key) === 0 ? '' : ' hidden'}">
                    ${await renderCobrancaCards(monthItems, hoje)}
                </div>
            `;
        }
    }

    // Route suggestion
    const allItems = tab === 'hoje' ? [...atrasadas, ...doHoje] : items;
    html += await renderRotaSugerida(allItems);

    container.innerHTML = html;
}

async function renderCobrancaCards(items, hoje) {
    // Group by client
    const byClient = {};
    for (const p of items) {
        const cliente = await getCliente(p.clienteId);
        const key = p.clienteId;
        if (!byClient[key]) {
            byClient[key] = { cliente, parcelas: [] };
        }
        byClient[key].parcelas.push(p);
    }

    let html = '';
    for (const key of Object.keys(byClient)) {
        const { cliente, parcelas } = byClient[key];
        const totalCliente = parcelas.reduce((s, p) => s + p.valor - (p.valorPago || 0), 0);
        const hasAtrasado = parcelas.some(p => p.dataVencimento < hoje);

        html += `
            <div class="cobranca-card ${hasAtrasado ? 'atrasado' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                        <div class="cliente-nome">${cliente ? cliente.nome : 'Cliente'}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                            ${cliente && cliente.bairro ? '📍 ' + cliente.bairro : ''}
                            ${cliente && cliente.cidade ? (cliente.bairro ? ', ' : '📍 ') + cliente.cidade : ''}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${cliente && cliente.telefone ? `
                            <button onclick="event.stopPropagation();openWhatsAppCobranca(${cliente.id})" class="btn-whatsapp-circle">
                                <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </button>
                        ` : ''}
                        <div class="cobranca-valor" style="font-size: 18px;">${formatMoney(totalCliente)}</div>
                    </div>
                </div>

                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border);">
                    ${parcelas.map(p => {
                        const isAtrasado = p.dataVencimento < hoje;
                        const diasAtraso = isAtrasado ? Math.abs(daysDiff(p.dataVencimento)) : 0;
                        const restante = p.valor - (p.valorPago || 0);
                        // Check if earlier parcelas of same venda are unpaid
                        const hasEarlierUnpaid = parcelas.some(pp => pp.vendaId === p.vendaId && pp.numero < p.numero && pp.status !== 'pago');
                        const canPay = !hasEarlierUnpaid;
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); cursor: pointer;" onclick="if(!event.target.closest('button')){abrirDetalheVendaFrom(${p.vendaId}, 'cobrancas');}">
                                <div style="font-size: 13px; flex: 1;">
                                    ${isAtrasado ? '🔴' : '🟡'} Parcela ${p.numero} • ${formatDate(p.dataVencimento)}
                                    ${isAtrasado ? `<span style="color: var(--danger); font-size: 11px;"> (${diasAtraso}d)</span>` : ''}
                                    ${p.status === 'parcial' ? `<span style="color: var(--warning); font-size: 11px;"> (parcial)</span>` : ''}
                                </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span style="font-weight: 700; font-size: 13px;">${formatMoney(restante)}</span>
                                    <button class="btn btn-accent btn-sm" style="padding:4px 8px; font-size:10px; width:auto;${!canPay ? ' opacity:0.4; pointer-events:none;' : ''}" onclick="event.stopPropagation();pagarParcelaCobranca(${p.id})" ${!canPay ? 'disabled' : ''}>Pix</button>
                                    <button class="btn btn-ghost btn-sm" style="padding:4px 8px; font-size:10px; width:auto;${!canPay ? ' opacity:0.4; pointer-events:none;' : ''}" onclick="event.stopPropagation();pagarParcelaCobranca(${p.id}, 'dinheiro')" ${!canPay ? 'disabled' : ''}>💵</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    return html;
}

async function renderRotaSugerida(items) {
    if (configVal('mostrarRotaMaps') === false) return '';

    const byClient = {};
    for (const p of items) {
        if (!byClient[p.clienteId]) {
            byClient[p.clienteId] = await getCliente(p.clienteId);
        }
    }

    const cidades = {};
    const enderecos = [];
    for (const key of Object.keys(byClient)) {
        const c = byClient[key];
        if (c && c.bairro) {
            const zona = c.bairro + (c.cidade ? ', ' + c.cidade : '');
            cidades[zona] = (cidades[zona] || 0) + 1;
        }
        if (c) {
            let addr = '';
            if (c.endereco) addr += c.endereco + ', ';
            if (c.bairro) addr += c.bairro + ', ';
            if (c.cidade) addr += c.cidade + ', Brasil';
            if (addr) enderecos.push(addr.replace(/,\s*$/, ''));
        }
    }

    if (Object.keys(cidades).length === 0) return '';

    const rotaSugerida = Object.entries(cidades)
        .sort((a, b) => b[1] - a[1])
        .map(([zona, count]) => `${zona} (${count})`)
        .join(' → ');

    let mapsLink = '';
    if (enderecos.length > 0) {
        const waypoints = enderecos.map(e => encodeURIComponent(e)).join('/');
        mapsLink = `https://www.google.com/maps/dir/${waypoints}`;
    }

    return `
        <div class="section-title mt-16">🗺️ Sugestão de Rota</div>
        <div class="card">
            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">
                Agrupar visitas por bairro:
            </div>
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">
                ${rotaSugerida}
            </div>
            ${mapsLink ? `
                <a href="${mapsLink}" target="_blank" class="btn btn-ghost btn-sm" style="text-decoration: none; gap: 8px;">
                    <svg viewBox="0 0 92.3 132.3" width="18" height="26" style="flex-shrink:0;"><path fill="#1a73e8" d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z"/><path fill="#ea4335" d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3-21.8-18.3z"/><path fill="#4285f4" d="M46.2 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4l22.7-27C76 20.7 66.3 13.4 55.1 10.6L32.6 34.8c3.6-3.8 8.6-6.3 13.6-6.3z"/><path fill="#fbbc04" d="M46.2 63.8c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.6-8.3 4.2-11.4L4.6 68.1c5.5 12 14 22.2 22.4 32.6l32.6-38.6c-3.5 1.1-7.4 1.7-13.4 1.7z"/><path fill="#34a853" d="M59.6 57.7L27 100.7c7.5 9.2 15 18.3 17.2 22.3 2.2 3.9 2.1 6.2 2.1 9.3l28-33.3c-5.8-9.4-12.6-20.1-14.7-41.3z"/></svg>
                    Abrir Rota
                </a>
            ` : ''}
        </div>
    `;
}

async function pagarTodasCliente(clienteId, forma) {
    const hoje = getToday();
    const pendentes = await getParcelasPendentes();
    const doCliente = pendentes.filter(p => p.clienteId === clienteId && p.dataVencimento <= hoje);

    if (doCliente.length === 0) {
        showToast('Nenhuma parcela para cobrar hoje', true);
        return;
    }

    if (doCliente.length === 1) {
        await marcarParcelaPaga(doCliente[0].id, forma);
        showToast('✅ Pagamento registrado!');
        renderCobrancas();
        return;
    }

    // Multiple parcelas - ask which ones
    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">💰 Marcar como Pago</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <p style="margin-bottom: 12px; color: var(--text-secondary);">
            ${doCliente.length} parcelas pendentes. Pagar todas?
        </p>
        <div class="action-row">
            <button class="btn btn-accent" onclick="pagarTodasConfirm(${clienteId}, '${forma}', true)">
                ✅ Pagar Todas (${formatMoney(doCliente.reduce((s,p)=>s+p.valor, 0))})
            </button>
        </div>
        <button class="btn btn-ghost mt-8" onclick="pagarTodasConfirm(${clienteId}, '${forma}', false)">
            Pagar só 1 parcela (${formatMoney(doCliente[0].valor)})
        </button>
    `);
}

async function pagarTodasConfirm(clienteId, forma, todas) {
    const hoje = getToday();
    const pendentes = await getParcelasPendentes();
    const doCliente = pendentes.filter(p => p.clienteId === clienteId && p.dataVencimento <= hoje);

    if (todas) {
        for (const p of doCliente) {
            await marcarParcelaPaga(p.id, forma);
        }
        showToast(`✅ ${doCliente.length} pagamentos registrados!`);
    } else {
        await marcarParcelaPaga(doCliente[0].id, forma);
        showToast('✅ Pagamento registrado!');
    }

    closeModal();
    renderCobrancas();
}


// Pagar parcela individual from cobrancas with editable value
async function pagarParcelaCobranca(parcelaId, forma = 'pix') {
    const parcela = await db.parcelas.get(parcelaId);
    const restante = parcela.valor - (parcela.valorPago || 0);
    const formaLabel = forma === 'pix' ? '📱 Pix' : '💵 Dinheiro';

    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">💰 Registrar Pagamento</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div style="margin-bottom: 12px;">
            <div style="font-size: 13px; color: var(--text-secondary);">Parcela ${parcela.numero} • ${formaLabel}</div>
            <div style="font-size: 20px; font-weight: 800;">${formatMoney(restante)}</div>
        </div>
        <div class="form-group">
            <label class="form-label">Valor recebido (R$)</label>
            <input type="number" step="0.01" class="form-input" id="cob-pag-valor" value="${restante.toFixed(2)}" style="font-size: 18px; font-weight: 700;" inputmode="decimal">
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                Se pagou menos, mude o valor. O resto será distribuído nas próximas parcelas.
            </div>
        </div>
        <button class="btn btn-accent" style="width: 100%;" onclick="confirmarPagCobranca(${parcelaId}, '${forma}')">
            ✅ Confirmar ${formaLabel}
        </button>
    `);
}

async function confirmarPagCobranca(parcelaId, forma) {
    const parcela = await db.parcelas.get(parcelaId);
    const restante = parcela.valor - (parcela.valorPago || 0);
    const valorInput = parseFloat(document.getElementById('cob-pag-valor').value);

    if (!valorInput || valorInput <= 0) {
        showToast('Digite o valor!', true);
        return;
    }

    // If different from expected, ask confirmation
    if (valorInput < restante - 0.01) {
        const diff = restante - valorInput;
        const vendaId = parcela.vendaId;

        // Check if this is the LAST pending parcela
        const todasParcelas = await db.parcelas.where('vendaId').equals(vendaId).toArray();
        const pendentes = todasParcelas.filter(p => p.id !== parcelaId && p.status !== 'pago');
        const isUltima = pendentes.length === 0;

        if (isUltima) {
            // Last parcela underpaid → offer to extend
            openModal(`
                <div class="modal-header">
                    <h2 class="modal-title">⚠️ Última Parcela</h2>
                    <button class="modal-close" onclick="closeModal()">✕</button>
                </div>
                <div style="text-align: center; padding: 16px 0;">
                    <p style="font-size: 14px;">Esta é a última parcela mas ainda ficará um valor pendente.</p>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
                        Valor da parcela: <strong>${formatMoney(restante)}</strong><br>
                        Recebido: <strong>${formatMoney(valorInput)}</strong><br>
                        Pendente: <strong style="color: var(--danger);">${formatMoney(diff)}</strong>
                    </p>
                    <p style="font-size: 14px; margin-top: 12px; font-weight: 600;">Deseja ampliar o parcelamento?</p>
                </div>
                <div class="confirm-actions">
                    <button class="btn btn-ghost" onclick="executarPagCobranca(${parcelaId}, '${forma}', ${valorInput})">Não, encerrar assim</button>
                    <button class="btn btn-accent" onclick="ampliarParcelasCobranca(${vendaId}, ${parcelaId}, '${forma}', ${valorInput}, ${diff})">Sim, criar novas parcelas</button>
                </div>
            `);
        } else {
            openModal(`
                <div class="modal-header">
                    <h2 class="modal-title">⚠️ Confirmar</h2>
                    <button class="modal-close" onclick="closeModal()">✕</button>
                </div>
                <div style="text-align: center; padding: 16px 0;">
                    <p style="font-size: 14px;">O valor é diferente do esperado.</p>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
                        Esperado: <strong>${formatMoney(restante)}</strong><br>
                        Recebido: <strong>${formatMoney(valorInput)}</strong><br>
                        Faltou: <strong style="color: var(--danger);">${formatMoney(diff)}</strong>
                    </p>
                    <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
                        O valor pendente será distribuído nas ${pendentes.length} parcela${pendentes.length > 1 ? 's' : ''} restante${pendentes.length > 1 ? 's' : ''}.
                    </p>
                </div>
                <div class="confirm-actions">
                    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
                    <button class="btn btn-accent" onclick="executarPagCobranca(${parcelaId}, '${forma}', ${valorInput})">Confirmar</button>
                </div>
            `);
        }
    } else {
        await executarPagCobranca(parcelaId, forma, valorInput);
    }
}

// Ampliar parcelas from cobrancas
function ampliarParcelasCobranca(vendaId, parcelaId, forma, valorPago, pendente) {
    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">📋 Ampliar Parcelas</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div style="margin-bottom: 12px;">
            <div style="font-size: 13px; color: var(--text-secondary);">Valor pendente a parcelar:</div>
            <div style="font-size: 20px; font-weight: 800; color: var(--warning);">${formatMoney(pendente)}</div>
        </div>
        <div class="form-group">
            <label class="form-label">Quantas parcelas novas?</label>
            <select class="form-input" id="ampliar-cob-num-parcelas">
                ${[1,2,3,4,5,6].map(n => `<option value="${n}">${n}x de ${formatMoney(pendente/n)}</option>`).join('')}
            </select>
        </div>
        <button class="btn btn-accent mt-16" onclick="executarAmpliarParcelasCobranca(${vendaId}, ${parcelaId}, '${forma}', ${valorPago}, ${pendente})">
            ✅ Confirmar
        </button>
    `);
}

async function executarAmpliarParcelasCobranca(vendaId, parcelaId, forma, valorPago, pendente) {
    const numNovas = parseInt(document.getElementById('ampliar-cob-num-parcelas').value);

    // 1. Pay current parcela
    await marcarParcelaPaga(parcelaId, forma, valorPago);

    // 2. Get current max parcela number
    const existingParcelas = await db.parcelas.where('vendaId').equals(vendaId).toArray();
    const maxNumero = Math.max(...existingParcelas.map(p => p.numero));

    // 3. Create new parcelas
    const valorCada = Math.round((pendente / numNovas) * 100) / 100;
    const hoje = new Date();
    const venda = await db.vendas.get(vendaId);
    for (let i = 1; i <= numNovas; i++) {
        const venc = new Date(hoje);
        venc.setMonth(venc.getMonth() + i);
        await db.parcelas.add({
            vendaId: vendaId,
            clienteId: venda.clienteId,
            numero: maxNumero + i,
            valor: valorCada,
            valorPago: 0,
            dataVencimento: dateToLocalStr(venc),
            status: 'pendente'
        });
    }

    // 3. Update venda
    const allParcelas = await db.parcelas.where('vendaId').equals(vendaId).toArray();
    await db.vendas.update(vendaId, { numParcelas: allParcelas.length, status: 'ativa' });

    showToast(`✅ ${numNovas} parcela${numNovas > 1 ? 's' : ''} adicionada${numNovas > 1 ? 's' : ''}!`);
    closeModal();
    renderCobrancas();
}

async function executarPagCobranca(parcelaId, forma, valor) {
    await marcarParcelaPaga(parcelaId, forma, valor);

    closeModal();
    showToast('✅ Pagamento registrado!');
    renderCobrancas();
}


// WhatsApp from cobrancas (iOS-safe, avoids inline string escaping issues)
async function openWhatsAppCobranca(clienteId) {
    const cliente = await getCliente(clienteId);
    if (!cliente || !cliente.telefone) {
        showToast('Cliente sem telefone', true);
        return;
    }
    const msg = configVal('mensagemWhatsApp').replace('{nome}', cliente.nome);
    openWhatsApp(cliente.telefone, msg);
}

function toggleOrdenCobrancas() {
    window._cobOrdenAsc = !window._cobOrdenAsc;
    const activeTab = document.querySelector('.tabs .tab-btn.active');
    const tab = activeTab ? activeTab.id.replace('tab-', '') : 'todos';
    renderTabCobrancaFiltered(tab);
}
