/**
 * INVESTIGAÇÃO VISUAL: BOTÃO "ACESSE PARA COMPRAR"
 * 
 * Script para investigar visualmente o que acontece ao clicar no botão
 */

const puppeteer = require('puppeteer');

async function investigarBotaoVisual() {
  console.log('🔍 INVESTIGAÇÃO VISUAL DO BOTÃO');
  console.log('=' .repeat(50));
  
  const browser = await puppeteer.launch({
    headless: false, // Deixar visível para ver o que acontece
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    // 1. Navegar para produto
    const url = 'https://www.queenbooks.com.br/produtos/177776045';
    console.log(`📄 Navegando para: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // 2. Aguardar página carregar
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 3. Tirar screenshot antes do clique
    await page.screenshot({ path: 'debug-antes-clique.png', fullPage: true });
    console.log('📸 Screenshot antes do clique: debug-antes-clique.png');
    
    // 4. Procurar e clicar no botão
    console.log('🔍 Procurando botão "ACESSE PARA COMPRAR"...');
    
    const botaoClicado = await page.evaluate(() => {
      // Procurar o botão principal
      const botao = document.querySelector('.AddToCartContainer__buyButtonNotAuthenticated___DPNjB') ||
                   Array.from(document.querySelectorAll('button'))
                     .find(btn => btn.textContent?.includes('ACESSE PARA COMPRAR'));
      
      if (botao) {
        console.log('Botão encontrado:', botao.textContent, botao.className);
        botao.click();
        return true;
      }
      return false;
    });
    
    if (botaoClicado) {
      console.log('✅ Botão clicado!');
      
      // 5. Aguardar um pouco e tirar screenshot
      await new Promise(resolve => setTimeout(resolve, 3000));
      await page.screenshot({ path: 'debug-apos-clique.png', fullPage: true });
      console.log('📸 Screenshot após clique: debug-apos-clique.png');
      
      // 6. Investigar modais/popups
      const estadoPosClique = await page.evaluate(() => {
        // Procurar todos os elementos que podem ser modais
        const modals = Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          const className = el.className?.toString() || '';
          
          return (
            className.toLowerCase().includes('modal') ||
            className.toLowerCase().includes('popup') ||
            className.toLowerCase().includes('dialog') ||
            className.toLowerCase().includes('overlay') ||
            style.position === 'fixed' ||
            style.zIndex > 1000
          );
        }).map(el => ({
          tag: el.tagName,
          className: el.className,
          id: el.id,
          visible: el.offsetWidth > 0 && el.offsetHeight > 0,
          position: window.getComputedStyle(el).position,
          zIndex: window.getComputedStyle(el).zIndex,
          innerHTML: el.innerHTML?.substring(0, 200) // Primeiros 200 chars
        }));
        
        // Procurar todos os inputs
        const inputs = Array.from(document.querySelectorAll('input')).map(input => ({
          type: input.type,
          placeholder: input.placeholder,
          name: input.name,
          id: input.id,
          className: input.className,
          visible: input.offsetWidth > 0 && input.offsetHeight > 0,
          parentClassName: input.parentElement?.className
        }));
        
        return {
          url: window.location.href,
          title: document.title,
          modals: modals.filter(m => m.visible),
          inputs: inputs.filter(i => i.visible),
          allModals: modals,
          allInputs: inputs
        };
      });
      
      console.log('\n📊 ESTADO APÓS CLIQUE:');
      console.log(`URL: ${estadoPosClique.url}`);
      console.log(`Título: ${estadoPosClique.title}`);
      console.log(`Modais visíveis: ${estadoPosClique.modals.length}`);
      console.log(`Inputs visíveis: ${estadoPosClique.inputs.length}`);
      
      if (estadoPosClique.modals.length > 0) {
        console.log('\n🔍 MODAIS ENCONTRADOS:');
        estadoPosClique.modals.forEach((modal, i) => {
          console.log(`  ${i+1}. ${modal.tag} - ${modal.className}`);
          console.log(`     Visível: ${modal.visible}, Z-Index: ${modal.zIndex}`);
        });
      }
      
      if (estadoPosClique.inputs.length > 0) {
        console.log('\n📝 INPUTS VISÍVEIS:');
        estadoPosClique.inputs.forEach((input, i) => {
          console.log(`  ${i+1}. ${input.type} - "${input.placeholder}"`);
          console.log(`     Nome: ${input.name}, ID: ${input.id}`);
          console.log(`     Classe: ${input.className}`);
          console.log(`     Parent: ${input.parentClassName}`);
        });
      }
      
      // 7. Se não há inputs de login, verificar se redirecionou
      if (estadoPosClique.inputs.length === 0 || 
          !estadoPosClique.inputs.some(i => i.type === 'email' || i.type === 'password')) {
        
        console.log('\n🔍 Não encontrou campos de login. Investigando redirecionamento...');
        
        // Aguardar um pouco mais
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const urlFinal = await page.url();
        console.log(`URL final: ${urlFinal}`);
        
        if (urlFinal.includes('/login') || urlFinal.includes('/auth')) {
          console.log('✅ Redirecionou para página de login!');
          
          await page.screenshot({ path: 'debug-pagina-login.png', fullPage: true });
          console.log('📸 Screenshot da página de login: debug-pagina-login.png');
          
          // Investigar campos na página de login
          const camposLogin = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('input')).map(input => ({
              type: input.type,
              placeholder: input.placeholder,
              name: input.name,
              id: input.id,
              className: input.className,
              visible: input.offsetWidth > 0 && input.offsetHeight > 0
            })).filter(i => i.visible);
          });
          
          console.log('\n📝 CAMPOS NA PÁGINA DE LOGIN:');
          camposLogin.forEach((campo, i) => {
            console.log(`  ${i+1}. ${campo.type} - "${campo.placeholder}"`);
            console.log(`     Nome: ${campo.name}, ID: ${campo.id}`);
          });
        }
      }
      
    } else {
      console.log('❌ Botão não encontrado');
    }
    
    // 8. Aguardar para observação visual
    console.log('\n⏳ Aguardando 30 segundos para observação visual...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await browser.close();
  }
}

// Executar investigação
investigarBotaoVisual().catch(console.error);
