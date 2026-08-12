/* ============================================
   VendIX - Database (Dexie.js / IndexedDB)
   Almacenamiento local, offline-first
   ============================================ */

const db = new Dexie('VendIX');

db.version(1).stores({
    produtos: '++id, nome, categoria, ativo',
    clientes: '++id, nome, cidade, bairro, ativo',
    vendas: '++id, clienteId, data, status',
    parcelas: '++id, vendaId, clienteId, dataVencimento, status',
    pagamentos: '++id, parcelaId, vendaId, data'
});

// ============ PRODUTOS ============

async function addProduto(produto) {
    produto.criadoEm = new Date().toISOString();
    produto.ativo = 1;
    return await db.produtos.add(produto);
}

async function updateProduto(id, changes) {
    return await db.produtos.update(id, changes);
}

async function deleteProduto(id) {
    return await db.produtos.update(id, { ativo: 0 });
}

async function getProdutos() {
    const all = await db.produtos.toArray();
    return all.filter(p => p.ativo !== 0);
}

async function getProduto(id) {
    return await db.produtos.get(id);
}

// ============ CLIENTES ============

async function addCliente(cliente) {
    cliente.criadoEm = new Date().toISOString();
    cliente.ativo = 1;
    return await db.clientes.add(cliente);
}

async function updateCliente(id, changes) {
    return await db.clientes.update(id, changes);
}

async function deleteCliente(id) {
    return await db.clientes.update(id, { ativo: 0 });
}

async function getClientes() {
    const all = await db.clientes.toArray();
    return all.filter(c => c.ativo !== 0);
}

async function getCliente(id) {
    return await db.clientes.get(id);
}

// ============ VENDAS ============

async function addVenda(venda, parcelas) {
    // venda: { clienteId, data, itens, valorTotal, tipo, numParcelas, taxaJuros, valorEntrada }
    venda.criadoEm = new Date().toISOString();
    venda.status = 'aberta'; // aberta, quitada, cancelada

    const vendaId = await db.vendas.add(venda);

    // Create parcelas
    for (const p of parcelas) {
        p.vendaId = vendaId;
        p.clienteId = venda.clienteId;
        if (!p.status) p.status = 'pendente'; // pendente, pago, atrasado
        await db.parcelas.add(p);
    }

    // Decrease stock
    if (venda.itens && venda.itens.length > 0) {
        for (const item of venda.itens) {
            const produto = await db.produtos.get(item.produtoId);
            if (produto) {
                await db.produtos.update(item.produtoId, {
                    estoque: Math.max(0, (produto.estoque || 0) - (item.quantidade || 1))
                });
            }
        }
    }

    // Check if all paid (e.g. venda à vista)
    const allPaid = parcelas.every(p => p.status === 'pago');
    if (allPaid) {
        await db.vendas.update(vendaId, { status: 'quitada' });
    }

    // Register payments for pre-paid parcelas
    for (const p of parcelas) {
        if (p.status === 'pago') {
            const savedParcelas = await db.parcelas.where('vendaId').equals(vendaId).toArray();
            const match = savedParcelas.find(sp => sp.numero === p.numero);
            if (match) {
                await db.pagamentos.add({
                    parcelaId: match.id,
                    vendaId: vendaId,
                    clienteId: venda.clienteId,
                    valor: p.valor,
                    data: new Date().toISOString(),
                    forma: p.formaPagamento || 'dinheiro'
                });
            }
        }
    }

    return vendaId;
}

async function cancelarVenda(vendaId) {
    const venda = await db.vendas.get(vendaId);
    if (!venda) return;

    // Mark venda as cancelled
    await db.vendas.update(vendaId, { status: 'cancelada' });

    // Delete pending parcelas, keep paid ones as record
    const parcelas = await db.parcelas.where('vendaId').equals(vendaId).toArray();
    for (const p of parcelas) {
        if (p.status !== 'pago') {
            await db.parcelas.delete(p.id);
        }
    }

    // Restore stock
    if (venda.itens && venda.itens.length > 0) {
        for (const item of venda.itens) {
            const produto = await db.produtos.get(item.produtoId);
            if (produto) {
                await db.produtos.update(item.produtoId, {
                    estoque: (produto.estoque || 0) + (item.quantidade || 1)
                });
            }
        }
    }
}

async function editarVenda(vendaId, changes) {
    // changes can include: descricao, valorTotal, numParcelas, taxaJuros, valorEntrada
    const venda = await db.vendas.get(vendaId);
    if (!venda || venda.status === 'cancelada') return;

    // Update venda record
    await db.vendas.update(vendaId, changes);

    // If financial values changed, recalculate pending parcelas
    if (changes.valorTotal !== undefined || changes.numParcelas !== undefined || 
        changes.taxaJuros !== undefined || changes.valorEntrada !== undefined) {
        
        const updatedVenda = await db.vendas.get(vendaId);
        const parcelas = await db.parcelas.where('vendaId').equals(vendaId).toArray();
        const pagasExistentes = parcelas.filter(p => p.status === 'pago');
        const pendientesExistentes = parcelas.filter(p => p.status !== 'pago');

        // Delete old pending parcelas
        for (const p of pendientesExistentes) {
            await db.parcelas.delete(p.id);
        }

        // Calculate remaining amount
        const jaPago = pagasExistentes.reduce((sum, p) => sum + p.valor, 0);
        const valorRestante = updatedVenda.valorTotal - jaPago - (updatedVenda.valorEntrada || 0);

        if (valorRestante > 0) {
            const numParcelasRestantes = (updatedVenda.numParcelas || 1) - pagasExistentes.length;
            if (numParcelasRestantes > 0) {
                const novasParcelas = calcularParcelas(
                    valorRestante + (updatedVenda.valorEntrada || 0),
                    numParcelasRestantes,
                    updatedVenda.taxaJuros || 0,
                    getToday(),
                    0 // entrada already accounted for
                );

                for (let i = 0; i < novasParcelas.length; i++) {
                    novasParcelas[i].vendaId = vendaId;
                    novasParcelas[i].clienteId = updatedVenda.clienteId;
                    novasParcelas[i].numero = pagasExistentes.length + i + 1;
                    novasParcelas[i].status = 'pendente';
                    await db.parcelas.add(novasParcelas[i]);
                }
            }
        }

        // Check if fully paid
        const todasParcelas = await db.parcelas.where('vendaId').equals(vendaId).toArray();
        const todasPagas = todasParcelas.length > 0 && todasParcelas.every(p => p.status === 'pago');
        if (todasPagas) {
            await db.vendas.update(vendaId, { status: 'quitada' });
        } else {
            await db.vendas.update(vendaId, { status: 'aberta' });
        }
    }
}

async function getVendas() {
    return await db.vendas.where('status').notEqual('cancelada').reverse().toArray();
}

async function getVenda(id) {
    return await db.vendas.get(id);
}

async function getVendasByCliente(clienteId) {
    return await db.vendas.where('clienteId').equals(clienteId).toArray();
}

// ============ PARCELAS ============

async function getParcelasByVenda(vendaId) {
    return await db.parcelas.where('vendaId').equals(vendaId).toArray();
}

async function getParcelasPendentes() {
    return await db.parcelas.where('status').anyOf(['pendente', 'atrasado', 'parcial']).toArray();
}

async function getParcelasHoje() {
    const hoje = new Date().toISOString().split('T')[0];
    const pendentes = await getParcelasPendentes();
    return pendentes.filter(p => p.dataVencimento <= hoje);
}

async function getParcelasAtrasadas() {
    const hoje = new Date().toISOString().split('T')[0];
    const pendentes = await db.parcelas.where('status').equals('pendente').toArray();
    return pendentes.filter(p => p.dataVencimento < hoje);
}

async function getParcelasFuturas(dias = 7) {
    const hoje = new Date();
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + dias);
    const hojeStr = hoje.toISOString().split('T')[0];
    const limiteStr = limite.toISOString().split('T')[0];

    const pendentes = await db.parcelas.where('status').equals('pendente').toArray();
    return pendentes.filter(p => p.dataVencimento >= hojeStr && p.dataVencimento <= limiteStr);
}

async function marcarParcelaPaga(parcelaId, formaPagamento, valorRecebido = null) {
    const parcela = await db.parcelas.get(parcelaId);
    if (!parcela) return;

    const valorTotal = parcela.valor;
    const jaPago = parcela.valorPago || 0;
    const valorEfetivo = valorRecebido !== null ? valorRecebido : (valorTotal - jaPago);
    const novoTotalPago = jaPago + valorEfetivo;

    // Determine new status
    const novoStatus = novoTotalPago >= valorTotal ? 'pago' : 'parcial';

    await db.parcelas.update(parcelaId, {
        status: novoStatus,
        valorPago: novoTotalPago,
        dataPagamento: novoStatus === 'pago' ? new Date().toISOString().split('T')[0] : undefined,
        formaPagamento: formaPagamento
    });

    // Register payment
    await db.pagamentos.add({
        parcelaId: parcelaId,
        vendaId: parcela.vendaId,
        clienteId: parcela.clienteId,
        valor: valorEfetivo,
        data: new Date().toISOString(),
        forma: formaPagamento
    });

    // Check if all parcelas are paid → mark venda as quitada
    const todasParcelas = await db.parcelas.where('vendaId').equals(parcela.vendaId).toArray();
    const todasPagas = todasParcelas.every(p => p.status === 'pago');
    if (todasPagas) {
        await db.vendas.update(parcela.vendaId, { status: 'quitada' });
    }
}

// ============ STATS ============

async function getStats() {
    const hoje = new Date().toISOString().split('T')[0];

    const todasParcelas = await db.parcelas.toArray();
    const pendentes = todasParcelas.filter(p => p.status === 'pendente' || p.status === 'atrasado');
    const atrasadas = pendentes.filter(p => p.dataVencimento < hoje);
    const paraHoje = pendentes.filter(p => p.dataVencimento <= hoje);

    // Update status of overdue parcelas
    for (const p of atrasadas) {
        if (p.status !== 'atrasado') {
            await db.parcelas.update(p.id, { status: 'atrasado' });
        }
    }

    const totalReceber = pendentes.reduce((sum, p) => sum + p.valor, 0);
    const recebidoMes = await getRecebidoMesAtual();

    const produtos = await getProdutos();
    const clientes = await getClientes();

    return {
        cobranasHoje: paraHoje.length,
        valorHoje: paraHoje.reduce((sum, p) => sum + p.valor, 0),
        atrasadas: atrasadas.length,
        valorAtrasado: atrasadas.reduce((sum, p) => sum + p.valor, 0),
        totalReceber,
        recebidoMes,
        totalProdutos: produtos.length,
        totalClientes: clientes.length,
        estoqueBaixo: produtos.filter(p => (p.estoque || 0) <= (typeof configVal === 'function' ? configVal('estoqueMinimoAlerta') : 2)).length
    };
}

async function getRecebidoMesAtual() {
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();

    const pagamentos = await db.pagamentos.where('data').above(inicioMes).toArray();
    return pagamentos.reduce((sum, p) => sum + p.valor, 0);
}


// Update parcela due date
async function editarDataParcela(parcelaId, novaData) {
    return await db.parcelas.update(parcelaId, { dataVencimento: novaData });
}
