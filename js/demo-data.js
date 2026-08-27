/* ============================================
   VendIX - Demo Data (preloaded for first use)
   Only loads if database is empty.
   Covers ALL app scenarios for testing.
   ============================================ */

async function carregarDadosDemo() {
    // Check if already has data
    const produtos = await db.produtos.toArray();
    if (produtos.length > 0) return;

    const hoje = getToday();
    const ha3dias = new Date(); ha3dias.setDate(ha3dias.getDate()-3);
    const ha7dias = new Date(); ha7dias.setDate(ha7dias.getDate()-7);
    const ha12dias = new Date(); ha12dias.setDate(ha12dias.getDate()-12);
    const em7dias = new Date(); em7dias.setDate(em7dias.getDate()+7);
    const em15dias = new Date(); em15dias.setDate(em15dias.getDate()+15);
    const em30dias = new Date(); em30dias.setDate(em30dias.getDate()+30);

    // Helper for safe date strings
    const ds = (d) => dateToLocalStr(d);

    // Config
    saveConfig({
        nomeNegocio: 'Alencar Enxovais',
        dddPadrao: '49',
        jurosPadrao: 5,
        parcelasPadrao: 4,
        estoqueMinimoAlerta: 3,
        mensagemWhatsApp: 'Oi {nome}! Tudo bem? Passando para lembrar da parcela. Posso passar aí hoje?',
        horaBackup: '23:59',
        frequenciaBackup: 'diario',
        autoBackup: true,
        mostrarRotaMaps: true,
        agruparVendasCliente: false,
        moeda: 'R$'
    });

    // === PRODUTOS (8 ativos + 1 inativo) ===
    await addProduto({nome:'Jogo de Panelas Antiaderente 5pç', categoria:'panelas', precoCompra:120, precoVista:220, precoPrazo:280, estoque:6});
    await addProduto({nome:'Liquidificador Mondial 500W', categoria:'eletro', precoCompra:85, precoVista:160, precoPrazo:200, estoque:2}); // stock baixo
    await addProduto({nome:'Jogo de Cama Casal King', categoria:'cama_mesa', precoCompra:65, precoVista:130, precoPrazo:160, estoque:8});
    await addProduto({nome:'Ventilador Arno 40cm', categoria:'eletro', precoCompra:95, precoVista:180, precoPrazo:220, estoque:1}); // stock baixo
    await addProduto({nome:'Ferro de Passar a Vapor', categoria:'eletro', precoCompra:60, precoVista:110, precoPrazo:140, estoque:5});
    await addProduto({nome:'Jogo de Toalhas Banho 5pç', categoria:'cama_mesa', precoCompra:40, precoVista:80, precoPrazo:100, estoque:10});
    await addProduto({nome:'Panela de Pressão 7L', categoria:'panelas', precoCompra:70, precoVista:140, precoPrazo:170, estoque:3}); // stock limite
    await addProduto({nome:'Air Fryer Mondial 4L', categoria:'eletro', precoCompra:180, precoVista:320, precoPrazo:400, estoque:4});
    // Produto inativo
    await addProduto({nome:'Sanduicheira Britânia (descontinuada)', categoria:'eletro', precoCompra:45, precoVista:90, precoPrazo:110, estoque:0});
    await db.produtos.update(9, { ativo: 0, inativoDesde: '2026-07-15' });

    // === CLIENTES (5 ativos + 1 inativo) ===
    await addCliente({nome:'Dona Maria do Carmo', telefone:'49991234567', cidade:'Lages', bairro:'Centro', endereco:'Rua Frei Rogério, 500', referencia:'Casa azul com portão branco'});
    await addCliente({nome:'João Pedro Silva', telefone:'49998765432', cidade:'Lages', bairro:'Coral', endereco:'Av. Presidente Vargas, 1200', referencia:'Prédio ao lado da farmácia'});
    await addCliente({nome:'Fernanda Oliveira', telefone:'49995551234', cidade:'São Joaquim', bairro:'Centro', endereco:'Rua Marcos Batista, 88', referencia:'Casa com muro verde'});
    await addCliente({nome:'Carlos Henrique Santos', telefone:'49997771111', cidade:'Lages', bairro:'Universitário', endereco:'Rua Santos Dumont, 300', referencia:'Perto do posto Shell'});
    await addCliente({nome:'Ana Paula Ribeiro', telefone:'49993339999', cidade:'Otacílio Costa', bairro:'Centro', endereco:'Rua XV de Novembro, 50', referencia:'Esquina com a sorveteria'});
    // Cliente inativo (con ventas pendientes para demo)
    await addCliente({nome:'Roberto Antigo', telefone:'49911112222', cidade:'Lages', bairro:'Habitação', endereco:'Rua das Araucárias, 75', referencia:'Mudou de bairro'});
    await db.clientes.update(6, { ativo: 0, inativoDesde: '2026-07-01' });

    // === VENDAS ACTIVAS (con parcelas en distintos estados) ===

    // Venda 1: Maria - Panelas 4x con 5% juros (parcela 1 vence HOY, parcela 2-4 futuras)
    const p1 = calcularParcelas(280, 4, 5, hoje, 0);
    p1[0].dataVencimento = hoje;
    await addVenda({clienteId:1, data:hoje, descricao:'Jogo de Panelas Antiaderente', itens:[{produtoId:1, quantidade:1}], valorTotal:280, tipo:'parcelado', numParcelas:4, taxaJuros:5, valorEntrada:0}, p1);

    // Venda 2: João - Liquidificador 3x SIN juros (parcela 1 ATRASADA 7 dias)
    const p2 = calcularParcelas(200, 3, 0, hoje, 0);
    p2[0].dataVencimento = ds(ha7dias);
    await addVenda({clienteId:2, data:ds(ha12dias), descricao:'Liquidificador Mondial', itens:[{produtoId:2, quantidade:1}], valorTotal:200, tipo:'parcelado', numParcelas:3, taxaJuros:0, valorEntrada:0}, p2);

    // Venda 3: Fernanda - Jogo de Cama 2x (parcela 1 vence hoy)
    const p3 = calcularParcelas(160, 2, 0, hoje, 0);
    p3[0].dataVencimento = hoje;
    await addVenda({clienteId:3, data:hoje, descricao:'Jogo de Cama Casal', itens:[{produtoId:3, quantidade:1}], valorTotal:160, tipo:'parcelado', numParcelas:2, taxaJuros:0, valorEntrada:0}, p3);

    // Venda 4: Carlos - Ventilador 4x (parcela 1 ATRASADA 12 dias)
    const p4 = calcularParcelas(220, 4, 0, hoje, 0);
    p4[0].dataVencimento = ds(ha12dias);
    await addVenda({clienteId:4, data:ds(ha12dias), descricao:'Ventilador Arno 40cm', itens:[{produtoId:4, quantidade:1}], valorTotal:220, tipo:'parcelado', numParcelas:4, taxaJuros:0, valorEntrada:0}, p4);

    // Venda 5: Ana Paula - Ferro à vista (QUITADA - paga hoy)
    const pv = [{numero:1, valor:110, dataVencimento:hoje, status:'pago', dataPagamento:hoje, formaPagamento:'pix'}];
    await addVenda({clienteId:5, data:hoje, descricao:'Ferro de Passar a Vapor', itens:[{produtoId:5, quantidade:1}], valorTotal:110, tipo:'vista', numParcelas:1, taxaJuros:0, valorEntrada:0}, pv);

    // Venda 6: Ana Paula - Air Fryer 5x con ENTRADA R$100 (parcela 1 vence en 7 dias)
    const p6 = calcularParcelas(400, 5, 0, hoje, 100);
    p6[0].dataVencimento = ds(em7dias);
    await addVenda({clienteId:5, data:hoje, descricao:'Air Fryer Mondial 4L', itens:[{produtoId:8, quantidade:1}], valorTotal:400, tipo:'parcelado', numParcelas:5, taxaJuros:0, valorEntrada:100}, p6);

    // Venda 7: Maria (segunda compra) - Toalhas 3x con PAGO PARCIAL en parcela 1
    const p7 = calcularParcelas(100, 3, 0, ds(ha7dias), 0);
    p7[0].dataVencimento = ds(ha3dias); // atrasada 3 dias
    await addVenda({clienteId:1, data:ds(ha7dias), descricao:'Jogo de Toalhas Banho', itens:[{produtoId:6, quantidade:1}], valorTotal:100, tipo:'parcelado', numParcelas:3, taxaJuros:0, valorEntrada:0}, p7);
    // Mark parcela 1 as partial payment (paid 20 of 33.33)
    const parcV7 = await db.parcelas.where('vendaId').equals(7).toArray();
    if (parcV7.length > 0) {
        await db.parcelas.update(parcV7[0].id, { valorPago: 20, status: 'parcial' });
        await db.pagamentos.add({parcelaId: parcV7[0].id, vendaId:7, clienteId:1, valor:20, data: ha3dias.toISOString(), forma:'dinheiro'});
    }

    // Venda 8: Roberto (CLIENTE INATIVO) - Panela de Pressão 4x pendiente
    const p8 = calcularParcelas(170, 4, 0, ds(ha7dias), 0);
    p8[0].dataVencimento = ds(ha3dias); // atrasada
    await addVenda({clienteId:6, data:ds(ha7dias), descricao:'Panela de Pressão 7L', itens:[{produtoId:7, quantidade:1}], valorTotal:170, tipo:'parcelado', numParcelas:4, taxaJuros:0, valorEntrada:0}, p8);

    // === VENDAS HISTÓRICAS (julio - para relatórios comparativo) ===
    const julho = '2026-07';
    await db.vendas.add({clienteId:1, data:`${julho}-10`, descricao:'Jogo de Toalhas (jul)', itens:[], valorTotal:100, tipo:'vista', numParcelas:1, taxaJuros:0, valorEntrada:0, status:'quitada', criadoEm:`${julho}-10T08:00:00.000Z`});
    await db.vendas.add({clienteId:4, data:`${julho}-18`, descricao:'Ferro de Passar (jul)', itens:[], valorTotal:110, tipo:'vista', numParcelas:1, taxaJuros:0, valorEntrada:0, status:'quitada', criadoEm:`${julho}-18T08:00:00.000Z`});
    await db.parcelas.add({vendaId:9, clienteId:1, numero:1, valor:100, dataVencimento:`${julho}-15`, status:'pago', dataPagamento:`${julho}-15`, formaPagamento:'dinheiro'});
    await db.parcelas.add({vendaId:10, clienteId:4, numero:1, valor:110, dataVencimento:`${julho}-20`, status:'pago', dataPagamento:`${julho}-20`, formaPagamento:'pix'});
    await db.pagamentos.add({parcelaId:300, vendaId:9, clienteId:1, valor:100, data:`${julho}-15T10:00:00.000Z`, forma:'dinheiro'});
    await db.pagamentos.add({parcelaId:301, vendaId:10, clienteId:4, valor:110, data:`${julho}-20T14:00:00.000Z`, forma:'pix'});

    console.log('VendIX: Demo data loaded — all scenarios covered');
}
