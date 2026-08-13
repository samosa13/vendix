/* ============================================
   VendIX - Produtos Page
   ============================================ */

async function renderProdutos() {
    const produtos = await getProdutos();
    const todosComInativos = await db.produtos.toArray();
    const inativos = todosComInativos.filter(p => p.ativo === 0);

    // Stock baixo
    const limite = configVal('estoqueMinimoAlerta') || 3;
    const baixos = produtos.filter(p => (p.estoque || 0) <= limite);

    // Sort alphabetically
    produtos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input type="text" id="search-produtos" placeholder="Buscar produto..." oninput="filtrarProdutos()">
        </div>

        ${baixos.length > 0 ? `
            <div class="collapse-toggle open" onclick="toggleCollapse('stock-baixo')">
                <span style="color: var(--danger);">⚠️ Estoque Baixo (${baixos.length})</span>
                <span class="arrow">▼</span>
            </div>
            <div id="stock-baixo" class="collapse-content">
                ${baixos.map(p => `
                    <div class="list-item" onclick="abrirFormProduto(${p.id})" style="border-left: 4px solid var(--danger);">
                        <div class="item-icon">${getCategoriaIcon(p.categoria)}</div>
                        <div class="item-info">
                            <div class="item-name">${p.nome}</div>
                            <div class="item-detail" style="color: var(--danger);">
                                ⚠️ Estoque: ${p.estoque || 0}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div class="section-title">📦 Todos os Produtos</div>

        <div id="produtos-list">
            ${produtos.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <div class="empty-text">Nenhum produto cadastrado</div>
                    <button class="btn btn-accent mt-16" onclick="abrirFormProduto()">
                        + Adicionar Produto
                    </button>
                </div>
            ` : produtos.map(p => `
                <div class="list-item" onclick="abrirFormProduto(${p.id})">
                    <div class="item-icon">${getCategoriaIcon(p.categoria)}</div>
                    <div class="item-info">
                        <div class="item-name">${p.nome}</div>
                        <div class="item-detail">
                            Estoque: ${p.estoque || 0} • Custo: ${formatMoney(p.precoCompra)}
                        </div>
                    </div>
                    <div>
                        <div class="item-value">${formatMoney(p.precoVista)}</div>
                        <div style="font-size: 11px; color: var(--text-muted); text-align: right;">à vista</div>
                    </div>
                </div>
            `).join('')}
        </div>

        ${inativos.length > 0 ? `
            <div class="collapse-toggle" onclick="toggleCollapse('inativos-produtos')">
                <span>📦 Inativos (${inativos.length})</span>
                <span class="arrow">▼</span>
            </div>
            <div id="inativos-produtos" class="collapse-content hidden">
                ${inativos.map(p => `
                    <div class="list-item item-inactive" onclick="abrirFormProduto(${p.id})">
                        <div class="item-icon">${getCategoriaIcon(p.categoria)}</div>
                        <div class="item-info">
                            <div class="item-name">${p.nome}</div>
                            <div class="item-detail" style="color: var(--text-muted);">
                                Inativo ${p.inativoDesde ? 'desde ' + formatDate(p.inativoDesde) : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <button class="fab" onclick="abrirFormProduto()">+</button>
    `;
}

function getCategoriaIcon(cat) {
    const icons = {
        'panelas': '🍳',
        'eletro': '⚡',
        'cama_mesa': '🛏️',
        'utilidades': '🏠',
        'outros': '📦'
    };
    return icons[cat] || '📦';
}

async function filtrarProdutos() {
    const search = document.getElementById('search-produtos').value.toLowerCase();
    const produtos = await getProdutos();
    const filtered = produtos.filter(p => p.nome.toLowerCase().includes(search));

    const list = document.getElementById('produtos-list');
    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <div class="empty-text">Nenhum produto encontrado</div>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(p => `
        <div class="list-item" onclick="abrirFormProduto(${p.id})">
            <div class="item-icon">${getCategoriaIcon(p.categoria)}</div>
            <div class="item-info">
                <div class="item-name">${p.nome}</div>
                <div class="item-detail">
                    Estoque: ${p.estoque || 0} • Custo: ${formatMoney(p.precoCompra)}
                </div>
            </div>
            <div>
                <div class="item-value">${formatMoney(p.precoVista)}</div>
                <div style="font-size: 11px; color: var(--text-muted); text-align: right;">à vista</div>
            </div>
        </div>
    `).join('');
}

async function abrirFormProduto(id = null) {
    let produto = { nome: '', categoria: 'utilidades', precoCompra: '', precoVista: '', precoPrazo: '', estoque: '' };

    if (id) {
        produto = await getProduto(id);
    }

    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">${id ? 'Editar' : 'Novo'} Produto</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>

        <div class="form-group">
            <label class="form-label">Nome do Produto</label>
            <input type="text" class="form-input" id="prod-nome" value="${produto.nome}" placeholder="Ex: Jogo de Panelas 5 peças">
        </div>

        <div class="form-group">
            <label class="form-label">Categoria</label>
            <select class="form-input" id="prod-categoria">
                <option value="panelas" ${produto.categoria === 'panelas' ? 'selected' : ''}>🍳 Panelas / Cozinha</option>
                <option value="eletro" ${produto.categoria === 'eletro' ? 'selected' : ''}>⚡ Eletrodomésticos</option>
                <option value="cama_mesa" ${produto.categoria === 'cama_mesa' ? 'selected' : ''}>🛏️ Cama, Mesa e Banho</option>
                <option value="utilidades" ${produto.categoria === 'utilidades' ? 'selected' : ''}>🏠 Utilidades Domésticas</option>
                <option value="outros" ${produto.categoria === 'outros' ? 'selected' : ''}>📦 Outros</option>
            </select>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Preço Compra (R$)</label>
                <input type="number" step="0.01" class="form-input" id="prod-compra" value="${produto.precoCompra || ''}" placeholder="0,00">
            </div>
            <div class="form-group">
                <label class="form-label">Estoque</label>
                <input type="number" class="form-input" id="prod-estoque" value="${produto.estoque || ''}" placeholder="0">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Preço à Vista (R$)</label>
                <input type="number" step="0.01" class="form-input" id="prod-vista" value="${produto.precoVista || ''}" placeholder="0,00">
            </div>
            <div class="form-group">
                <label class="form-label">Preço Parcelado (R$)</label>
                <input type="number" step="0.01" class="form-input" id="prod-prazo" value="${produto.precoPrazo || ''}" placeholder="0,00">
            </div>
        </div>

        <button class="btn btn-accent mt-16" onclick="salvarProduto(${id || 'null'})">
            ${id ? '✅ Salvar' : '+ Adicionar'}
        </button>

        ${id ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 14px;">
                    <span>${produto.ativo === 0 ? '🔴 Produto INATIVO' : '🟢 Produto Ativo'}</span>
                    <input type="checkbox" id="prod-ativo" ${produto.ativo !== 0 ? 'checked' : ''} style="width: 22px; height: 22px;">
                </label>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    Desmarque para inativar (não aparece na lista de vendas)
                </div>
            </div>
        ` : ''}
    `);
}

async function salvarProduto(id) {
    const nome = document.getElementById('prod-nome').value.trim();
    if (!nome) {
        showToast('Digite o nome do produto!', true);
        return;
    }

    const dados = {
        nome,
        categoria: document.getElementById('prod-categoria').value,
        precoCompra: parseFloat(document.getElementById('prod-compra').value) || 0,
        precoVista: parseFloat(document.getElementById('prod-vista').value) || 0,
        precoPrazo: parseFloat(document.getElementById('prod-prazo').value) || 0,
        estoque: parseInt(document.getElementById('prod-estoque').value) || 0
    };

    if (id) {
        const ativo = document.getElementById('prod-ativo').checked ? 1 : 0;
        dados.ativo = ativo;
        if (ativo === 0 && !dados.inativoDesde) dados.inativoDesde = getToday();
        if (ativo === 1) dados.inativoDesde = null;
        await updateProduto(id, dados);
        showToast('✅ Produto atualizado!');
    } else {
        await addProduto(dados);
        showToast('✅ Produto adicionado!');
    }

    closeModal();
    await renderProdutos();
}

function confirmarExcluirProduto(id) {
    showConfirm('Tem certeza que quer excluir este produto?', async () => {
        await deleteProduto(id);
        showToast('Produto excluído');
        closeModal();
        renderProdutos();
    });
}
