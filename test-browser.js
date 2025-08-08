require('dotenv').config();
const QueenBooksBrowserSearcher = require('./QueenBooksBrowserSearcher.js');

(async () => {
  const searcher = new QueenBooksBrowserSearcher();
  
  try {
    console.log('🔬 Teste com Browser (JavaScript)...');
    await searcher.init();
    
    const resultado = await searcher.buscarProdutoComPreco('177776045');
    
    console.log('\n📊 Resultado final:');
    console.log('✅ Encontrado:', resultado.encontrado);
    console.log('📚 Título:', resultado.titulo);
    console.log('💰 Preço:', resultado.preco_autenticado ? `R$ ${resultado.preco_autenticado.toFixed(2).replace('.', ',')}` : 'Não encontrado');
    console.log('📋 Informações:', resultado.informacoes);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await searcher.close();
  }
})();
