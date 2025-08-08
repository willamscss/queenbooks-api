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
    // Interceptar todas as requisições de rede
    const networkRequests = [];
    
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    });
    
    page.on('response', response => {
      console.log(`📡 ${response.status()} ${response.url()}`);
    });
    
    console.log('🔍 INVESTIGAÇÃO COM BROWSER REAL');
    console.log('=' .repeat(50));
    
    // 1. Fazer login
    console.log('🔐 Fazendo login...');
    await page.goto('https://www.queenbooks.com.br/entrar', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Aguardar página carregar
    await page.waitForTimeout(3000);
    
    // Verificar se formulário apareceu
    const hasLoginForm = await page.evaluate(() => {
      return !!(document.querySelector('input[type="email"], input[placeholder*="mail"], .LoginForm__input') ||
               document.querySelector('input[type="password"], input[placeholder*="senha"], input[placeholder*="Senha"]'));
    });
    
    console.log('📋 Formulário de login encontrado:', hasLoginForm);
    
    if (hasLoginForm) {
      // Aguardar e preencher formulário
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Tentar diferentes seletores para email
      const emailSelectors = [
        'input[type="email"]',
        'input[placeholder*="mail"]', 
        'input[placeholder*="E-mail"]',
        '.LoginForm__input[type="email"]',
        'input.LoginForm__input:first-child'
      ];
      
      let emailPreenchido = false;
      for (const selector of emailSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.type('willamscss@outlook.com');
            console.log(`✅ Email preenchido com: ${selector}`);
            emailPreenchido = true;
            break;
          }
        } catch (e) {}
      }
      
      // Tentar diferentes seletores para senha
      const passwordSelectors = [
        'input[type="password"]',
        'input[placeholder*="senha"]',
        'input[placeholder*="Senha"]', 
        '.LoginForm__input[type="password"]',
        'input.LoginForm__input:last-child'
      ];
      
      let senhaPreenchida = false;
      for (const selector of passwordSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.type('618536');
            console.log(`✅ Senha preenchida com: ${selector}`);
            senhaPreenchida = true;
            break;
          }
        } catch (e) {}
      }
      
      if (emailPreenchido && senhaPreenchida) {
        console.log('🚀 Submetendo formulário...');
        
        // Tentar submeter
        try {
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
            page.keyboard.press('Enter') // Ou procurar botão
          ]);
        } catch (e) {
          console.log('⚠️ Tentando clicar em botão...');
          await page.click('button[type="submit"], .btn-primary, input[type="submit"]');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
    
    // 2. Navegar para produto
    console.log('📄 Navegando para produto...');
    await page.goto('https://www.queenbooks.com.br/produtos/177776045', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // 3. Aguardar JavaScript carregar
    console.log('⏳ Aguardando JavaScript carregar...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 4. Procurar preço na página carregada
    console.log('🔍 Procurando preço na página...');
    
    const dadosPagina = await page.evaluate(() => {
      const dados = {};
      
      // Título
      dados.titulo = document.title;
      
      // Procurar preço de várias formas
      const precoSelectors = [
        'h3[class*="price"]',
        '.price',
        '[class*="Price"]',
        '[class*="AddToCartContainer"]',
        'span:contains("R$")',
        'div:contains("R$")'
      ];
      
      dados.precos = [];
      
      // Procurar em todo o texto da página
      const bodyText = document.body.innerText || document.body.textContent || '';
      const precoMatches = bodyText.match(/R\$\s*[\d.,]+/g) || [];
      dados.precos = precoMatches;
      
      // Procurar especificamente por 629,30
      dados.tem629 = bodyText.includes('629,30') || bodyText.includes('629.30');
      
      // HTML do body para debug
      dados.htmlLength = document.body.innerHTML.length;
      
      return dados;
    });
    
    console.log('\n📊 RESULTADOS:');
    console.log('📚 Título:', dadosPagina.titulo);
    console.log('💰 Preços encontrados:', dadosPagina.precos);
    console.log('🎯 Tem 629,30:', dadosPagina.tem629);
    console.log('📏 HTML carregado:', dadosPagina.htmlLength, 'chars');
    
    // 5. Aguardar mais tempo e tentar novamente
    console.log('\n⏳ Aguardando mais 10 segundos...');
    await page.waitForTimeout(10000);
    
    const dadosFinal = await page.evaluate(() => {
      const bodyText = document.body.innerText || document.body.textContent || '';
      return {
        precos: bodyText.match(/R\$\s*[\d.,]+/g) || [],
        tem629: bodyText.includes('629,30') || bodyText.includes('629.30'),
        htmlLength: document.body.innerHTML.length
      };
    });
    
    console.log('📊 RESULTADOS FINAIS:');
    console.log('💰 Preços encontrados:', dadosFinal.precos);
    console.log('🎯 Tem 629,30:', dadosFinal.tem629);
    console.log('📏 HTML final:', dadosFinal.htmlLength, 'chars');
    
    // Manter browser aberto para debug manual
    console.log('\n🔍 Browser permanece aberto para debug manual...');
    console.log('⏳ Aguardando 30 segundos...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await browser.close();
  }
})();
