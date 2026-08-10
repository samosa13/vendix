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

    console.log('VendIX: Demo data loaded');
}
