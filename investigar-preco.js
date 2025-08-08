require('dotenv').config();
const QueenBooksPersistentSearcher = require('./QueenBooksPersistentSearcher.js');
const fs = require('fs');

(async () => {
  try {
    const searcher = new QueenBooksPersistentSearcher();
    await searcher.init();
    await searcher.ensureAuthenticated();
    
    console.log('🔍 INVESTIGAÇÃO DETALHADA DO PREÇO');
    console.log('=' .repeat(50));
    
    // 1. Fazer múltiplas requisições com diferentes headers
    const headers = [
      { ...searcher.defaultHeaders, 'Accept': 'application/json' },
      { ...searcher.defaultHeaders, 'X-Requested-With': 'XMLHttpRequest' },
      { ...searcher.defaultHeaders, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
    ];
    
    for (let i = 0; i < headers.length; i++) {
      console.log(`\n🔍 Tentativa ${i+1} - Headers específicos...`);
      
      const response = await searcher.session.get('https://www.queenbooks.com.br/produtos/177776045', {
        headers: {
          ...headers[i],
          ...(searcher.sessionData.cookies && { 'Cookie': searcher.sessionData.cookies })
        }
      });
      
      const html = response.data;
      console.log(`📏 Tamanho HTML: ${html.length} chars`);
      
      // Salvar HTML para análise
      fs.writeFileSync(`./debug-html-${i+1}.html`, html);
      
      // Procurar preço com regex mais agressivo
      const precoPatterns = [
        /R\$\s*(\d+,\d+)/g,
        /R\$\s*(\d+\.\d+)/g,
        /price[^}]*(\d+[.,]\d+)/gi,
        /"price"[^}]*(\d+[.,]\d+)/gi,
        /valor[^}]*(\d+[.,]\d+)/gi,
        /629[.,]30/g,
        /AddToCartContainer[^}]*(\d+[.,]\d+)/gi
      ];
      
      let precoEncontrado = false;
      for (const pattern of precoPatterns) {
        const matches = [...html.matchAll(pattern)];
        if (matches.length > 0) {
          console.log(`💰 Padrão encontrado: ${pattern.toString()}`);
          matches.forEach((match, idx) => {
            console.log(`   ${idx+1}. ${match[0]}`);
          });
          precoEncontrado = true;
        }
      }
      
      if (!precoEncontrado) {
        console.log('❌ Nenhum padrão de preço encontrado');
      }
    }
    
    // 2. Tentar buscar usando fetch interno (JavaScript)
    console.log('\n🔍 Tentando simular requisições JavaScript...');
    
    const jsHeaders = {
      ...searcher.defaultHeaders,
      'Accept': '*/*',
      'X-Requested-With': 'XMLHttpRequest',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
      'Referer': 'https://www.queenbooks.com.br/produtos/177776045'
    };
    
    // Endpoints que podem ter preço
    const endpoints = [
      '/api/pricing/177776045',
      '/api/product/177776045/price',
      '/pricing/177776045',
      '/produto/177776045/preco',
      '/api/b2b/product/177776045',
      '/mercos/pricing/177776045'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Testando: ${endpoint}`);
        const response = await searcher.session.get(`https://www.queenbooks.com.br${endpoint}`, {
          headers: {
            ...jsHeaders,
            ...(searcher.sessionData.cookies && { 'Cookie': searcher.sessionData.cookies })
          }
        });
        
        if (response.status === 200) {
          console.log(`✅ Endpoint encontrado: ${endpoint}`);
          console.log(`📄 Resposta: ${JSON.stringify(response.data).substring(0, 200)}...`);
          
          // Tentar parsear preço
          const text = JSON.stringify(response.data);
          const precoMatch = text.match(/(\d+[.,]\d+)/);
          if (precoMatch) {
            console.log(`💰 Possível preço: ${precoMatch[1]}`);
          }
        }
      } catch (error) {
        // Continue tentando
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
})();
