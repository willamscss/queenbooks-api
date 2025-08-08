require('dotenv').config();
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // headless: false para ver
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Debugando página de login...');
    
    await page.goto('https://www.queenbooks.com.br/entrar', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log('📄 Página carregada, aguardando JavaScript...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Salvar screenshot
    await page.screenshot({ path: 'debug-login.png' });
    console.log('📸 Screenshot salvo: debug-login.png');
    
    // Verificar HTML
    const html = await page.content();
    console.log('📏 Tamanho do HTML:', html.length);
    
    // Procurar por campos de input
    const inputs = await page.evaluate(() => {
      const elementos = Array.from(document.querySelectorAll('input'));
      return elementos.map(el => ({
        type: el.type,
        placeholder: el.placeholder,
        class: el.className,
        id: el.id
      }));
    });
    
    console.log('🔍 Inputs encontrados:', inputs);
    
    // Procurar por formulário
    const forms = await page.evaluate(() => {
      const elementos = Array.from(document.querySelectorAll('form'));
      return elementos.map(el => ({
        action: el.action,
        class: el.className,
        id: el.id
      }));
    });
    
    console.log('📝 Formulários encontrados:', forms);
    
    // Aguardar um pouco mais para debug
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await browser.close();
  }
})();
