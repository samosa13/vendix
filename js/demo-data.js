/* ============================================
   VendIX - Demo Data (preloaded for first use)
   Only loads if database is empty
   ============================================ */

async function carregarDadosDemo() {
    // Check if already has data
    const produtos = await db.produtos.toArray();
    if (produtos.length > 0) return; // Already has data, skip

    // Config
    saveConfig({
        nomeNegocio: 'Alencar Vendas',
        dddPadrao: '62',
        jurosPadrao: 5,
        parcelasPadrao: 4,
        estoqueMinimoAlerta: 3,
        mensagemWhatsApp: 'Oi {nome}! Tudo bem? Passando para lembrar da parcela. Posso passar aí hoje?',
        horaBackup: '23:59',
        frequenciaBackup: 'diario',
        autoBackup: true,
        moeda: 'R$'
    });

    // Produtos
    await addProduto({nome:'Jogo de Panelas Antiaderente 5 peças', categoria:'panelas', precoCompra:120, precoVista:220, precoPrazo:280, estoque:6});
    await addProduto({nome:'Liquidificador Mondial 500W', categoria:'eletro', precoCompra:85, precoVista:160, precoPrazo:200, estoque:4});
    await addProduto({nome:'Jogo de Cama Casal King', categoria:'cama_mesa', precoCompra:65, precoVista:130, precoPrazo:160, estoque:8});
    await addProduto({nome:'Ventilador Arno 40cm', categoria:'eletro', precoCompra:95, precoVista:180, precoPrazo:220, estoque:2});
    await addProduto({nome:'Ferro de Passar a Vapor', categoria:'eletro', precoCompra:60, precoVista:110, precoPrazo:140, estoque:5});
    await addProduto({nome:'Jogo de Toalhas Banho 5 peças', categoria:'cama_mesa', precoCompra:40, precoVista:80, precoPrazo:100, estoque:10});
    await addProduto({nome:'Panela de Pressão 7L', categoria:'panelas', precoCompra:70, precoVista:140, precoPrazo:170, estoque:3});
    await addProduto({nome:'Sanduicheira Britânia', categoria:'eletro', precoCompra:45, precoVista:90, precoPrazo:110, estoque:0});

    // Clientes
    await addCliente({nome:'Dona Maria do Carmo', telefone:'62991234567', cidade:'Goiânia', bairro:'Setor Central', endereco:'Av. Goiás, 1580', referencia:'Casa azul com portão branco, perto da padaria'});
    await addCliente({nome:'João Pedro Silva', telefone:'62998765432', cidade:'Goiânia', bairro:'Setor Bueno', endereco:'Av. T-63, 1200', referencia:'Prédio ao lado do supermercado Carrefour'});
    await addCliente({nome:'Fernanda Oliveira', telefone:'62995551234', cidade:'Aparecida de Goiânia', bairro:'Vila Brasília', endereco:'Av. Rio Verde, 3500', referencia:'Vizinha da escola municipal, casa com muro verde'});
    await addCliente({nome:'Carlos Henrique Santos', telefone:'62997771111', cidade:'Goiânia', bairro:'Setor Sul', endereco:'Rua 90, 500', referencia:'Próximo ao posto Shell, casa com cachorro grande'});
    await addCliente({nome:'Ana Paula Ribeiro', telefone:'62993339999', cidade:'Goiânia', bairro:'Setor Oeste', endereco:'Av. Anhanguera, 5000', referencia:'Esquina com a sorveteria'});

    // Vendas com parcelas para demonstração
    const hoje = getToday();
    const ontem = new Date(); ontem.setDate(ontem.getDate()-1);
    const ha3dias = new Date(); ha3dias.setDate(ha3dias.getDate()-3);

    // Venda 1: Maria - Panelas 4x com 5% juros (parcela 1 vence hoje)
    const p1 = calcularParcelas(280, 4, 5, hoje, 0);
    p1[0].dataVencimento = hoje;
    await addVenda({clienteId:1, data:hoje, descricao:'Jogo de Panelas Antiaderente', itens:[{produtoId:1, quantidade:1}], valorTotal:280, tipo:'parcelado', numParcelas:4, taxaJuros:5, valorEntrada:0}, p1);

    // Venda 2: João - Liquidificador 3x (parcela 1 atrasada 1 dia)
    const p2 = calcularParcelas(200, 3, 0, hoje, 0);
    p2[0].dataVencimento = ontem.toISOString().split('T')[0];
    await addVenda({clienteId:2, data:ha3dias.toISOString().split('T')[0], descricao:'Liquidificador Mondial', itens:[{produtoId:2, quantidade:1}], valorTotal:200, tipo:'parcelado', numParcelas:3, taxaJuros:0, valorEntrada:0}, p2);

    // Venda 3: Fernanda - Jogo de Cama 2x (parcela 1 vence hoje)
    const p3 = calcularParcelas(160, 2, 0, hoje, 0);
    p3[0].dataVencimento = hoje;
    await addVenda({clienteId:3, data:hoje, descricao:'Jogo de Cama Casal', itens:[{produtoId:3, quantidade:1}], valorTotal:160, tipo:'parcelado', numParcelas:2, taxaJuros:0, valorEntrada:0}, p3);

    // Venda 4: Carlos - Ventilador 4x (parcela 1 vence hoje)
    const p4 = calcularParcelas(220, 4, 0, hoje, 0);
    p4[0].dataVencimento = hoje;
    await addVenda({clienteId:4, data:hoje, descricao:'Ventilador Arno 40cm', itens:[{produtoId:4, quantidade:1}], valorTotal:220, tipo:'parcelado', numParcelas:4, taxaJuros:0, valorEntrada:0}, p4);

    // Venda 5: Ana Paula - Ferro à vista (já paga)
    const pv = [{numero:1, valor:110, dataVencimento:hoje, status:'pago', dataPagamento:hoje, formaPagamento:'pix'}];
    await addVenda({clienteId:5, data:hoje, descricao:'Ferro de Passar a Vapor', itens:[{produtoId:5, quantidade:1}], valorTotal:110, tipo:'vista', numParcelas:1, taxaJuros:0, valorEntrada:0}, pv);

    // Venda 6: Ana Paula - Panela de Pressão 5x (parcela 1 vence hoje)
    const p6 = calcularParcelas(170, 5, 0, hoje, 0);
    p6[0].dataVencimento = hoje;
    await addVenda({clienteId:5, data:hoje, descricao:'Panela de Pressão 7L', itens:[{produtoId:7, quantidade:1}], valorTotal:170, tipo:'parcelado', numParcelas:5, taxaJuros:0, valorEntrada:0}, p6);

    // === HISTORICAL DATA (July) for reports comparison ===
    const julho = '2026-07';
    
    // Insert vendas de julho directly (bypass addVenda to avoid stock issues)
    await db.vendas.add({clienteId:1, data:`${julho}-10`, descricao:'Jogo de Toalhas', itens:[], valorTotal:100, tipo:'vista', numParcelas:1, taxaJuros:0, valorEntrada:0, status:'quitada', criadoEm:`${julho}-10T08:00:00.000Z`});
    await db.vendas.add({clienteId:4, data:`${julho}-18`, descricao:'Ferro de Passar', itens:[], valorTotal:110, tipo:'vista', numParcelas:1, taxaJuros:0, valorEntrada:0, status:'quitada', criadoEm:`${julho}-18T08:00:00.000Z`});
    await db.vendas.add({clienteId:3, data:`${julho}-05`, descricao:'Jogo de Cama', itens:[], valorTotal:160, tipo:'parcelado', numParcelas:3, taxaJuros:0, valorEntrada:0, status:'aberta', criadoEm:`${julho}-05T08:00:00.000Z`});

    // Parcelas de julho (vendaId will be 7,8,9 since previous were 1-6)
    const vendaIdBase = 6; // last venda from agosto block
    await db.parcelas.add({vendaId:vendaIdBase+1, clienteId:1, numero:1, valor:100, dataVencimento:`${julho}-15`, status:'pago', dataPagamento:`${julho}-15`, formaPagamento:'dinheiro'});
    await db.parcelas.add({vendaId:vendaIdBase+2, clienteId:4, numero:1, valor:110, dataVencimento:`${julho}-20`, status:'pago', dataPagamento:`${julho}-20`, formaPagamento:'pix'});
    await db.parcelas.add({vendaId:vendaIdBase+3, clienteId:3, numero:1, valor:53.33, dataVencimento:`${julho}-10`, status:'pago', dataPagamento:`${julho}-10`, formaPagamento:'dinheiro'});
    await db.parcelas.add({vendaId:vendaIdBase+3, clienteId:3, numero:2, valor:53.33, dataVencimento:`${julho}-25`, status:'pago', dataPagamento:`${julho}-25`, formaPagamento:'pix'});
    await db.parcelas.add({vendaId:vendaIdBase+3, clienteId:3, numero:3, valor:53.34, dataVencimento:'2026-08-25', status:'pendente'});

    // Pagamentos de julho
    await db.pagamentos.add({parcelaId:200, vendaId:vendaIdBase+1, clienteId:1, valor:100, data:`${julho}-15T10:00:00.000Z`, forma:'dinheiro'});
    await db.pagamentos.add({parcelaId:201, vendaId:vendaIdBase+2, clienteId:4, valor:110, data:`${julho}-20T14:00:00.000Z`, forma:'pix'});
    await db.pagamentos.add({parcelaId:202, vendaId:vendaIdBase+3, clienteId:3, valor:53.33, data:`${julho}-10T09:00:00.000Z`, forma:'dinheiro'});
    await db.pagamentos.add({parcelaId:203, vendaId:vendaIdBase+3, clienteId:3, valor:53.33, data:`${julho}-25T11:00:00.000Z`, forma:'pix'});

    // === INACTIVE ITEMS FOR DEMO ===
    // Inactivate sanduicheira (stock 0) 
    await db.produtos.update(8, { ativo: 0, inativoDesde: '2026-07-20' });

    // Add an inactive client
    await addCliente({nome:'Roberto Antigo', telefone:'62911112222', cidade:'Goiânia', bairro:'Setor Norte', endereco:'Rua 5, 100', referencia:'Mudou de cidade'});
    const allClientes = await db.clientes.toArray();
    const roberto = allClientes[allClientes.length - 1];
    await db.clientes.update(roberto.id, { ativo: 0, inativoDesde: '2026-06-15' });

    // === MORE OVERDUE PARCELAS FOR DEMO ===
    // Make some parcelas overdue (5 days ago and 12 days ago)
    const ha5dias = new Date(); ha5dias.setDate(ha5dias.getDate()-5);
    const ha12dias = new Date(); ha12dias.setDate(ha12dias.getDate()-12);
    
    // João - parcela atrasada 12 dias
    const pAtrasada1 = [{numero:1, valor:55, dataVencimento: ha12dias.toISOString().split('T')[0], status:'pendente'}];
    await db.vendas.add({clienteId:2, data:'2026-07-15', descricao:'Ventilador (atrasada)', itens:[], valorTotal:55, tipo:'parcelado', numParcelas:1, taxaJuros:0, valorEntrada:0, status:'aberta', criadoEm:'2026-07-15'});
    const lastVenda1 = (await db.vendas.toArray()).pop();
    await db.parcelas.add({vendaId:lastVenda1.id, clienteId:2, numero:1, valor:55, dataVencimento: ha12dias.toISOString().split('T')[0], status:'pendente'});

    // Fernanda - parcela atrasada 5 dias
    const lastVenda2Id = (await db.vendas.add({clienteId:3, data:'2026-07-20', descricao:'Toalhas (atrasada)', itens:[], valorTotal:80, tipo:'parcelado', numParcelas:1, taxaJuros:0, valorEntrada:0, status:'aberta', criadoEm:'2026-07-20'}));
    await db.parcelas.add({vendaId:lastVenda2Id, clienteId:3, numero:1, valor:80, dataVencimento: ha5dias.toISOString().split('T')[0], status:'pendente'});

    console.log('VendIX: Demo data loaded');
}
