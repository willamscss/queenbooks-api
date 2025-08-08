/**
 * TESTE PRODUÇÃO: MODO HEADLESS (SEM INTERFACE)
 * 
 * Script para testar em modo produção sem abrir navegador
 */

const QueenBooksBotaoLoginSearcher = require('./QueenBooksBotaoLoginSearcher');

async function testarModoProducao() {
  console.log('🎯 TESTE: MODO PRODUÇÃO (HEADLESS)');
  console.log('=' .repeat(60));
  
  const searcher = new QueenBooksBotaoLoginSearcher({
    username: 'willamscss@outlook.com',
    password: '618536',
    headless: true,  // Forçar modo headless
    debug: false     // Sem delays de debug
  });

  try {
    const startTime = Date.now();
    
    // Inicializar
    await searcher.init();
    console.log('🚀 Browser inicializado em modo headless');
    
    // Testar com um produto
    const codigo = '211042617';
    
    console.log(`🧪 Testando busca para produto: ${codigo}`);
    
    const resultado = await searcher.buscarProdutoComPreco(codigo);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n📊 RESULTADO FINAL:');
    console.log('=' .repeat(40));
    console.log(JSON.stringify(resultado, null, 2));
    
    if (resultado.preco_autenticado) {
      console.log('\n🎉 SUCESSO! Preço extraído em modo produção!');
      console.log(`💰 Preço: R$ ${resultado.preco_autenticado.toFixed(2).replace('.', ',')}`);
      console.log(`⏱️ Tempo total: ${duration}s`);
    } else {
      console.log('\n❌ Preço não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await searcher.close();
    console.log('\n✅ Teste de produção finalizado');
  }
}

// Executar teste
testarModoProducao().catch(console.error);
