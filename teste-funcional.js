const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 TESTE DE ESTOQUE QUEENBOOKS');
  console.log('================================\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Ver o navegador
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. LOGIN
    console.log('📍 Passo 1: Acessando página de login...');
    await page.goto('https://www.queenbooks.com.br/entrar', {
      waitUntil: 'networkidle0'
    });
    
    console.log('📝 Passo 2: Preenchendo credenciais...');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'willamscss', {delay: 100});
    await page.type('input[type="password"]', '618536', {delay: 100});
    
    console.log('🔐 Passo 3: Fazendo login...');
    await page.keyboard.press('Enter');
    
    // Aguardar 3 segundos
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 2. ACESSAR PRODUTO
    const produtoId = '209942088';
    console.log(`\n📦 Passo 4: Acessando produto ${produtoId}...`);
    await page.goto(`https://www.queenbooks.com.br/produtos/${produtoId}`, {
      waitUntil: 'networkidle0'
    });
    
    // Aguardar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. VERIFICAR PREÇO
    console.log('💰 Passo 5: Capturando preço...');
    const preco = await page.evaluate(() => {
      const el = document.querySelector('h3[class*="price"]');
      return el ? el.textContent.trim() : 'Não encontrado';
    });
    console.log(`   Preço: ${preco}`);
    
    // 4. INSERIR QUANTIDADE
    console.log('\n🔢 Passo 6: Inserindo quantidade alta...');
    const inputExists = await page.$('input[type="number"]');
    
    if (inputExists) {
      await page.click('input[type="number"]', {clickCount: 3});
      await page.type('input[type="number"]', '9999999');
      
      // 5. CLICAR EM COMPRAR
      console.log('🛒 Passo 7: Clicando em COMPRAR...');
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (let btn of buttons) {
          if (btn.textContent.toUpperCase().includes('COMPRAR')) {
            btn.click();
            break;
          }
        }
      });
      
      // Aguardar 3 segundos
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 6. CAPTURAR ESTOQUE
      console.log('📊 Passo 8: Capturando estoque...');
      const mensagem = await page.evaluate(() => {
        const el = document.querySelector('.AddToCartError__message___UIAEo');
        if (el) return el.textContent;
        
        // Tentar outras classes
        const els = document.querySelectorAll('[class*="error"], [class*="Error"]');
        for (let e of els) {
          if (e.textContent.includes('disponíveis')) {
            return e.textContent;
          }
        }
        return null;
      });
      
      console.log('\n' + '='.repeat(50));
      console.log('✅ RESULTADO FINAL:');
      console.log('='.repeat(50));
      console.log(`Produto ID: ${produtoId}`);
      console.log(`Preço: ${preco}`);
      console.log(`Mensagem: ${mensagem || 'Não capturado'}`);
      
      if (mensagem) {
        const match = mensagem.match(/(\d+)\s*disponíveis/i);
        if (match) {
          console.log(`📦 ESTOQUE: ${match[1]} unidades`);
        }
      }
    } else {
      console.log('❌ Campo de quantidade não encontrado');
      console.log('   Produto pode estar indisponível');
    }
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
  } finally {
    console.log('\n🔒 Fechando navegador em 5 segundos...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
})();
