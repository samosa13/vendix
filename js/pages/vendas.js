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

    // Sort by date descending
    vendas.sort((a, b) => b.data.localeCompare(a.data));

    let listHTML = '';
    for (const v of vendas) {
        const cliente = await getCliente(v.clienteId);
        const parcelas = await getParcelasByVenda(v.id);
        const pagas = parcelas.filter(p => p.status === 'pago').length;
        const total = parcelas.length;
        const progress = total > 0 ? (pagas / total) * 100 : 0;

        const statusBadge = v.status === 'quitada'
            ? '<span class="badge badge-green">QUITADA</span>'
            : `<span class="badge badge-orange">${pagas}/${total}</span>`;

        listHTML += `
            <div class="list-item" onclick="abrirDetalheVenda(${v.id})" style="flex-wrap: wrap;">
                <div class="item-icon">🛒</div>
                <div class="item-info">
                    <div class="item-name">${cliente ? cliente.nome : 'Cliente removido'}</div>
                    <div class="item-detail">
                        ${formatDate(v.data)} • ${v.tipo === 'vista' ? 'À vista' : v.numParcelas + 'x'}
                        ${v.descricao ? ' • ' + v.descricao : ''}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div class="item-value">${formatMoney(v.valorTotal)}</div>
                    ${statusBadge}
                </div>
                ${v.status !== 'quitada' && total > 0 ? `
                    <div class="parcela-progress" style="width: 100%; margin-top: 8px;">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    content.innerHTML = `
        ${listHTML}
        <button class="fab" id="fab-venda" onclick="abrirFormVenda()">+</button>
    `;
}

async function abrirFormVenda() {
    const clientes = await getClientes();
    const produtos = await getProdutos();

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
            <select class="form-input" id="venda-cliente">
                <option value="">Selecione o cliente</option>
                ${clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
            </select>
        </div>

        <div class="form-group">
            <label class="form-label">Produto (opcional)</label>
            <select class="form-input" id="venda-produto" onchange="preencherPreco()">
                <option value="">-- Selecionar produto --</option>
                ${produtos.map(p => `<option value="${p.id}" data-vista="${p.precoVista}" data-prazo="${p.precoPrazo}" ${(p.estoque || 0) <= 0 ? 'disabled' : ''}>${p.nome} (Est: ${p.estoque || 0})${(p.estoque || 0) <= 0 ? ' ❌ SEM ESTOQUE' : ''}</option>`).join('')}
            </select>
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
                        ${[2,3,4,5,6,8,10,12].map(n => `<option value="${n}" ${n === configVal('parcelasPadrao') ? 'selected' : ''}>${n}x</option>`).join('')}
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

function selectTipoVenda(tipo) {
    window._tipoVenda = tipo;
    document.getElementById('tab-vista').classList.toggle('active', tipo === 'vista');
    document.getElementById('tab-parcelado').classList.toggle('active', tipo === 'parcelado');
    document.getElementById('opcoes-parcelado').style.display = tipo === 'parcelado' ? 'block' : 'none';

    // Update price if product is selected
    const select = document.getElementById('venda-produto');
    if (select && select.value) {
        const option = select.options[select.selectedIndex];
        const preco = tipo === 'vista' ? option.dataset.vista : option.dataset.prazo;
        if (preco) {
            document.getElementById('venda-valor').value = preco;
        }
    }
}

function preencherPreco() {
    const select = document.getElementById('venda-produto');
    const option = select.options[select.selectedIndex];
    if (option.value) {
        const tipo = window._tipoVenda;
        const preco = tipo === 'vista' ? option.dataset.vista : option.dataset.prazo;
        document.getElementById('venda-valor').value = preco || '';
        document.getElementById('venda-descricao').value = option.textContent.split(' (Est')[0];
        calcularPreview();
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

    // Get produto info
    const produtoSelect = document.getElementById('venda-produto');
    const produtoId = produtoSelect.value ? parseInt(produtoSelect.value) : null;

    // Check stock availability
    if (produtoId) {
        const produto = await getProduto(produtoId);
        if (produto && (produto.estoque || 0) <= 0) {
            showToast('⚠️ Produto sem estoque!', true);
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
                        ${[2,3,4,5,6,8,10,12].map(n => `<option value="${n}" ${n === venda.numParcelas ? 'selected' : ''}>${n}x</option>`).join('')}
                    </select>
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
    renderVendas();
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
    renderVendas();
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
    await editarDataParcela(parcelaId, novaData);
    showToast('✅ Data atualizada!');
    closeModal();
    renderVendas();
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
    if (venda.tipo === 'parcelado') {
        texto += ` (${venda.numParcelas}x ${formatMoney(parcelas[0]?.valor || 0)})`;
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
