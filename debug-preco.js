require('dotenv').config();
const QueenBooksPersistentSearcher = require('./QueenBooksPersistentSearcher.js');
const fs = require('fs');

(async () => {
  try {
    const searcher = new QueenBooksPersistentSearcher();
    await searcher.init();
    await searcher.ensureAuthenticated();
    
    console.log('🔍 Baixando HTML da página do produto...');
    const response = await searcher.session.get('https://www.queenbooks.com.br/produtos/177776045', {
      headers: {
        ...searcher.defaultHeaders,
        ...(searcher.sessionData.cookies && { 'Cookie': searcher.sessionData.cookies })
      }
    });
    
    const html = response.data;
    
    // Salvar HTML para análise
    fs.writeFileSync('./debug-produto.html', html);
    console.log('💾 HTML salvo em debug-produto.html');
    
    // Procurar por padrões específicos
    console.log('\n🔍 Análise do HTML:');
    console.log('Tamanho:', html.length, 'caracteres');
    
    // Procurar AddToCartContainer
    const addToCart = html.match(/AddToCartContainer/gi) || [];
    console.log('📦 AddToCartContainer encontrados:', addToCart.length);
    
    // Procurar valores R$
    const rsValues = [...html.matchAll(/R\$\s*[0-9.,]+/gi)];
    console.log('💸 Valores R$ encontrados:', rsValues.length);
    if (rsValues.length > 0) {
      rsValues.slice(0, 5).forEach((match, i) => {
        console.log('   ', i+1, ':', match[0]);
      });
    }
    
    // Procurar especificamente por price
    const priceElements = html.match(/price[^>]{0,50}>/gi) || [];
    console.log('🏷️  Elementos price encontrados:', priceElements.length);
    
    // Procurar por 629,30 especificamente 
    const valor629 = html.includes('629,30');
    console.log('🎯 Valor 629,30 encontrado:', valor629);
    
    if (valor629) {
      // Extrair contexto ao redor de 629,30
      const pos = html.indexOf('629,30');
      const contexto = html.substring(pos - 100, pos + 100);
      console.log('📄 Contexto ao redor de 629,30:');
      console.log(contexto);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
})();
