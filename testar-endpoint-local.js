/**
 * TESTE DO ENDPOINT LOCAL COM PREÇOS
 * 
 * Demonstra o retorno completo da API
 */

const QueenBooksBotaoLoginSearcher = require('./QueenBooksBotaoLoginSearcher');

async function testarEndpointLocal() {
  console.log('🚀 TESTE DO ENDPOINT LOCAL COM PREÇOS');
  console.log('=' .repeat(50));
  
  const searcher = new QueenBooksBotaoLoginSearcher({
    headless: true,
    debug: false
  });

  try {
    console.log('🔧 Inicializando browser...');
    await searcher.init();
    
    console.log('🎯 Testando produto: 177776045 (Aspen Style)');
    
    const startTime = Date.now();
    const produto = await searcher.buscarProdutoComPreco('177776045');
    const endTime = Date.now();
    
    // Simular resposta da API
    const resposta = {
      sucesso: true,
      encontrado: produto.titulo && produto.titulo.length > 0,
      autenticado: true,
      sessao_persistente: true,
      produto: {
        id: produto.idSite,
        codigo_isbn: produto.codigoIsbn,
        titulo: produto.titulo,
        descricao: produto.descricao || "",
        preco: produto.preco,
        preco_autenticado: produto.preco_autenticado,
        status: produto.status || "unknown",
        url_produto: produto.urlProduto,
        fotos: produto.fotos || [],
        total_fotos: (produto.fotos || []).length,
        informacoes: produto.informacoes || {},
        categoria_sugerida: produto.informacoes?.Editora?.toLowerCase().includes('assouline') ? 'Livros de Luxo' : 'Livros Importados',
        dropshipping: {
          adequado_dropshipping: true,
          margem_sugerida: produto.informacoes?.Editora?.toLowerCase().includes('assouline') ? '20-35%' : '15-25%',
          publico_alvo: produto.informacoes?.Editora?.toLowerCase().includes('assouline') ? 'Colecionadores de livros de luxo' : 'Leitores interessados em livros importados',
          nivel_concorrencia: 'medio',
          potencial_vendas: 'bom',
          preco_base: produto.preco
        }
      },
      tempo_execucao: `${((endTime - startTime) / 1000).toFixed(2)}s`,
      timestamp: new Date().toISOString()
    };
    
    if (produto.erro) {
      resposta.sucesso = false;
      resposta.erro = produto.erro;
    }
    
    if (!produto.titulo || produto.titulo.length === 0) {
      resposta.encontrado = false;
      resposta.mensagem = 'Produto não encontrado ou sem dados válidos';
    }
    
    console.log('\n📋 RESPOSTA COMPLETA DO ENDPOINT:');
    console.log('=' .repeat(50));
    console.log(JSON.stringify(resposta, null, 2));
    
    await searcher.close();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await searcher.close();
  }
}

// Executar teste
testarEndpointLocal().catch(console.error);
