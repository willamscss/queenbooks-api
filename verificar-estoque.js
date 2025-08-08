const QueenBooksStockChecker = require('./QueenBooksStockChecker');

// IDs dos produtos para verificar (adicione ou remova conforme necessário)
const PRODUTOS = [
  '177776741',
  '177776553', 
  '207737053',
  '209942088'
];

(async () => {
  console.log('=' .repeat(60));
  console.log('VERIFICAÇÃO DE ESTOQUE QUEENBOOKS');
  console.log(new Date().toLocaleString('pt-BR'));
  console.log('=' .repeat(60));
  
  const checker = new QueenBooksStockChecker({
    headless: true, // true = rodar em background
    username: 'willamscss@outlook.com',
    password: '618536'
  });

  try {
    await checker.init();
    
    const resultados = await checker.verificarMultiplosEstoques(PRODUTOS);
    
    console.log('\n' + '=' .repeat(60));
    console.log('RESUMO FINAL');
    console.log('=' .repeat(60));
    
    resultados.forEach(r => {
      console.log(`\nProduto: ${r.produtoId}`);
      console.log(`Título: ${r.titulo || 'N/A'}`);
      console.log(`Preço: ${r.preco || 'N/A'}`);
      console.log(`Estoque: ${r.estoque !== null ? r.estoque + ' unidades' : 'Não disponível'}`);
      console.log(`Status: ${r.disponivel ? '✅ Disponível' : '❌ Indisponível'}`);
    });
    
    // Salvar em arquivo JSON
    const fs = require('fs');
    const arquivo = `estoque-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(arquivo, JSON.stringify(resultados, null, 2));
    console.log(`\n💾 Resultados salvos em: ${arquivo}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await checker.close();
  }
})();
