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

setInterval    // Separate: active vendas, quitadas, and vendas of inactive clients
    const clientesInativos = (await db.clientes.toArray()).filter(c => c.ativo === 0).map(c => c.id);
    const ativas = vendas.filter(v => v.status !== 'quitada' && !clientesInativos.includes(v.clienteId));
    const vendasClienteInativo = vendas.filter(v => v.status !== 'quitada' && clientesInativos.includes(v.clienteId));
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
        // Normal mode: one item per venda
        for (const v of ativas) {
            listHTML += await renderVendaItem(v, clienteCache[v.clienteId], false);
        }
    }

    // Render quitadas (collapsed)
    let quitadasHTML = '';
    for (const v of quitadas) {
        quitadasHTML += await renderVendaItem(v, clienteCache[v.clienteId], true);
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

    const statusBadge = v.status === 'quitada'
        ? '<span class="badge badge-green">QUITADA</span>'
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
            <input type="text" class="form-input" id="venda-cliente-input" list="clientes-datalist" placeholder="🔍 Digitar nome do cliente..." autocomplete="off">
            <datalist id="clientes-datalist">
                ${clientes.map(c => `<option value="${c.nome}" data-id="${c.id}">${c.bairro || ''}, ${c.cidade || ''}</option>`).join('')}
            </datalist>
            <input type="hidden" id="venda-cliente" value="">
        </div>

        <div class="form-group">
            <label class="form-label">Produto (opcional)</label>
            <input type="text" class="form-input" id="venda-produto-input" list="produtos-datalist" placeholder="🔍 Digitar nome do produto..." autocomplete="off" oninput="selecionarProdutoDatalist()">
            <datalist id="produtos-datalist">
                ${produtos.filter(p => p.ativo !== 0 && (p.estoque || 0) > 0).map(p => `<option value="${p.nome}" data-id="${p.id}" data-vista="${p.precoVista}" data-prazo="${p.precoPrazo}">${p.nome} (Est: ${p.estoque})</option>`).join('')}
            </datalist>
            <input type="hidden" id="venda-produto" value="">
        </div>

        <div class="form-group">
            <label class="form-label">Descrição da Venda</label>
            <input type="text" class="form-input" id="venda-descricao" placeholder="Ex: Jogo de panelas + frigideira">
        </div>

        <div class="form-group">
            <label class="form-label">Valor Total (R$)</label>
            <input type="number" step="0.01" class="form-input" id="venda-valor" placeholder="0,00" style="font-size: 20px; font-weight: 700;">
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
}

// selectTipoVenda also updates product price from datalist
function selectTipoVenda(tipo) {
    window._tipoVenda = tipo;
    document.getElementById('tab-vista').classList.toggle('active', tipo === 'vista');
    document.getElementById('tab-parcelado').classList.toggle('active', tipo === 'parcelado');
    document.getElementById('opcoes-parcelado').style.display = tipo === 'parcelado' ? 'block' : 'none';

    // Update price if product is selected
    selecionarProdutoDatalist();
}

function preencherPreco() {
    selecionarProdutoDatalist();
}

function selecionarProdutoDatalist() {
    const input = document.getElementById('venda-produto-input');
    const datalist = document.getElementById('produtos-datalist');
    const options = datalist.querySelectorAll('option');
    for (const opt of options) {
        if (opt.value === input.value) {
            const tipo = window._tipoVenda;
            const preco = tipo === 'vista' ? opt.dataset.vista : opt.dataset.prazo;
            if (preco) document.getElementById('venda-valor').value = preco;
            document.getElementById('venda-descricao').value = opt.value;
            document.getElementById('venda-produto').value = opt.dataset.id;
            calcularPreview();
            break;
        }
    }
}

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
    // Resolve client from datalist input
    const clienteInput = document.getElementById('venda-cliente-input').value.trim();
    const clientes = await getClientes();
    const clienteMatch = clientes.find(c => c.nome.toLowerCase() === clienteInput.toLowerCase());
    if (!clienteMatch) {
        showToast('Selecione um cliente válido!', true);
        return;
    }
    const clienteId = clienteMatch.id;

    const valor = parseFloat(document.getElementById('venda-valor').value);
    if (!valor || valor <= 0) {
        showToast('Digite o valor da venda!', true);
        return;
    }

    const tipo = window._tipoVenda;
    const descricao = document.getElementById('venda-descricao').value.trim();

    // Get produto info from datalist
    const produtoInput = document.getElementById('venda-produto-input').value.trim();
    const allProdutos = await db.produtos.toArray();
    const produtoMatch = produtoInput ? allProdutos.find(p => p.nome.toLowerCase() === produtoInput.toLowerCase() && p.ativo !== 0) : null;
    const produtoId = produtoMatch ? produtoMatch.id : null;

    // Check stock availability
    if (produtoMatch && (produtoMatch.estoque || 0) <= 0) {
        showToast('⚠️ Produto sem estoque!', true);
        return;
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
        itens: produtoId ? [{ produtoId, quantidade: 1 }] : [],
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

async function abrirDetalheVenda(id) {
    const venda = await getVenda(id);
    if (!venda) return;

    const cliente = await getCliente(venda.clienteId);
    const parcelas = await getParcelasByVenda(id);

    const pagas = parcelas.filter(p => p.status === 'pago').length;
    const hoje = getToday();

    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">🛒 Venda #${id}</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
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
                Pendente: ${formatMoney(venda.valorTotal - (venda.valorEntrada || 0) - parcelas.filter(p => p.status === 'pago').reduce((s,p) => s + p.valor, 0))}
            </div>
        </div>

        <div class="section-title">📋 Parcelas (${pagas}/${parcelas.length} pagas)</div>

        ${parcelas.map(p => {
            const isAtrasado = p.status === 'pendente' && p.dataVencimento < hoje;
            const isParcial = p.status === 'parcial';
            const statusIcon = p.status === 'pago' ? '✅' : (isParcial ? '🟠' : (isAtrasado ? '🔴' : '🟡'));
            const restante = p.valor - (p.valorPago || 0);

            return `
                <div class="venda-item">
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${statusIcon} Parcela ${p.numero}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            Venc: ${formatDate(p.dataVencimento)}
                            ${p.dataPagamento ? ' • Pago: ' + formatDate(p.dataPagamento) : ''}
                            ${isParcial ? ' • Pago parcial: ' + formatMoney(p.valorPago) : ''}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 700; ${p.status === 'pago' ? 'color: var(--accent)' : isAtrasado ? 'color: var(--danger)' : ''}">
                            ${p.status === 'pago' ? formatMoney(p.valor) : formatMoney(restante)}
                        </div>
                        ${p.status !== 'pago' ? `
                            <div style="display: flex; gap: 4px; margin-top: 4px; justify-content: flex-end;">
                                <button class="btn btn-accent btn-sm" style="padding: 6px 10px; font-size: 11px; width: auto;" 
                                    onclick="pagarParcelaVenda(${p.id})">Pagar</button>
                                <button class="btn btn-ghost btn-sm" style="padding: 6px 10px; font-size: 11px; width: auto;" 
                                    onclick="editarValorParcelaUI(${p.id}, ${restante})">✏️</button>
                                <button class="btn btn-ghost btn-sm" style="padding: 6px 10px; font-size: 11px; width: auto;" 
                                    onclick="editarDataParcelaUI(${p.id}, '${p.dataVencimento}')">📅</button>
                            </div>
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
            <button class="btn btn-ghost mb-8" onclick="closeModal(); abrirEditarVenda(${id})">
                ✏️ Editar Venda
            </button>
            ${venda.status !== 'quitada' ? `
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
            <button class="modal-close" onclick="closeModal()">✕</button>
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

    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">💰 Registrar Pagamento</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
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
    await marcarParcelaPaga(parcelaId, forma, valorInput);
    const parcela = await db.parcelas.get(parcelaId);
    if (parcela.status === 'pago') {
        showToast('✅ Parcela quitada!');
    } else {
        showToast('✅ Pagamento parcial registrado!');
    }
    closeModal();
    abrirDetalheVenda(parcela.vendaId);
}


// ============ EDITAR FECHA DE PARCELA ============

function editarDataParcelaUI(parcelaId, dataAtual) {
    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">📅 Mudar Vencimento</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
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

    const cliente = await getCliente(venda.clienteId);
    const parcelas = await getParcelasByVenda(vendaId);

    // Build comprovante text
    let texto = `🧾 *COMPROVANTE DE COMPRA*\n`;
    texto += `━━━━━━━━━━━━━━━━━━\n`;
    texto += `*Cliente:* ${cliente ? cliente.nome : '-'}\n`;
    texto += `*Produto:* ${venda.descricao || '-'}\n`;
    texto += `*Data:* ${formatDate(venda.data)}\n`;
    texto += `*Valor:* ${formatMoney(venda.valorTotal)}`;
    if (venda.valorEntrada > 0) {
        texto += `\n*Entrada:* ${formatMoney(venda.valorEntrada)} (já pago)`;
    }
    if (venda.tipo === 'parcelado') {
        texto += `\n*Parcelado:* ${venda.numParcelas}x ${formatMoney(parcelas[0]?.valor || 0)}`;
    } else {
        texto += ` (à vista)`;
    }
    texto += `\n`;

    if (venda.tipo === 'parcelado') {
        texto += `\n📅 *PARCELAS:*\n`;
        for (const p of parcelas) {
            const statusEmoji = p.status === 'pago' ? '✅' : (p.status === 'parcial' ? '🟠' : '⬜');
            texto += `${statusEmoji} ${p.numero}ª - ${formatDate(p.dataVencimento)} - ${formatMoney(p.valor)}`;
            if (p.status === 'pago') texto += ' (pago)';
            if (p.status === 'parcial') texto += ` (pago ${formatMoney(p.valorPago || 0)})`;
            texto += `\n`;
        }
    }

    texto += `\nObrigado pela preferência! 🙏`;

    // Open WhatsApp with text
    if (cliente && cliente.telefone) {
        const link = whatsappLink(cliente.telefone, texto);
        window.open(link, '_blank');
    } else {
        // Copy to clipboard if no phone
        try {
            await navigator.clipboard.writeText(texto);
            showToast('📋 Comprovante copiado!');
        } catch(e) {
            showToast('Cliente sem telefone cadastrado', true);
        }
    }
}


// ============ EDITAR VALOR DE PARCELA ============

function editarValorParcelaUI(parcelaId, valorAtual) {
    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">✏️ Mudar Valor da Parcela</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
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
