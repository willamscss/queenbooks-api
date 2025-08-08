require('dotenv').config();
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false, // Deixar visível para debug
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🔍 BUSCA SIMPLES DO PREÇO');
    console.log('=' .repeat(50));
    
    // Interceptar requisições para Mercos API
    let apiCalls = [];
    
    page.on('response', async response => {
      const url = response.url();
      
      // Focar nas APIs do Mercos que carregam dados
      if (url.includes('mercos.com') || url.includes('api') || url.includes('produto')) {
        console.log(`📡 API: ${response.status()} ${url}`);
        
        try {
          if (response.status() === 200 && url.includes('api')) {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('json')) {
              const data = await response.json();
              apiCalls.push({ url, data });
              console.log(`📊 Dados JSON encontrados em: ${url}`);
            }
          }
        } catch (e) {
          // Ignorar erros de parsing
        }
      }
    });
    
    // Ir direto para o produto autenticado
    console.log('🔐 Navegando direto para produto (com cookies)...');
    
    // Primeiro, setar cookies se tivermos
    await page.goto('https://www.queenbooks.com.br/', { waitUntil: 'domcontentloaded' });
    
    // Tentar definir cookies de autenticação
    const cookies = [
      { name: 'sessionid', value: 'teste', domain: '.queenbooks.com.br' },
      { name: 'csrftoken', value: 'teste', domain: '.queenbooks.com.br' }
    ];
    
    await page.setCookie(...cookies);
    
    // Navegar para produto
    await page.goto('https://www.queenbooks.com.br/produtos/177776045', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log('⏳ Aguardando 8 segundos para JavaScript carregar...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Buscar preço na página
    const resultado = await page.evaluate(() => {
      const dados = {};
      
      // Buscar em todo o texto da página
      const textoCompleto = document.body.innerText || document.body.textContent || '';
      
      // Procurar especificamente por R$ seguido de números
      const precos = textoCompleto.match(/R\$\s*[\d.,]+/g) || [];
      dados.precos = precos.slice(0, 10); // Primeiros 10
      
      // Procurar especificamente por 629,30
      dados.tem629 = textoCompleto.includes('629,30');
      
      // Verificar se tem elementos de preço carregados
      dados.elementsPrice = document.querySelectorAll('[class*="price"], [class*="Price"]').length;
      dados.elementsCart = document.querySelectorAll('[class*="Cart"], [class*="cart"]').length;
      
      // Tamanho do HTML para verificar se carregou
      dados.htmlSize = document.body.innerHTML.length;
      
      return dados;
    });
    
    console.log('\\n📊 RESULTADOS:');
    console.log('💰 Preços encontrados:', resultado.precos);
    console.log('🎯 Tem 629,30:', resultado.tem629);
    console.log('🏷️ Elementos price:', resultado.elementsPrice);
    console.log('🛒 Elementos cart:', resultado.elementsCart);
    console.log('📏 HTML size:', resultado.htmlSize);
    
    console.log('\\n📡 APIs chamadas:', apiCalls.length);
    
    // Analisar dados das APIs
    for (const call of apiCalls) {
      console.log(`\\n🔍 API: ${call.url}`);
      const dataStr = JSON.stringify(call.data);
      
      // Procurar preço nos dados da API
      const precoMatch = dataStr.match(/["\']?(?:price|preco|valor)["\']?\\s*:\\s*([\\d.,]+)/i);
      if (precoMatch) {
        console.log(`💰 Preço encontrado na API: ${precoMatch[1]}`);
      }
      
      // Procurar por 629
      if (dataStr.includes('629')) {
        console.log(`🎯 Valor 629 encontrado na API!`);
        console.log(`📄 Dados: ${dataStr.substring(0, 200)}...`);
      }
    }
    
    console.log('\\n🔍 Aguardando mais 5 segundos...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Segunda verificação
    const resultadoFinal = await page.evaluate(() => {
      const textoCompleto = document.body.innerText || document.body.textContent || '';
      return {
        precos: textoCompleto.match(/R\$\s*[\d.,]+/g) || [],
        tem629: textoCompleto.includes('629,30'),
        htmlSize: document.body.innerHTML.length
      };
    });
    
    console.log('\\n📊 RESULTADOS FINAIS:');
    console.log('💰 Preços finais:', resultadoFinal.precos);
    console.log('🎯 Tem 629,30 final:', resultadoFinal.tem629);
    console.log('📏 HTML final:', resultadoFinal.htmlSize);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await browser.close();
  }
})();
