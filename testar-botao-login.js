/**
 * TESTE: BUSCA VIA BOTÃO "ACESSE PARA COMPRAR"
 * 
 * Script para testar a nova abordagem de clicar no botão
 */

const QueenBooksBotaoLoginSearcher = require('./QueenBooksBotaoLoginSearcher');

async function testarBotaoLogin() {
  console.log('🎯 TESTE: BOTÃO "ACESSE PARA COMPRAR"');
  console.log('=' .repeat(60));
  
  const searcher = new QueenBooksBotaoLoginSearcher({
    username: 'willamscss@outlook.com',
    password: '618536',
    headless: false,  // Modo visual para debug
    debug: true       // Com delays para observação
  });

  try {
    // Inicializar
    await searcher.init();
    
    // Testar com um produto
    const codigo = '211042617'; // Novo produto para teste
    
    console.log(`🧪 Testando busca para produto: ${codigo}`);
    
    const resultado = await searcher.buscarProdutoComPreco(codigo);
    
    console.log('\n📊 RESULTADO FINAL:');
    console.log('=' .repeat(40));
    console.log(JSON.stringify(resultado, null, 2));
    
    if (resultado.preco_autenticado) {
      console.log('\n🎉 SUCESSO! Preço extraído via botão login!');
      console.log(`💰 Preço: R$ ${resultado.preco_autenticado.toFixed(2).replace('.', ',')}`);
    } else {
      console.log('\n❌ Preço não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    // Aguardar um pouco para debug
    console.log('\n⏳ Aguardando 10 segundos antes de fechar...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await searcher.close();
  }
}

// Executar teste
testarBotaoLogin().catch(console.error);
