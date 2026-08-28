/* ============================================
   VendIX - Clientes Page
   ============================================ */

async function renderClientes() {
    const clientes = await getClientes();
    const todosComInativos = await db.clientes.toArray();
    const inativos = todosComInativos.filter(c => c.ativo === 0);

    // Sort alphabetically
    clientes.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input type="text" id="search-clientes" placeholder="Buscar cliente..." oninput="filtrarClientes()">
        </div>

        <div id="clientes-list">
            ${clientes.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon">👤</div>
                    <div class="empty-text">Nenhum cliente cadastrado</div>
                    <button class="btn btn-accent mt-16" onclick="abrirFormCliente()">
                        + Adicionar Cliente
                    </button>
                </div>
            ` : clientes.map(c => `
                <div class="list-item" onclick="abrirDetalheCliente(${c.id})">
                    <div class="item-icon">👤</div>
                    <div class="item-info">
                        <div class="item-name">${c.nome}</div>
                        <div class="item-detail">
                            ${c.bairro ? c.bairro + ' • ' : ''}${c.cidade || ''}
                            ${c.telefone ? ' • ' + formatPhone(c.telefone) : ''}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        ${inativos.length > 0 ? `
            <div class="collapse-toggle" onclick="toggleCollapse('inativos-clientes')">
                <span>👤 Inativos (${inativos.length})</span>
                <span class="arrow">▼</span>
            </div>
            <div id="inativos-clientes" class="collapse-content hidden">
                ${inativos.map(c => `
                    <div class="list-item item-inactive" onclick="abrirDetalheCliente(${c.id})">
                        <div class="item-icon">👤</div>
                        <div class="item-info">
                            <div class="item-name">${c.nome}</div>
                            <div class="item-detail" style="color: var(--text-muted);">
                                Inativo ${c.inativoDesde ? 'desde ' + formatDate(c.inativoDesde) : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <button class="fab" onclick="abrirFormCliente()">+</button>
    `;
}

async function filtrarClientes() {
    const search = document.getElementById('search-clientes').value.toLowerCase();
    const clientes = await getClientes();
    const filtered = clientes.filter(c =>
        c.nome.toLowerCase().includes(search) ||
        (c.bairro && c.bairro.toLowerCase().includes(search)) ||
        (c.cidade && c.cidade.toLowerCase().includes(search))
    );

    const list = document.getElementById('clientes-list');
    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <div class="empty-text">Nenhum cliente encontrado</div>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(c => `
        <div class="list-item" onclick="abrirDetalheCliente(${c.id})">
            <div class="item-icon">👤</div>
            <div class="item-info">
                <div class="item-name">${c.nome}</div>
                <div class="item-detail">
                    ${c.bairro ? c.bairro + ' • ' : ''}${c.cidade || ''}
                    ${c.telefone ? ' • ' + formatPhone(c.telefone) : ''}
                </div>
            </div>
        </div>
    `).join('');
}

async function abrirDetalheCliente(id) {
    const cliente = await getCliente(id);
    if (!cliente) return;

    const vendas = await getVendasByCliente(id);
    const todasParcelas = [];
    for (const v of vendas) {
        const parcelas = await getParcelasByVenda(v.id);
        todasParcelas.push(...parcelas);
    }
    const pendentes = todasParcelas.filter(p => p.status !== 'pago');
    const totalDevendo = pendentes.reduce((sum, p) => sum + p.valor, 0);

    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">👤 ${cliente.nome}</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>

        <div class="card">
            ${cliente.telefone ? `<div style="margin-bottom: 8px;">📱 ${formatPhone(cliente.telefone)}</div>` : ''}
            ${cliente.cidade ? `<div style="margin-bottom: 8px;">📍 ${cliente.bairro ? cliente.bairro + ', ' : ''}${cliente.cidade}</div>` : ''}
            ${cliente.endereco ? `<div style="margin-bottom: 8px;">🏠 ${cliente.endereco}</div>` : ''}
            ${cliente.referencia ? `<div style="margin-bottom: 8px; font-size: 13px; color: var(--text-secondary);">📝 ${cliente.referencia}</div>` : ''}
        </div>

        ${totalDevendo > 0 ? `
            <div class="card" style="border-left: 4px solid var(--warning); cursor: pointer;" onclick="closeModal(); navigateTo('cobrancas'); setTimeout(()=>{switchTabCobranca('todos'); filtrarCobrancasPorCliente(${id});}, 400);">
                <div style="font-size: 13px; color: var(--text-secondary);">Total Devendo</div>
                <div style="font-size: 22px; font-weight: 800; color: var(--warning);">${formatMoney(totalDevendo)}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${pendentes.length} parcela${pendentes.length > 1 ? 's' : ''} pendente${pendentes.length > 1 ? 's' : ''} • <span style="color: var(--accent);">Toca para ver cobranças →</span></div>
            </div>
        ` : `
            <div class="card" style="border-left: 4px solid var(--accent);">
                <div style="font-size: 14px; color: var(--accent); font-weight: 600;">✅ Nenhuma dívida!</div>
            </div>
        `}

        <div class="action-row mt-16">
            ${cliente.telefone ? `
                <button onclick="openWhatsApp('${cliente.telefone}', '')" class="btn-whatsapp-circle">
                    <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </button>
            ` : ''}
            <button class="btn btn-ghost btn-sm" onclick="closeModal(); abrirFormCliente(${id})">
                ✏️ Editar
            </button>
        </div>
    `);
}

async function abrirFormCliente(id = null) {
    let cliente = { nome: '', telefone: '', cidade: '', bairro: '', endereco: '', referencia: '' };

    if (id) {
        cliente = await getCliente(id);
    }

    openModal(`
        <div class="modal-header">
            <h2 class="modal-title">${id ? 'Editar' : 'Novo'} Cliente</h2>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>

        <div class="form-group">
            <label class="form-label">Nome Completo</label>
            <input type="text" class="form-input" id="cli-nome" value="${cliente.nome}" placeholder="Nome do cliente">
        </div>

        <div class="form-group">
            <label class="form-label">Telefone / WhatsApp</label>
            <input type="tel" class="form-input" id="cli-telefone" value="${cliente.telefone || (id ? '' : configVal('dddPadrao'))}" placeholder="(DDD) 99999-9999">
        </div>

        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Cidade</label>
                <input type="text" class="form-input" id="cli-cidade" value="${cliente.cidade || ''}" placeholder="Cidade">
            </div>
            <div class="form-group">
                <label class="form-label">Bairro</label>
                <input type="text" class="form-input" id="cli-bairro" value="${cliente.bairro || ''}" placeholder="Bairro">
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">Endereço</label>
            <input type="text" class="form-input" id="cli-endereco" value="${cliente.endereco || ''}" placeholder="Rua, número">
        </div>

        <div class="form-group">
            <label class="form-label">Referência / Observações</label>
            <textarea class="form-input" id="cli-referencia" placeholder="Ex: Casa amarela ao lado do mercado">${cliente.referencia || ''}</textarea>
        </div>

        <button class="btn btn-accent mt-16" onclick="salvarCliente(${id || 'null'})">
            ${id ? '✅ Salvar' : '+ Adicionar'}
        </button>

        ${id ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
                <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 14px;">
                    <span>${cliente.ativo === 0 ? '🔴 Cliente INATIVO' : '🟢 Cliente Ativo'}</span>
                    <input type="checkbox" id="cli-ativo" ${cliente.ativo !== 0 ? 'checked' : ''} style="width: 22px; height: 22px;">
                </label>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                    Desmarque para inativar (não aparece nas listas)
                </div>
            </div>
        ` : ''}
    `);
}

async function salvarCliente(id) {
    const nome = document.getElementById('cli-nome').value.trim();
    if (!nome) {
        showToast('Digite o nome do cliente!', true);
        return;
    }

    const dados = {
        nome,
        telefone: document.getElementById('cli-telefone').value.trim(),
        cidade: document.getElementById('cli-cidade').value.trim(),
        bairro: document.getElementById('cli-bairro').value.trim(),
        endereco: document.getElementById('cli-endereco').value.trim(),
        referencia: document.getElementById('cli-referencia').value.trim()
    };

    if (id) {
        const ativo = document.getElementById('cli-ativo').checked ? 1 : 0;
        dados.ativo = ativo;

        // If deactivating, check for pending vendas
        if (ativo === 0) {
            const vendasCliente = await getVendasByCliente(id);
            const vendasAbertas = vendasCliente.filter(v => v.status === 'aberta');
            if (vendasAbertas.length > 0) {
                openModal(`
                    <div class="modal-header">
                        <h2 class="modal-title">⚠️ Atenção</h2>
                        <button class="modal-close" onclick="closeModal()">✕</button>
                    </div>
                    <div style="padding: 12px 0; text-align: center;">
                        <p style="font-size: 14px;">Este cliente tem <strong>${vendasAbertas.length} venda${vendasAbertas.length > 1 ? 's' : ''}</strong> pendente${vendasAbertas.length > 1 ? 's' : ''}.</p>
                        <p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
                            Ao inativar, as vendas ficarão na seção "Vendas de Clientes Inativos".
                        </p>
                    </div>
                    <div class="confirm-actions">
                        <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
                        <button class="btn btn-warning" onclick="confirmarInativarCliente(${id})">Inativar mesmo assim</button>
                    </div>
                `);
                return;
            }
            dados.inativoDesde = getToday();
        }
        if (ativo === 1) dados.inativoDesde = null;

        await updateCliente(id, dados);
        showToast('✅ Cliente atualizado!');
    } else {
        await addCliente(dados);
        showToast('✅ Cliente adicionado!');
    }

    closeModal();
    renderClientes();
}

function confirmarExcluirCliente(id) {
    showConfirm('Tem certeza que quer excluir este cliente?', async () => {
        await deleteCliente(id);
        showToast('Cliente excluído');
        closeModal();
        renderClientes();
    });
}


async function confirmarInativarCliente(id) {
    await updateCliente(id, { ativo: 0, inativoDesde: getToday() });
    showToast('✅ Cliente inativado!');
    closeModal();
    renderClientes();
}
