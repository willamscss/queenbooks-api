const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 TESTE DE ESTOQUE QUEENBOOKS');
  console.log('================================\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Ver o navegador funcionando
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. LOGIN COM EMAIL COMPLETO
    console.log('📍 Passo 1: Acessando página de login...');
    await page.goto('https://www.queenbooks.com.br/entrar', {
      waitUntil: 'networkidle0'
    });
    
    console.log('📝 Passo 2: Preenchendo credenciais...');
    await page.waitForSelector('input[type="email"]');
    
    // EMAIL COMPLETO AQUI!
    await page.type('input[type="email"]', 'willamscss@outlook.com', {delay: 100});
    await page.type('input[type="password"]', '618536', {delay: 100});
    
    console.log('🔐 Passo 3: Fazendo login...');
    console.log('   Email: willamscss@outlook.com');
    await page.keyboard.press('Enter');
    
    // Aguardar login processar
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 2. TESTAR OS 3 PRODUTOS DO SEU ARQUIVO
    const produtos = [
      { id: '177776741', estoqueEsperado: '13' },
      { id: '177776553', estoqueEsperado: '18' },
      { id: '207737053', estoqueEsperado: '2' }
    ];
    
    console.log('\n📦 Testando 3 produtos...\n');
    
    for (const produto of produtos) {
      console.log(`\n🔍 Verificando produto ${produto.id}...`);
      
      await page.goto(`https://www.queenbooks.com.br/produtos/${produto.id}`, {
        waitUntil: 'networkidle0'
      });
      
      // Aguardar página carregar
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verificar preço
      const preco = await page.evaluate(() => {
        const el = document.querySelector('h3[class*="price"]');
        return el ? el.textContent.trim() : 'Não encontrado';
      });
      console.log(`   💰 Preço: ${preco}`);
      
      // Verificar se tem campo de quantidade
      const inputExists = await page.$('input[type="number"]');
      
      if (inputExists) {
        // Limpar e inserir quantidade alta
        await page.click('input[type="number"]', {clickCount: 3});
        await page.type('input[type="number"]', '9999999');
        
        // Clicar em COMPRAR
        console.log('   🛒 Clicando em COMPRAR...');
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (let btn of buttons) {
            if (btn.textContent.toUpperCase().includes('COMPRAR')) {
              btn.click();
              break;
            }
          }
        });
        
        // Aguardar mensagem aparecer
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Capturar mensagem de estoque
        const mensagem = await page.evaluate(() => {
          // Buscar pela classe específica primeiro
          const el = document.querySelector('.AddToCartError__message___UIAEo');
          if (el) return el.textContent;
          
          // Buscar em qualquer elemento com "disponíveis"
          const allEls = document.querySelectorAll('*');
          for (let e of allEls) {
            if (e.textContent && e.textContent.includes('disponíveis para compra')) {
              return e.textContent;
            }
          }
          return null;
        });
        
        if (mensagem) {
          const match = mensagem.match(/(\d+)\s*disponíveis/i);
          if (match) {
            console.log(`   ✅ ESTOQUE: ${match[1]} unidades`);
            console.log(`   📊 Esperado: ${produto.estoqueEsperado} | Encontrado: ${match[1]}`);
          } else {
            console.log(`   📝 Mensagem: ${mensagem}`);
          }
        } else {
          console.log('   ⚠️ Mensagem de estoque não capturada');
        }
      } else {
        console.log('   ❌ Campo de quantidade não encontrado');
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ TESTE FINALIZADO');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
  } finally {
    console.log('\n🔒 Navegador será fechado em 10 segundos...');
    console.log('   (Para você ver o resultado)');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
})();
