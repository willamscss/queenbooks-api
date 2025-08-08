const QueenBooksStockChecker = require('./QueenBooksStockChecker');

console.log('🚀 INICIANDO TESTE DE ESTOQUE QUEENBOOKS');
console.log('=========================================\n');

(async () => {
  const checker = new QueenBooksStockChecker({
    headless: false,  // FALSE para ver o navegador funcionando
    username: 'willamscss',
    password: '618536'
  });

  try {
    await checker.init();
    
    // Produto para testar
    const produtoId = '209942088';
    console.log(`Testando produto: ${produtoId}\n`);
    
    const resultado = await checker.verificarEstoque(produtoId);
    
    console.log('\n✅ RESULTADO:');
    console.log(`Estoque: ${resultado.estoque} unidades`);
    console.log(`Preço: ${resultado.preco}`);
    console.log(`Disponível: ${resultado.disponivel ? 'SIM' : 'NÃO'}`);
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    await checker.close();
  }
})();
