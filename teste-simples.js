const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 TESTE RÁPIDO - ESTOQUE QUEENBOOKS\n');
  
  const browser = await puppeteer.launch({ 
    headless: false // Ver o navegador funcionando
  });
  
  const page = await browser.newPage();
  
  try {
    // Login
    console.log('1. Fazendo login...');
    await page.goto('https://www.queenbooks.com.br/entrar');
    await page.type('input[type="email"]', 'willamscss');
    await page.type('input[type="password"]', '618536');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    
    // Acessar produto
    console.log('2. Acessando produto 209942088...');
    await page.goto('https://www.queenbooks.com.br/produtos/209942088');
    await page.waitForTimeout(2000);
    
    // Verificar estoque
    console.log('3. Verificando estoque...');
    await page.type('input[type="number"]', '9999999');
    
    // Clicar em comprar
    await page.evaluate(() => {
      document.querySelector('button').click();
    });
    
    await page.waitForTimeout(2000);
    
    // Capturar resultado
    const estoque = await page.$eval('.AddToCartError__message___UIAEo', 
      el => el.textContent
    ).catch(() => 'Não encontrado');
    
    console.log('\n✅ RESULTADO:', estoque);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  await browser.close();
})();
