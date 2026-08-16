/* ============================================
   VendIX - Vendas Page (CRUD completo)
   ============================================ */

async function renderVendas() {
    const vendas = await getVendas();

    const content = document.getElementById('app-content');

    if (vendas.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🛒</div>
                <div class="empty-text">Nenhuma venda registrada</div>
                <button class="btn btn-accent mt-16" onclick="abrirFormVenda()">
                    + Nova Venda
                </button>
            </div>
        `;
        return;
    }

setInterval    // Separate: active vendas, quitadas, incompletas, and vendas of inactive clients
    const clientesInativos = (await db.clientes.toArray()).filter(c => c.ativo === 0).map(c => c.id);
    const ativas = vendas.filter(v => v.status !== 'quitada' && v.status !== 'incompleta' && !clientesInativos.includes(v.clienteId));
    const incompletas = vendas.filter(v => v.status === 'incompleta');
    const vendasClienteInativo = vendas.filter(v => v.status !== 'quitada' && v.status !== 'incompleta' && clientesInativos.includes(v.clienteId));
    const quitadas = vendas.filter(v => v.status === 'quitada');

    // Sort by date (most recent first by default)
    window._vendasOrdenAsc = window._vendasOrdenAsc || false;
    ativas.sort((a, b) => window._vendasOrdenAsc ? a.data.localeCompare(b.data) : b.data.localeCompare(a.data));

    let listHTML = '';

    // Sort toggle button
    listHTML += `<button class="btn btn-ghost btn-sm mb-8" onclick="toggleOrdenVendas()" style="width: auto; font-size: 12px;">
        ${window._vendasOrdenAsc ? '📅 Mais antigas primeiro' : '📅 Mais recentes primeiro'} ↕️
    </button>`;

    // Cache clients
    const clienteCache = {};
    for (const v of vendas) {
        if (!clienteCache[v.clienteId]) {
            clienteCache[v.clienteId] = await getCliente(v.clienteId);
        }
    }

    // Check if grouped mode
    if (configVal('agruparVendasCliente')) {
        // Group by client
        const byClient = {};
        for (const v of ativas) {
            if (!byClient[v.clienteId]) byClient[v.clienteId] = [];
            byClient[v.clienteId].push(v);
        }

        for (const [clienteId, vendasCliente] of Object.entries(byClient)) {
            const cliente = clienteCache[clienteId];
            const totalPendente = vendasCliente.reduce((s, v) => s + v.valorTotal, 0);
            listHTML += `
                <div class="list-item" onclick="abrirVendasAgrupadas(${clienteId})" style="flex-wrap: wrap;">
                    <div class="item-icon">👤</div>
                    <div class="item-info">
                        <div class="item-name">${cliente ? cliente.nome : 'Cliente'}</div>
                        <div class="item-detail">${vendasCliente.length} venda${vendasCliente.length > 1 ? 's' : ''} ativa${vendasCliente.length > 1 ? 's' : ''}</div>
                    </div>
                    <div class="item-value">${formatMoney(totalPendente)}</div>
                </div>
            `;
        }
    } else {
        // Normal mode: group by year/month if many vendas
        if (ativas.length > 10) {
            const byMonth = {};
            for (const v of ativas) {
                const key = v.data.substring(0, 7); // "2026-08"
                if (!byMonth[key]) byMonth[key] = [];
                byMonth[key].push(v);
            }
            const monthKeys = Object.keys(byMonth).sort((a, b) => window._vendasOrdenAsc ? a.localeCompare(b) : b.localeCompare(a));
            for (const key of monthKeys) {
                const [year, month] = key.split('-');
                const monthName = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(month)-1];
                const monthVendas = byMonth[key];
                const isFirst = monthKeys.indexOf(key) === 0;
                listHTML += `
                    <div class="collapse-toggle" onclick="toggleCollapse('vendas-${key}')">
                        <span>${monthName} ${year} (${monthVendas.length})</span>
                        <span class="arrow">▼</span>
                    </div>
                    <div id="vendas-${key}" class="collapse-content${isFirst ? '' : ' hidden'}">
                `;
                for (const v of monthVendas) {
                    listHTML += await renderVendaItem(v, clienteCache[v.clienteId], false);
                }
                listHTML += `</div>`;
            }
        } else {
            // Few vendas: render flat
            for (const v of ativas) {
                listHTML += await renderVendaItem(v, clienteCache[v.clienteId], false);
            }
        }
    }

    // Render quitadas grouped by year/month
    let quitadasHTML = '';
    if (quitadas.length > 5) {
        const byMonth = {};
        for (const v of quitadas) {
            const key = v.data.substring(0, 7);
            if (!byMonth[key]) byMonth[key] = [];
            byMonth[key].push(v);
        }
        const monthKeys = Object.keys(byMonth).sort((a, b) => b.localeCompare(a)); // newest first
        for (const key of monthKeys) {
            const [year, month] = key.split('-');
            const monthName = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(month)-1];
            quitadasHTML += `
                <div class="collapse-toggle" onclick="toggleCollapse('quit-${key}')">
                    <span>${monthName} ${year} (${byMonth[key].length})</span>
                    <span class="arrow">▼</span>
                </div>
                <div id="quit-${key}" class="collapse-content hidden">
            `;
            for (const v of byMonth[key]) {
                quitadasHTML += await renderVendaItem(v, clienteCache[v.clienteId], true);
            }
            quitadasHTML += `</div>`;
        }
    } else {
        for (const v of quitadas) {
            quitadasHTML += await renderVendaItem(v, clienteCache[v.clienteId], true);
        }
    }

    content.innerHTML = `
        ${listHTML}

        ${vendasClienteInativo.length > 0 ? `
            <div class="collapse-toggle" onclick="toggleCollapse('vendas-cliente-inativo')">
                <span style="color: var(--warning);">⚠️ Vendas de Clientes Inativos (${vendasClienteInativo.length})</span>
                <span class="arrow">▼</span>
            </div>
            <div id="vendas-cliente-inativo" class="collapse-content hidden">
                ${configVal('agruparVendasCliente') ? await renderVendasAgrupadasHTML(vendasClienteInativo, clienteCache) : (await Promise.all(vendasClienteInativo.map(v => renderVendaItem(v, clienteCache[v.clienteId], true)))).join('')}
            </div>
        ` : ''}

        ${incompletas.length > 0 ? `
            <div class="collapse-toggle" onclick="toggleCollapse('vendas-incompletas')">
                <span style="color: var(--danger);">🚫 Finalizadas Incompletas (${incompletas.length})</span>
                <span class="arrow">▼</span>
            </div>
            <div id="vendas-incompletas" class="collapse-content hidden">
                ${(await Promise.all(incompletas.map(v => renderVendaItem(v, clienteCache[v.clienteId], true)))).join('')}
            </div>
        ` : ''}

        ${quitadas.length > 0 ? `
            <div class="collapse-toggle" onclick="toggleCollapse('vendas-quitadas')">
                <span>✅ Quitadas (${quitadas.length})</span>
                <span class="arrow">▼</span>
            </div>
            <div id="vendas-quitadas" class="collapse-content hidden">
                ${(await Promise.all(quitadas.map(v => renderVendaItem(v, clienteCache[v.clienteId], true)))).join('')}
            </div>
        ` : ''}

        <button class="fab" id="fab-venda" onclick="abrirFormVenda()">+</button>
    `;
}

async function renderVendaItem(v, cliente, isQuitada) {
    const parcelas = await getParcelasByVenda(v.id);
    const pagas = parcelas.filter(p => p.status === 'pago').length;
    const total = parcelas.length;
    const progress = total > 0 ? (pagas / total) * 100 : 0;

    // Calculate pending for incompleta
    const totalPago = parcelas.filter(p => p.status === 'pago').reduce((s, p) => s + (p.valorPago || p.valor), 0) + (v.valorEntrada || 0);
    const pendente = v.valorTotal - totalPago;

    const statusBadge = v.status === 'quitada'
        ? '<span class="badge badge-green">QUITADA</span>'
        : v.status === 'incompleta'
        ? `<span class="badge" style="background:var(--danger);color:#fff;">PEND ${formatMoney(pendente)}</span>`
        : `<span class="badge badge-orange">${pagas}/${total}</span>`;

    return `
        <div class="list-item ${isQuitada ? 'quitada' : ''}" onclick="abrirDetalheVenda(${v.id})" style="flex-wrap: wrap;">
            <div class="item-icon">🛒</div>
            <div class="item-info">
                <div class="item-name">${cliente ? cliente.nome : 'Cliente desconhecido'}</div>
                <div class="item-detail">
                    ${formatDate(v.data)} • ${v.tipo === 'vista' ? 'À vista' : v.numParcelas + 'x'}
                    ${v.descricao ? ' • ' + v.descricao : ''}
                </div>
            </div>
            <div style="text-align: right;">
                <div class="item-value">${formatMoney(v.valorTotal)}</div>
                ${statusBadge}
            </div>
            ${!isQuitada && v.status !== 'quitada' && total > 0 ? `
                <div class="parcela-progress" style="width: 100%; margin-top: 8px;">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
            ` : ''}
        </div>
    `;
}

async function abrirFormVenda() {
    const clientes = await getClientes();
    const produtos = await db.produtos.toArray(); // Include inactive (shown as disabled)

    if (clientes.length === 0) {
        showToast('Cadastre um cliente primeiro!', true);
        navigateTo('clientes');
        return;
    }

    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">Nova Venda</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>

        <div class="form-group">
            <label class="form-label">Cliente</label>
            <div class="search-dropdown" id="cliente-dropdown">
                <input type="text" class="form-input" id="venda-cliente-input" placeholder="🔍 Digitar nome do cliente..." autocomplete="off" oninput="filtrarDropdown('cliente')" onfocus="filtrarDropdown('cliente')">
                <div class="dropdown-list" id="cliente-dropdown-list">
                    ${clientes.map(c => `<div class="dropdown-item" data-id="${c.id}" onclick="selecionarDropdown('cliente', ${c.id}, '${c.nome.replace(/'/g,"\\'")}')"><strong>${c.nome}</strong><span style="font-size:11px; color:var(--text-muted);"> ${c.bairro || ''}, ${c.cidade || ''}</span></div>`).join('')}
                </div>
            </div>
            <input type="hidden" id="venda-cliente" value="">
        </div>

        <!-- Multi-product section -->
        <div class="form-group">
            <label class="form-label">Produtos</label>
            <div id="venda-itens-lista"></div>
            <div class="search-dropdown" id="produto-dropdown">
                <input type="text" class="form-input" id="venda-produto-input" placeholder="🔍 Adicionar produto..." autocomplete="off" oninput="filtrarDropdown('produto')" onfocus="filtrarDropdown('produto')" style="font-size: 13px;">
                <div class="dropdown-list" id="produto-dropdown-list">
                    ${produtos.filter(p => p.ativo !== 0 && (p.estoque || 0) > 0).map(p => `<div class="dropdown-item" data-id="${p.id}" data-vista="${p.precoVista}" data-prazo="${p.precoPrazo}" data-nome="${p.nome.replace(/"/g,'&quot;')}" onclick="adicionarProdutoVenda(${p.id}, '${p.nome.replace(/'/g,"\\'")}', ${p.precoVista}, ${p.precoPrazo})"><strong>${p.nome}</strong><span style="font-size:11px; color:var(--text-muted);"> Est: ${p.estoque} • ${formatMoney(p.precoPrazo)}</span></div>`).join('')}
                </div>
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">Descrição da Venda</label>
            <input type="text" class="form-input" id="venda-descricao" placeholder="Ex: Jogo de panelas + frigideira">
        </div>

        <div class="form-group">
            <label class="form-label">Valor Total (R$)</label>
            <input type="number" step="0.01" class="form-input" id="venda-valor" placeholder="0,00" style="font-size: 20px; font-weight: 700;" oninput="calcularPreview()">
        </div>

        <!-- Tipo de venda -->
        <div class="tabs mt-16 mb-16">
            <button class="tab-btn" id="tab-vista" onclick="selectTipoVenda('vista')">À Vista</button>
            <button class="tab-btn active" id="tab-parcelado" onclick="selectTipoVenda('parcelado')">Parcelado</button>
        </div>

        <div id="opcoes-parcelado">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Nº Parcelas</label>
                    <select class="form-input" id="venda-parcelas" onchange="calcularPreview()">
                        ${[2,3,4,5,6,8,10,12,15,18,24,36].map(n => `<option value="${n}" ${n === configVal('parcelasPadrao') ? 'selected' : ''}>${n}x</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Juros % / mês</label>
                    <input type="number" step="0.1" class="form-input" id="venda-juros" value="${configVal('jurosPadrao')}" placeholder="0" onchange="calcularPreview()">
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Entrada (R$)</label>
                <input type="number" step="0.01" class="form-input" id="venda-entrada" value="0" placeholder="0,00" onchange="calcularPreview()">
            </div>

            <div id="preview-parcelas" class="card" style="display:none;"></div>
        </div>

        <button class="btn btn-accent mt-16" onclick="salvarVenda()">
            ✅ Registrar Venda
        </button>
    `);

    // Default to parcelado
    window._tipoVenda = 'parcelado';
    window._vendaItens = []; // Multi-product list
}

// selectTipoVenda updates price when switching vista/parcelado
function selectTipoVenda(tipo) {
    window._tipoVenda = tipo;
    document.getElementById('tab-vista').classList.toggle('active', tipo === 'vista');
    document.getElementById('tab-parcelado').classList.toggle('active', tipo === 'parcelado');
    document.getElementById('opcoes-parcelado').style.display = tipo === 'parcelado' ? 'block' : 'none';

    // Recalculate with new prices (vista vs prazo) for all items
    if (window._vendaItens && window._vendaItens.length > 0) {
        renderItensVenda();
        atualizarValorTotalVenda();
    }
    calcularPreview();
}

function preencherPreco() {
    // Legacy - no longer used with custom dropdown
}

// ============ CUSTOM SEARCH DROPDOWN ============

function filtrarDropdown(tipo) {
    const input = document.getElementById(`venda-${tipo}-input`);
    const list = document.getElementById(`${tipo}-dropdown-list`);
    const term = input.value.toLowerCase().trim();
    const items = list.querySelectorAll('.dropdown-item');
    let visibleCount = 0;

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const match = !term || text.includes(term);
        item.style.display = match ? 'block' : 'none';
        if (match) visibleCount++;
    });

    list.style.display = visibleCount > 0 ? 'block' : 'none';
}

function selecionarDropdown(tipo, id, nome) {
    const input = document.getElementById(`venda-${tipo}-input`);
    const hidden = document.getElementById(`venda-${tipo}`);
    const list = document.getElementById(`${tipo}-dropdown-list`);
    input.value = nome;
    hidden.value = id;
    list.style.display = 'none';
}

function selecionarDropdownProduto(id, nome, precoVista, precoPrazo) {
    // Legacy - replaced by adicionarProdutoVenda for multi-product
    adicionarProdutoVenda(id, nome, precoVista, precoPrazo);
}

function adicionarProdutoVenda(id, nome, precoVista, precoPrazo) {
    const input = document.getElementById('venda-produto-input');
    const list = document.getElementById('produto-dropdown-list');
    input.value = '';
    list.style.display = 'none';

    // Check if already added
    if (window._vendaItens.find(it => it.produtoId === id)) {
        showToast('Produto já adicionado!', true);
        return;
    }

    const tipo = window._tipoVenda;
    const preco = tipo === 'vista' ? precoVista : precoPrazo;

    window._vendaItens.push({ produtoId: id, nome, precoVista, precoPrazo, quantidade: 1, preco });
    renderItensVenda();
    atualizarValorTotalVenda();
    calcularPreview();
}

function removerProdutoVenda(idx) {
    window._vendaItens.splice(idx, 1);
    renderItensVenda();
    atualizarValorTotalVenda();
    calcularPreview();
}

function renderItensVenda() {
    const container = document.getElementById('venda-itens-lista');
    if (!container) return;
    if (window._vendaItens.length === 0) {
        container.innerHTML = '';
        return;
    }
    const tipo = window._tipoVenda;
    container.innerHTML = window._vendaItens.map((it, idx) => {
        const preco = tipo === 'vista' ? it.precoVista : it.precoPrazo;
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:var(--bg-input); border-radius:6px; margin-bottom:4px; font-size:13px;">
                <span style="flex:1;">${it.nome}</span>
                <span style="font-weight:700; margin:0 8px;">${formatMoney(preco)}</span>
                <button onclick="removerProdutoVenda(${idx})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:16px; padding:2px 6px;">✕</button>
            </div>
        `;
    }).join('');
}

function atualizarValorTotalVenda() {
    const tipo = window._tipoVenda;
    const total = window._vendaItens.reduce((s, it) => s + (tipo === 'vista' ? it.precoVista : it.precoPrazo), 0);
    document.getElementById('venda-valor').value = total > 0 ? total.toFixed(2) : '';
    // Update descricao
    if (window._vendaItens.length > 0) {
        document.getElementById('venda-descricao').value = window._vendaItens.map(it => it.nome).join(' + ');
    }
}

// Close dropdowns on outside click
document.addEventListener('click', function(e) {
    const dropdowns = document.querySelectorAll('.dropdown-list');
    dropdowns.forEach(d => {
        if (!d.parentElement.contains(e.target)) {
            d.style.display = 'none';
        }
    });
});

function calcularPreview() {
    const valor = parseFloat(document.getElementById('venda-valor').value) || 0;
    const numParcelas = parseInt(document.getElementById('venda-parcelas').value) || 1;
    const juros = parseFloat(document.getElementById('venda-juros').value) || 0;
    const entrada = parseFloat(document.getElementById('venda-entrada').value) || 0;

    if (valor <= 0) {
        document.getElementById('preview-parcelas').style.display = 'none';
        return;
    }

    const parcelas = calcularParcelas(valor, numParcelas, juros, getToday(), entrada);
    const totalPagar = entrada + parcelas.reduce((s, p) => s + p.valor, 0);

    const preview = document.getElementById('preview-parcelas');
    preview.style.display = 'block';
    preview.innerHTML = `
        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">
            ${entrada > 0 ? `Entrada: <strong>${formatMoney(entrada)}</strong> + ` : ''}
            <strong>${numParcelas}x ${formatMoney(parcelas[0]?.valor || 0)}</strong>
            ${juros > 0 ? ` (${juros}% a.m.)` : ''}
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">
            Total: ${formatMoney(totalPagar)}
            ${juros > 0 ? ` • Juros: ${formatMoney(totalPagar - valor)}` : ''}
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
            1ª parcela: ${formatDate(parcelas[0]?.dataVencimento)}
        </div>
    `;
}

async function salvarVenda() {
    // Get client from hidden field (set by dropdown selection)
    const clienteId = parseInt(document.getElementById('venda-cliente').value);
    if (!clienteId) {
        showToast('Selecione um cliente!', true);
        return;
    }

    const valor = parseFloat(document.getElementById('venda-valor').value);
    if (!valor || valor <= 0) {
        showToast('Digite o valor da venda!', true);
        return;
    }

    const tipo = window._tipoVenda;
    const descricao = document.getElementById('venda-descricao').value.trim();

    // Multi-product items
    const itens = (window._vendaItens || []).map(it => ({ produtoId: it.produtoId, quantidade: it.quantidade || 1 }));

    // Check stock for all items
    for (const item of itens) {
        const produto = await db.produtos.get(item.produtoId);
        if (produto && (produto.estoque || 0) < item.quantidade) {
            showToast(`⚠️ ${produto.nome} sem estoque!`, true);
            return;
        }
    }

    let parcelas = [];
    let numParcelas = 1;
    let taxaJuros = 0;
    let valorEntrada = 0;

    if (tipo === 'parcelado') {
        numParcelas = parseInt(document.getElementById('venda-parcelas').value);
        taxaJuros = parseFloat(document.getElementById('venda-juros').value) || 0;
        valorEntrada = parseFloat(document.getElementById('venda-entrada').value) || 0;
        parcelas = calcularParcelas(valor, numParcelas, taxaJuros, getToday(), valorEntrada);
    } else {
        // À vista = 1 parcela paid immediately
        parcelas = [{
            numero: 1,
            valor: valor,
            dataVencimento: getToday(),
            status: 'pago',
            dataPagamento: getToday(),
            formaPagamento: 'dinheiro'
        }];
    }

    const venda = {
        clienteId,
        data: getToday(),
        descricao,
        itens: itens,
        valorTotal: valor,
        tipo,
        numParcelas,
        taxaJuros,
        valorEntrada
    };

    await addVenda(venda, parcelas);
    showToast('✅ Venda registrada!');
    closeModal();
    renderVendas();
}

// ============ DETALLE DE VENDA ============

// Track where user came from (for back navigation)
window._vendaDetailOrigin = null;

function abrirDetalheVendaFrom(id, origin) {
    window._vendaDetailOrigin = origin || null;
    abrirDetalheVenda(id);
}

function voltarDeDetalheVenda() {
    closeModal();
    if (window._vendaDetailOrigin === 'cobrancas') {
        navigateTo('cobrancas');
        // Re-apply filter after navigation
        setTimeout(() => {
            if (window._cobFilterClienteId > 0) {
                filtrarCobrancasPorCliente(window._cobFilterClienteId);
            }
        }, 400);
    }
    window._vendaDetailOrigin = null;
}

async function abrirDetalheVenda(id) {
    const venda = await getVenda(id);
    if (!venda) return;

    const cliente = await getCliente(venda.clienteId);
    const parcelas = await getParcelasByVenda(id);
    parcelas.sort((a, b) => a.numero - b.numero);

    const pagas = parcelas.filter(p => p.status === 'pago').length;
    const hoje = getToday();

    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">🛒 Venda #${id}</h2>
            <button class="modal-close" onclick="${window._vendaDetailOrigin ? 'voltarDeDetalheVenda()' : 'closeModal()'}">✕</button>
        </div>

        <div class="card">
            <div style="font-size: 13px; color: var(--text-secondary);">Cliente</div>
            <div style="font-size: 16px; font-weight: 700;">${cliente ? cliente.nome : '-'}</div>
            ${venda.descricao ? `<div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">${venda.descricao}</div>` : ''}
            <div style="margin-top: 8px; font-size: 13px; color: var(--text-secondary);">
                📅 ${formatDate(venda.data)} • ${venda.tipo === 'vista' ? 'À vista' : venda.numParcelas + 'x'} 
                ${venda.taxaJuros > 0 ? '• ' + venda.taxaJuros + '% juros' : '• sem juros'}
            </div>
            <div style="margin-top: 8px; font-size: 22px; font-weight: 800; color: var(--accent);">
                ${formatMoney(venda.valorTotal)}
            </div>
            ${venda.valorEntrada > 0 ? `
                <div style="margin-top: 4px; font-size: 13px; color: var(--text-secondary);">
                    Entrada: ${formatMoney(venda.valorEntrada)} (já pago)
                </div>
            ` : ''}
            <div style="margin-top: 4px; font-size: 14px; font-weight: 700; color: var(--warning);">
                Pendente: ${formatMoney(venda.valorTotal - (venda.valorEntrada || 0) - parcelas.filter(p => p.status === 'pago').reduce((s,p) => s + (p.valorPago || p.valor), 0))}
            </div>
        </div>

        <div class="section-title">📋 Parcelas (${pagas}/${parcelas.length} pagas)</div>

        ${venda.status === 'incompleta' ? `
            <div class="card" style="border-left: 4px solid var(--danger); margin-bottom: 12px;">
                <div style="font-size: 13px; color: var(--danger); font-weight: 600;">
                    ⚠️ Venda incompleta — foi encerrada com valor pendente
                </div>
                <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-accent btn-sm" style="width:auto; font-size:11px;" onclick="ampliarParcelasManual(${id})">+ Adicionar Parcelas</button>
                    <button class="btn btn-ghost btn-sm" style="width:auto; font-size:11px;" onclick="fecharVendaDefinitivo(${id})">Encerrar como quitada</button>
                </div>
            </div>
        ` : ''}

        ${parcelas.map((p, idx) => {
            const isAtrasado = p.status === 'pendente' && p.dataVencimento < hoje;
            const isParcial = p.status === 'parcial';
            const statusIcon = p.status === 'pago' ? '✅' : (isParcial ? '🟠' : (isAtrasado ? '🔴' : '🟡'));
            const restante = p.valor - (p.valorPago || 0);
            const pagouMenos = p.status === 'pago' && p.valorPago && p.valorPago < p.valor - 0.01;
            const isQuitada = venda.status === 'quitada';
            // Check if there are earlier unpaid parcelas (must pay in order)
            const hasEarlierUnpaid = parcelas.some(pp => pp.numero < p.numero && pp.status !== 'pago');
            const canPay = !hasEarlierUnpaid;

            return `
                <div class="venda-item">
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${statusIcon} Parcela ${p.numero}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            Venc: ${formatDate(p.dataVencimento)}
                            ${p.dataPagamento ? ' • Pago: ' + formatDate(p.dataPagamento) : ''}
                            ${isParcial ? ' • Pago parcial: ' + formatMoney(p.valorPago) : ''}
                            ${pagouMenos ? ' • Recebido: ' + formatMoney(p.valorPago) + ' (resto distribuído)' : ''}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 700; ${p.status === 'pago' ? 'color: var(--accent)' : isAtrasado ? 'color: var(--danger)' : ''}">
                            ${p.status === 'pago' ? formatMoney(p.valorPago || p.valor) : formatMoney(restante)}
                        </div>
                        ${pagouMenos ? `<div style="font-size: 10px; color: var(--text-muted); text-decoration: line-through;">${formatMoney(p.valor)}</div>` : ''}
                        ${p.status !== 'pago' && !isQuitada ? `
                            <div style="display: flex; gap: 4px; margin-top: 4px; justify-content: flex-end;">
                                <button class="btn btn-accent btn-sm" style="padding: 6px 10px; font-size: 11px; width: auto;${!canPay ? ' opacity:0.4; pointer-events:none;' : ''}" 
                                    onclick="pagarParcelaVenda(${p.id})" ${!canPay ? 'disabled' : ''}>Pagar</button>
                                <button class="btn btn-ghost btn-sm" style="padding: 6px 10px; font-size: 11px; width: auto;${!canPay ? ' opacity:0.4; pointer-events:none;' : ''}" 
                                    onclick="editarValorParcelaUI(${p.id}, ${restante}, ${id})" ${!canPay ? 'disabled' : ''}>✏️</button>
                                <button class="btn btn-ghost btn-sm" style="padding: 6px 10px; font-size: 11px; width: auto;${!canPay ? ' opacity:0.4; pointer-events:none;' : ''}" 
                                    onclick="editarDataParcelaUI(${p.id}, '${p.dataVencimento}', ${id})" ${!canPay ? 'disabled' : ''}>📅</button>
                            </div>
                        ` : ''}
                        ${p.status === 'pago' && isQuitada ? `
                            <button class="btn btn-ghost btn-sm" style="padding: 4px 8px; font-size: 10px; width: auto; margin-top: 4px; color: var(--text-muted);" 
                                onclick="desfazerPagamento(${p.id}, ${id})">↩️ Desfazer</button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('')}

        <!-- Action buttons -->
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border);">
            <button class="btn btn-ghost mb-8" onclick="enviarComprovante(${id})">
                📲 Enviar Comprovante por WhatsApp
            </button>
            ${venda.status !== 'quitada' ? `
                <button class="btn btn-ghost mb-8" onclick="closeModal(); abrirEditarVenda(${id})">
                    ✏️ Editar Venda
                </button>
            ` : ''}
            ${venda.status !== 'quitada' && venda.status !== 'incompleta' ? `
                <button class="btn btn-ghost" onclick="confirmarCancelarVenda(${id})" style="color: var(--danger);">
                    ❌ Cancelar Venda
                </button>
            ` : ''}
        </div>
    `);
}

// ============ EDITAR VENDA ============

async function abrirEditarVenda(id) {
    const venda = await getVenda(id);
    if (!venda) return;

    const cliente = await getCliente(venda.clienteId);
    const clientes = await getClientes();
    const parcelas = await getParcelasByVenda(id);
    const pagas = parcelas.filter(p => p.status === 'pago');
    const jaPago = pagas.reduce((sum, p) => sum + p.valor, 0);

    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">✏️ Editar Venda #${id}</h2>
            <button class="modal-close" onclick="abrirDetalheVenda(${id})">✕</button>
        </div>

        ${pagas.length > 0 ? `
            <div class="card" style="border-left: 4px solid var(--info); margin-bottom: 16px;">
                <div style="font-size: 13px; color: var(--text-secondary);">
                    ℹ️ ${pagas.length} parcela${pagas.length > 1 ? 's' : ''} já paga${pagas.length > 1 ? 's' : ''} (${formatMoney(jaPago)}).
                    As parcelas pendentes serão recalculadas.
                </div>
            </div>
        ` : ''}

        <div class="form-group">
            <label class="form-label">Cliente</label>
            <select class="form-input" id="edit-venda-cliente">
                ${clientes.map(c => `<option value="${c.id}" ${c.id === venda.clienteId ? 'selected' : ''}>${c.nome}</option>`).join('')}
            </select>
        </div>

        <div class="form-group">
            <label class="form-label">Descrição</label>
            <input type="text" class="form-input" id="edit-venda-descricao" value="${venda.descricao || ''}" placeholder="Descrição da venda">
        </div>

        <div class="form-group">
            <label class="form-label">Valor Total (R$)</label>
            <input type="number" step="0.01" class="form-input" id="edit-venda-valor" value="${venda.valorTotal}" style="font-size: 18px; font-weight: 700;">
        </div>

        ${venda.tipo === 'parcelado' ? `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Nº Parcelas Total</label>
                    <select class="form-input" id="edit-venda-parcelas">
                        ${[2,3,4,5,6,8,10,12,15,18,24,36].map(n => `<option value="${n}" ${n === venda.numParcelas ? 'selected' : ''}>${n}x</option>`).join('')}
                    </select>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                        Aumente para adicionar mais parcelas (redistribui o pendente)
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Juros % / mês</label>
                    <input type="number" step="0.1" class="form-input" id="edit-venda-juros" value="${venda.taxaJuros || 0}">
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">Entrada (R$)</label>
                <input type="number" step="0.01" class="form-input" id="edit-venda-entrada" value="${venda.valorEntrada || 0}">
            </div>
        ` : ''}

        <button class="btn btn-accent mt-16" onclick="salvarEdicaoVenda(${id}, '${venda.tipo}')">
            ✅ Salvar Alterações
        </button>
    `);
}

async function salvarEdicaoVenda(id, tipo) {
    const valor = parseFloat(document.getElementById('edit-venda-valor').value);
    if (!valor || valor <= 0) {
        showToast('Digite o valor!', true);
        return;
    }

    const changes = {
        clienteId: parseInt(document.getElementById('edit-venda-cliente').value),
        descricao: document.getElementById('edit-venda-descricao').value.trim(),
        valorTotal: valor
    };

    if (tipo === 'parcelado') {
        changes.numParcelas = parseInt(document.getElementById('edit-venda-parcelas').value);
        changes.taxaJuros = parseFloat(document.getElementById('edit-venda-juros').value) || 0;
        changes.valorEntrada = parseFloat(document.getElementById('edit-venda-entrada').value) || 0;
    }

    await editarVenda(id, changes);
    showToast('✅ Venda atualizada!');
    closeModal();
    abrirDetalheVenda(id);
}

// ============ CANCELAR VENDA ============

function confirmarCancelarVenda(id) {
    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">❌ Cancelar Venda</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div style="padding: 16px 0; text-align: center;">
            <div style="font-size: 40px; margin-bottom: 12px;">⚠️</div>
            <p style="font-size: 15px; margin-bottom: 8px;">
                Tem certeza que quer cancelar esta venda?
            </p>
            <p style="font-size: 13px; color: var(--text-secondary);">
                As parcelas pendentes serão removidas.<br>
                O estoque será devolvido.<br>
                Parcelas já pagas ficam como registro.
            </p>
        </div>
        <div class="confirm-actions">
            <button class="btn btn-ghost" onclick="closeModal(); abrirDetalheVenda(${id})">Voltar</button>
            <button class="btn btn-danger" onclick="executarCancelamento(${id})">Cancelar Venda</button>
        </div>
    `);
}

async function executarCancelamento(id) {
    await cancelarVenda(id);
    showToast('Venda cancelada');
    closeModal();
    renderVendas();
}

// ============ PAGAR PARCELA ============

async function pagarParcelaVenda(parcelaId) {
    const parcela = await db.parcelas.get(parcelaId);
    const restante = parcela.valor - (parcela.valorPago || 0);
    const vendaId = parcela.vendaId;

    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">💰 Registrar Pagamento</h2>
            <button class="modal-close" onclick="abrirDetalheVenda(${vendaId})">✕</button>
        </div>
        <div style="margin-bottom: 16px;">
            <div style="font-size: 13px; color: var(--text-secondary);">Valor da parcela</div>
            <div style="font-size: 20px; font-weight: 800;">${formatMoney(restante)}</div>
            ${(parcela.valorPago || 0) > 0 ? `<div style="font-size: 12px; color: var(--accent);">Já pago anteriormente: ${formatMoney(parcela.valorPago)}</div>` : ''}
        </div>
        <div class="form-group">
            <label class="form-label">Valor recebido agora (R$)</label>
            <input type="number" step="0.01" class="form-input" id="pag-valor" value="${restante}" style="font-size: 18px; font-weight: 700;" inputmode="decimal">
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                Se o cliente pagou menos, digite o valor que recebeu
            </div>
        </div>
        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">Como pagou?</div>
        <div class="action-row">
            <button class="btn btn-accent" onclick="confirmarPagamentoValor(${parcelaId}, 'pix')">
                📱 Pix
            </button>
            <button class="btn btn-ghost" onclick="confirmarPagamentoValor(${parcelaId}, 'dinheiro')">
                💵 Dinheiro
            </button>
        </div>
    `);
}

async function confirmarPagamentoValor(parcelaId, forma) {
    const valorInput = parseFloat(document.getElementById('pag-valor').value);
    if (!valorInput || valorInput <= 0) {
        showToast('Digite o valor recebido!', true);
        return;
    }
    const parcela = await db.parcelas.get(parcelaId);
    const restante = parcela.valor - (parcela.valorPago || 0);

    // If paying less than expected, ask confirmation
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
                    <button class="modal-close" onclick="abrirDetalheVenda(${vendaId})">✕</button>
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
                    <button class="btn btn-ghost" onclick="executarPagamentoVenda(${parcelaId}, '${forma}', ${valorInput})">Não, encerrar assim</button>
                    <button class="btn btn-accent" onclick="ampliarParcelasUI(${vendaId}, ${parcelaId}, '${forma}', ${valorInput}, ${diff})">Sim, criar novas parcelas</button>
                </div>
            `);
        } else {
            // Not last → confirm redistribution
            openModal(`
                <div class="modal-header">
                    <h2 class="modal-title">⚠️ Confirmar</h2>
                    <button class="modal-close" onclick="abrirDetalheVenda(${vendaId})">✕</button>
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
                    <button class="btn btn-ghost" onclick="abrirDetalheVenda(${vendaId})">Cancelar</button>
                    <button class="btn btn-accent" onclick="executarPagamentoVenda(${parcelaId}, '${forma}', ${valorInput})">Confirmar</button>
                </div>
            `);
        }
    } else {
        // Paying full or more — execute directly
        await executarPagamentoVenda(parcelaId, forma, valorInput);
    }
}

async function executarPagamentoVenda(parcelaId, forma, valor) {
    const parcelaBefore = await db.parcelas.get(parcelaId);
    const restante = parcelaBefore.valor - (parcelaBefore.valorPago || 0);
    const vendaId = parcelaBefore.vendaId;

    await marcarParcelaPaga(parcelaId, forma, valor);

    // If this was the last parcela AND underpaid, mark venda as 'incompleta'
    const todasParcelas = await db.parcelas.where('vendaId').equals(vendaId).toArray();
    const pendentes = todasParcelas.filter(p => p.status !== 'pago');
    if (pendentes.length === 0 && valor < restante - 0.01) {
        await db.vendas.update(vendaId, { status: 'incompleta' });
    }

    showToast('✅ Pagamento registrado!');
    closeModal();
    // Re-render vendas list first, then open detail on top
    await renderVendas();
    abrirDetalheVenda(vendaId);
}

// Ampliar parcelas when last one is underpaid
function ampliarParcelasUI(vendaId, parcelaId, forma, valorPago, pendente) {
    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">📋 Ampliar Parcelas</h2>
            <button class="modal-close" onclick="abrirDetalheVenda(${vendaId})">✕</button>
        </div>
        <div style="margin-bottom: 12px;">
            <div style="font-size: 13px; color: var(--text-secondary);">Valor pendente a parcelar:</div>
            <div style="font-size: 20px; font-weight: 800; color: var(--warning);">${formatMoney(pendente)}</div>
        </div>
        <div class="form-group">
            <label class="form-label">Quantas parcelas novas?</label>
            <select class="form-input" id="ampliar-num-parcelas">
                ${[1,2,3,4,5,6].map(n => `<option value="${n}">${n}x de ${formatMoney(pendente/n)}</option>`).join('')}
            </select>
        </div>
        <button class="btn btn-accent mt-16" onclick="executarAmpliarParcelas(${vendaId}, ${parcelaId}, '${forma}', ${valorPago}, ${pendente})">
            ✅ Confirmar
        </button>
    `);
}

async function executarAmpliarParcelas(vendaId, parcelaId, forma, valorPago, pendente) {
    const numNovas = parseInt(document.getElementById('ampliar-num-parcelas').value);

    // 1. Pay current (last) parcela with the amount received
    await marcarParcelaPaga(parcelaId, forma, valorPago);

    // 2. Get current max parcela number for this venda
    const existingParcelas = await db.parcelas.where('vendaId').equals(vendaId).toArray();
    const maxNumero = Math.max(...existingParcelas.map(p => p.numero));

    // 3. Create new parcelas for the pending amount
    const valorCada = Math.round((pendente / numNovas) * 100) / 100;
    const hoje = new Date();
    for (let i = 1; i <= numNovas; i++) {
        const venc = new Date(hoje);
        venc.setMonth(venc.getMonth() + i);
        await db.parcelas.add({
            vendaId: vendaId,
            clienteId: (await db.vendas.get(vendaId)).clienteId,
            numero: maxNumero + i,
            valor: valorCada,
            valorPago: 0,
            dataVencimento: venc.toISOString().split('T')[0],
            status: 'pendente'
        });
    }

    // 3. Update venda numParcelas
    const venda = await db.vendas.get(vendaId);
    const allParcelas = await db.parcelas.where('vendaId').equals(vendaId).toArray();
    await db.vendas.update(vendaId, { numParcelas: allParcelas.length, status: 'ativa' });

    showToast(`✅ ${numNovas} parcela${numNovas > 1 ? 's' : ''} adicionada${numNovas > 1 ? 's' : ''}!`);
    closeModal();
    await renderVendas();
    abrirDetalheVenda(vendaId);
}

// ============ VENDA INCOMPLETA ACTIONS ============

async function fecharVendaDefinitivo(vendaId) {
    await db.vendas.update(vendaId, { status: 'quitada' });
    showToast('✅ Venda encerrada como quitada');
    closeModal();
    await renderVendas();
    abrirDetalheVenda(vendaId);
}

async function ampliarParcelasManual(vendaId) {
    // Calculate pending: valorTotal - entrada - sum of all valorPago
    const venda = await db.vendas.get(vendaId);
    const parcelas = await db.parcelas.where('vendaId').equals(vendaId).toArray();
    const totalPago = parcelas.reduce((s, p) => s + (p.valorPago || 0), 0) + (venda.valorEntrada || 0);
    const pendente = venda.valorTotal - totalPago;

    if (pendente <= 0.01) {
        await db.vendas.update(vendaId, { status: 'quitada' });
        showToast('Nada pendente — venda quitada!');
        closeModal();
        abrirDetalheVenda(vendaId);
        return;
    }

    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">📋 Adicionar Parcelas</h2>
            <button class="modal-close" onclick="abrirDetalheVenda(${vendaId})">✕</button>
        </div>
        <div style="margin-bottom: 12px;">
            <div style="font-size: 13px; color: var(--text-secondary);">Valor pendente:</div>
            <div style="font-size: 20px; font-weight: 800; color: var(--warning);">${formatMoney(pendente)}</div>
        </div>
        <div class="form-group">
            <label class="form-label">Quantas parcelas novas?</label>
            <select class="form-input" id="ampliar-manual-num">
                ${[1,2,3,4,5,6].map(n => `<option value="${n}">${n}x de ${formatMoney(pendente/n)}</option>`).join('')}
            </select>
        </div>
        <button class="btn btn-accent mt-16" onclick="executarAmpliarManual(${vendaId}, ${pendente})">
            ✅ Criar Parcelas
        </button>
    `);
}

async function executarAmpliarManual(vendaId, pendente) {
    const numNovas = parseInt(document.getElementById('ampliar-manual-num').value);
    const valorCada = Math.round((pendente / numNovas) * 100) / 100;
    const hoje = new Date();
    const venda = await db.vendas.get(vendaId);

    // Get current max parcela number
    const existingParcelas = await db.parcelas.where('vendaId').equals(vendaId).toArray();
    const maxNumero = Math.max(...existingParcelas.map(p => p.numero));

    for (let i = 1; i <= numNovas; i++) {
        const venc = new Date(hoje);
        venc.setMonth(venc.getMonth() + i);
        await db.parcelas.add({
            vendaId: vendaId,
            clienteId: venda.clienteId,
            numero: maxNumero + i,
            valor: valorCada,
            valorPago: 0,
            dataVencimento: venc.toISOString().split('T')[0],
            status: 'pendente'
        });
    }

    const allParcelas = await db.parcelas.where('vendaId').equals(vendaId).toArray();
    await db.vendas.update(vendaId, { numParcelas: allParcelas.length, status: 'ativa' });

    showToast(`✅ ${numNovas} parcela${numNovas > 1 ? 's' : ''} criada${numNovas > 1 ? 's' : ''}!`);
    closeModal();
    await renderVendas();
    abrirDetalheVenda(vendaId);
}

// ============ DESFAZER PAGAMENTO (undo) ============

async function desfazerPagamento(parcelaId, vendaId) {
    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">↩️ Desfazer Pagamento</h2>
            <button class="modal-close" onclick="abrirDetalheVenda(${vendaId})">✕</button>
        </div>
        <div style="text-align: center; padding: 16px 0;">
            <p style="font-size: 14px;">Tem certeza que quer desfazer este pagamento?</p>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
                A parcela voltará como pendente.
            </p>
        </div>
        <div class="confirm-actions">
            <button class="btn btn-ghost" onclick="abrirDetalheVenda(${vendaId})">Cancelar</button>
            <button class="btn btn-accent" onclick="executarDesfazerPagamento(${parcelaId}, ${vendaId})">Confirmar</button>
        </div>
    `);
}

async function executarDesfazerPagamento(parcelaId, vendaId) {
    await db.parcelas.update(parcelaId, {
        status: 'pendente',
        valorPago: 0,
        dataPagamento: null,
        formaPagamento: null
    });
    // Remove associated pagamentos
    await db.pagamentos.where('parcelaId').equals(parcelaId).delete();
    // Reopen venda
    await db.vendas.update(vendaId, { status: 'ativa' });
    showToast('↩️ Pagamento desfeito');
    closeModal();
    await renderVendas();
    abrirDetalheVenda(vendaId);
}


// ============ EDITAR FECHA DE PARCELA ============

function editarDataParcelaUI(parcelaId, dataAtual, vendaId) {
    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">📅 Mudar Vencimento</h2>
            <button class="modal-close" onclick="abrirDetalheVenda(${vendaId})">✕</button>
        </div>
        <div class="form-group">
            <label class="form-label">Nova data de vencimento</label>
            <input type="date" class="form-input" id="nova-data-parcela" value="${dataAtual}" style="font-size: 18px;">
        </div>
        <div class="form-group">
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px;">
                <input type="checkbox" id="cascata-check" checked style="width: 22px; height: 22px;">
                <span>Mover as próximas parcelas também</span>
            </label>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; margin-left: 32px;">
                Se marcado, todas as parcelas seguintes se movem junto
            </div>
        </div>
        <button class="btn btn-accent mt-16" onclick="salvarNovaDataParcela(${parcelaId})">
            ✅ Salvar Nova Data
        </button>
    `);
}

async function salvarNovaDataParcela(parcelaId) {
    const novaData = document.getElementById('nova-data-parcela').value;
    if (!novaData) {
        showToast('Selecione uma data!', true);
        return;
    }
    const cascata = document.getElementById('cascata-check').checked;
    await editarDataParcela(parcelaId, novaData, cascata);
    showToast(cascata ? '✅ Datas atualizadas!' : '✅ Data atualizada!');
    const parcela = await db.parcelas.get(parcelaId);
    closeModal();
    abrirDetalheVenda(parcela.vendaId);
}

// ============ COMPROVANTE WHATSAPP ============

async function enviarComprovante(vendaId) {
    const venda = await getVenda(vendaId);
    if (!venda) return;
    const parcelas = await getParcelasByVenda(vendaId);
    const hasPagamentos = parcelas.some(p => p.status === 'pago');

    if (hasPagamentos) {
        // Offer choice: original or current state
        openModal(`
            <div class="modal-header">
                <h2 class="modal-title">📲 Enviar Comprovante</h2>
                <button class="modal-close" onclick="abrirDetalheVenda(${vendaId})">✕</button>
            </div>
            <div style="padding: 12px 0;">
                <p style="font-size: 14px; margin-bottom: 16px;">Qual versão enviar?</p>
                <button class="btn btn-accent mb-8" onclick="enviarComprovanteAtual(${vendaId})">
                    📋 Situação Atual (com pagamentos)
                </button>
                <button class="btn btn-ghost" onclick="enviarComprovanteOriginal(${vendaId})">
                    📄 Comprovante Original (da compra)
                </button>
            </div>
        `);
    } else {
        // No payments yet — send original directly
        await enviarComprovanteOriginal(vendaId);
    }
}

async function enviarComprovanteOriginal(vendaId) {
    const venda = await getVenda(vendaId);
    const cliente = await getCliente(venda.clienteId);

    // Use original parcela count (before any extensions)
    const numOriginal = venda.numParcelasOriginal || venda.numParcelas;

    let texto = `🧾 *COMPROVANTE DE COMPRA*\n`;
    texto += `━━━━━━━━━━━━━━━━━━\n`;
    texto += `*Cliente:* ${cliente ? cliente.nome : '-'}\n`;
    texto += `*Produto:* ${venda.descricao || '-'}\n`;
    texto += `*Data:* ${formatDate(venda.data)}\n`;
    texto += `*Valor Total:* ${formatMoney(venda.valorTotal)}\n`;
    if (venda.valorEntrada > 0) {
        texto += `*Entrada:* ${formatMoney(venda.valorEntrada)}\n`;
    }
    if (venda.tipo === 'parcelado') {
        const valorParcela = (venda.valorTotal - (venda.valorEntrada || 0)) / numOriginal;
        texto += `*Condição:* ${numOriginal}x ${formatMoney(valorParcela)}`;
        if (venda.taxaJuros > 0) texto += ` (${venda.taxaJuros}% a.m.)`;
        texto += `\n`;
    } else {
        texto += `*Condição:* À vista\n`;
    }
    texto += `\nObrigado pela preferência! 🙏`;

    await enviarTextoWhatsApp(cliente, texto);
    closeModal();
}

async function enviarComprovanteAtual(vendaId) {
    const venda = await getVenda(vendaId);
    const cliente = await getCliente(venda.clienteId);
    const parcelas = await getParcelasByVenda(vendaId);

    // Sort parcelas by numero
    parcelas.sort((a, b) => a.numero - b.numero);

    const totalPago = parcelas.filter(p => p.status === 'pago').reduce((s, p) => s + (p.valorPago || p.valor), 0) + (venda.valorEntrada || 0);
    const pendente = venda.valorTotal - totalPago;

    let texto = `🧾 *EXTRATO DA COMPRA*\n`;
    texto += `━━━━━━━━━━━━━━━━━━\n`;
    texto += `*Cliente:* ${cliente ? cliente.nome : '-'}\n`;
    texto += `*Produto:* ${venda.descricao || '-'}\n`;
    texto += `*Valor Total:* ${formatMoney(venda.valorTotal)}\n`;
    texto += `*Já Pago:* ${formatMoney(totalPago)}\n`;
    if (pendente > 0.01) {
        texto += `*Pendente:* ${formatMoney(pendente)}\n`;
    } else {
        texto += `✅ *QUITADO!*\n`;
    }
    texto += `\n📅 *PARCELAS:*\n`;
    for (const p of parcelas) {
        const statusEmoji = p.status === 'pago' ? '✅' : '⬜';
        texto += `${statusEmoji} ${p.numero}ª - ${formatDate(p.dataVencimento)} - ${formatMoney(p.valor)}`;
        if (p.status === 'pago') {
            const pagouMenos = p.valorPago && p.valorPago < p.valor - 0.01;
            texto += pagouMenos ? ` (pago ${formatMoney(p.valorPago)})` : ' ✓';
        }
        texto += `\n`;
    }
    texto += `\nObrigado pela preferência! 🙏`;

    await enviarTextoWhatsApp(cliente, texto);
    closeModal();
}

async function enviarTextoWhatsApp(cliente, texto) {
    if (cliente && cliente.telefone) {
        openWhatsApp(cliente.telefone, texto);
    } else {
        try {
            await navigator.clipboard.writeText(texto);
            showToast('📋 Comprovante copiado!');
        } catch(e) {
            // iOS PWA clipboard fallback
            const ta = document.createElement('textarea');
            ta.value = texto;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('📋 Comprovante copiado!');
        }
    }
}


// ============ EDITAR VALOR DE PARCELA ============

function editarValorParcelaUI(parcelaId, valorAtual, vendaId) {
    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">✏️ Mudar Valor da Parcela</h2>
            <button class="modal-close" onclick="abrirDetalheVenda(${vendaId})">✕</button>
        </div>
        <div class="form-group">
            <label class="form-label">Novo valor desta parcela (R$)</label>
            <input type="number" step="0.01" class="form-input" id="novo-valor-parcela" value="${valorAtual.toFixed(2)}" style="font-size: 20px; font-weight: 700;" inputmode="decimal">
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                A diferença será distribuída entre as outras parcelas pendentes
            </div>
        </div>
        <button class="btn btn-accent mt-16" onclick="salvarNovoValorParcela(${parcelaId})">
            ✅ Salvar Novo Valor
        </button>
    `);
}

async function salvarNovoValorParcela(parcelaId) {
    const novoValor = parseFloat(document.getElementById('novo-valor-parcela').value);
    if (!novoValor || novoValor <= 0) {
        showToast('Digite um valor válido!', true);
        return;
    }
    await editarValorParcela(parcelaId, novoValor);
    showToast('✅ Valores atualizados!');
    const parcela = await db.parcelas.get(parcelaId);
    closeModal();
    abrirDetalheVenda(parcela.vendaId);
}




// Grouped vendas navigation
async function abrirVendasAgrupadas(clienteId) {
    const vendas = await getVendas();
    const vendasCliente = vendas.filter(v => v.clienteId === parseInt(clienteId) && v.status !== 'quitada');
    if (vendasCliente.length === 0) return;
    window._vendasAgrupadas = vendasCliente;
    window._vendaAgrupadaIdx = 0;
    mostrarVendaAgrupada(0);
}

async function mostrarVendaAgrupada(idx) {
    const vendas = window._vendasAgrupadas;
    if (!vendas || idx < 0 || idx >= vendas.length) return;
    window._vendaAgrupadaIdx = idx;
    
    // Open the venda detail with navigation arrows
    const venda = vendas[idx];
    const cliente = await getCliente(venda.clienteId);
    const parcelas = await getParcelasByVenda(venda.id);
    const pagas = parcelas.filter(p => p.status === 'pago').length;
    const hoje = getToday();

    const prevDisabled = idx === 0;
    const nextDisabled = idx === vendas.length - 1;

    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">🛒 ${cliente ? cliente.nome : ''}</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>

        <!-- Navigation arrows -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <button class="btn btn-ghost btn-sm" style="width: auto; opacity: ${prevDisabled ? '0.3' : '1'};" ${prevDisabled ? 'disabled' : ''} onclick="mostrarVendaAgrupada(${idx-1})">
                ← Anterior
            </button>
            <span style="font-size: 12px; color: var(--text-secondary);">${idx+1} de ${vendas.length}</span>
            <button class="btn btn-ghost btn-sm" style="width: auto; opacity: ${nextDisabled ? '0.3' : '1'};" ${nextDisabled ? 'disabled' : ''} onclick="mostrarVendaAgrupada(${idx+1})">
                Próxima →
            </button>
        </div>

        <div class="card">
            ${venda.descricao ? `<div style="font-size: 14px; font-weight: 600;">${venda.descricao}</div>` : ''}
            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
                📅 ${formatDate(venda.data)} • ${venda.tipo === 'vista' ? 'À vista' : venda.numParcelas + 'x'}
            </div>
            <div style="margin-top: 8px; font-size: 20px; font-weight: 800; color: var(--accent);">
                ${formatMoney(venda.valorTotal)}
            </div>
            ${venda.valorEntrada > 0 ? `<div style="font-size: 13px; color: var(--text-secondary);">Entrada: ${formatMoney(venda.valorEntrada)}</div>` : ''}
        </div>

        <div class="section-title">📋 Parcelas (${pagas}/${parcelas.length})</div>
        ${parcelas.map(p => {
            const isAtrasado = p.status === 'pendente' && p.dataVencimento < hoje;
            const isParcial = p.status === 'parcial';
            const statusIcon = p.status === 'pago' ? '✅' : (isParcial ? '🟠' : (isAtrasado ? '🔴' : '🟡'));
            const restante = p.valor - (p.valorPago || 0);
            return `
                <div class="venda-item">
                    <div style="flex:1;"><span style="font-weight:600;">${statusIcon} P${p.numero}</span> ${formatDate(p.dataVencimento)}</div>
                    <div style="font-weight:700;">${formatMoney(p.status === 'pago' ? p.valor : restante)}</div>
                </div>
            `;
        }).join('')}

        <button class="btn btn-ghost mt-16" onclick="closeModal(); abrirDetalheVenda(${venda.id})">
            Ver detalhes completos →
        </button>
    `);
}


function toggleOrdenVendas() {
    window._vendasOrdenAsc = !window._vendasOrdenAsc;
    renderVendas();
}


async function renderVendasAgrupadasHTML(vendasList, clienteCache) {
    const byClient = {};
    for (const v of vendasList) {
        if (!byClient[v.clienteId]) byClient[v.clienteId] = [];
        byClient[v.clienteId].push(v);
    }
    let html = '';
    for (const [clienteId, vendasCliente] of Object.entries(byClient)) {
        const cliente = clienteCache[clienteId];
        const totalPendente = vendasCliente.reduce((s, v) => s + v.valorTotal, 0);
        html += `
            <div class="list-item item-inactive" onclick="abrirVendasAgrupadas(${clienteId})" style="flex-wrap: wrap;">
                <div class="item-icon">👤</div>
                <div class="item-info">
                    <div class="item-name">${cliente ? cliente.nome : 'Cliente'}</div>
                    <div class="item-detail">${vendasCliente.length} venda${vendasCliente.length > 1 ? 's' : ''}</div>
                </div>
                <div class="item-value">${formatMoney(totalPendente)}</div>
            </div>
        `;
    }
    return html;
}
