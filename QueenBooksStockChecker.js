const puppeteer = require('puppeteer');

class QueenBooksStockChecker {
  constructor(options = {}) {
    this.baseUrl = 'https://www.queenbooks.com.br';
    this.headless = 'new'; // Sempre headless para produção
    this.browser = null;
    this.page = null;
    this.authenticated = false;
    this.username = options.username || process.env.QUEENBOOKS_EMAIL || 'willamscss@outlook.com';
    this.password = options.password || process.env.QUEENBOOKS_PASSWORD || '618536';
    this.loginTentativas = 0;
  }

  async init() {
    console.log('🚀 Iniciando QueenBooks Stock Checker...');
    
    // Auto-detectar executável Chrome no Railway/Docker
    let executablePath;
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else {
      // Usar bundled Chromium do Puppeteer
      executablePath = undefined;
    }
    
    console.log('🔍 Chrome path:', executablePath || 'bundled Chromium');
    
    this.browser = await puppeteer.launch({
      headless: this.headless,
      defaultViewport: null,
      executablePath: executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--single-process',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    console.log('✅ Browser iniciado');
  }

  async fazerLoginViaProduto(produtoId) {
    try {
      console.log('🔐 Fazendo login via página do produto...');
      
      // Navegar para o produto específico
      const urlProduto = `${this.baseUrl}/produtos/${produtoId}`;
      console.log(`📄 Acessando: ${urlProduto}`);
      
      await this.page.goto(urlProduto, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Procurar especificamente o botão "ACESSE PARA COMPRAR"
      const botaoAcesso = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => 
          btn.textContent.includes('ACESSE PARA COMPRAR') &&
          btn.className.includes('AddToCartContainer__buyButtonNotAuthenticated')
        );
      });

      if (!botaoAcesso) {
        console.log('✅ Já está autenticado (botão de acesso não encontrado)');
        this.authenticated = true;
        return true;
      }

      console.log('🖱️ Clicando no botão "ACESSE PARA COMPRAR"...');
      
      // Clicar no botão específico
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btnAcesso = buttons.find(btn => 
          btn.textContent.includes('ACESSE PARA COMPRAR') &&
          btn.className.includes('AddToCartContainer__buyButtonNotAuthenticated')
        );
        if (btnAcesso) {
          btnAcesso.click();
        }
      });

      // Aguardar redirecionamento para /entrar
      console.log('⏳ Aguardando redirecionamento para página de login...');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      
      const urlAtual = this.page.url();
      console.log(`� URL atual: ${urlAtual}`);
      
      if (!urlAtual.includes('/entrar')) {
        throw new Error('Não redirecionou para página de login');
      }

      console.log('✅ Redirecionou para página de login!');

      // Aguardar campos de login estarem disponíveis
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Preencher formulário de login
      console.log('🔍 Procurando campos de login na página dedicada...');
      
      const emailInput = await this.page.$('input[type="email"]') || 
                        await this.page.$('input[name="email"]') ||
                        await this.page.$('input[placeholder*="email"]');
      
      const senhaInput = await this.page.$('input[type="password"]') ||
                        await this.page.$('input[name="password"]') ||
                        await this.page.$('input[name="senha"]');

      if (!emailInput || !senhaInput) {
        throw new Error('Campos de login não encontrados');
      }

      // Limpar e preencher campos
      await emailInput.click({ clickCount: 3 });
      await emailInput.type(this.username, { delay: 100 });
      console.log('✅ Email preenchido na página de login');

      await senhaInput.click({ clickCount: 3 });
      await senhaInput.type(this.password, { delay: 100 });
      console.log('✅ Senha preenchida na página de login');

      // Submeter formulário
      console.log('🚀 Submetendo login...');
      await this.page.keyboard.press('Enter');
      
      // Aguardar processamento do login
      console.log('⏳ Aguardando login processar...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verificar se o login foi bem-sucedido
      const urlAposLogin = this.page.url();
      console.log(`🔍 URL após login: ${urlAposLogin}`);
      
      if (urlAposLogin.includes('/entrar')) {
        throw new Error('Login falhou - ainda na página de login');
      }

      this.authenticated = true;
      console.log('✅ Login via produto realizado com sucesso!');
      return true;

    } catch (error) {
      console.error('❌ Erro no login via produto:', error.message);
      this.loginTentativas++;
      
      if (this.loginTentativas < 3) {
        console.log(`🔄 Tentativa ${this.loginTentativas + 1} de login...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.fazerLoginViaProduto(produtoId);
      }
      
      throw error;
    }
  }

  async fazerLoginDireto() {
    try {
      console.log('🔐 Fazendo login direto...');
      
      await this.page.goto(`${this.baseUrl}/entrar`, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Preencher credenciais
      const emailInput = await this.page.$('input[type="email"]');
      const senhaInput = await this.page.$('input[type="password"]');

      if (emailInput && senhaInput) {
        await emailInput.type(this.username, { delay: 100 });
        await senhaInput.type(this.password, { delay: 100 });
        await this.page.keyboard.press('Enter');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const url = this.page.url();
        if (!url.includes('/entrar')) {
          this.authenticated = true;
          console.log('✅ Login direto realizado!');
          return true;
        }
      }
      
      throw new Error('Falha no login direto');
    } catch (error) {
      console.error('❌ Erro no login direto:', error.message);
      throw error;
    }
  }

  async verificarEstoque(produtoId) {
    console.log(`\n📦 Verificando estoque do produto ${produtoId}`);
    
    try {
      // Se não está autenticado, fazer login via produto
      if (!this.authenticated) {
        await this.fazerLoginViaProduto(produtoId);
      }

      const produtoUrl = `${this.baseUrl}/produtos/${produtoId}`;
      console.log(`📄 Acessando produto: ${produtoUrl}`);
      
      await this.page.goto(produtoUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Aguardar página carregar
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verificar se precisa fazer login novamente
      const precisaLogin = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(b => b.textContent.includes('ACESSE PARA COMPRAR'));
      });

      if (precisaLogin) {
        console.log('🔄 Sessão expirou, fazendo login novamente...');
        this.authenticated = false;
        await this.fazerLoginViaProduto(produtoId);
        
        // Voltar para a página do produto
        await this.page.goto(produtoUrl, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Buscar informações do produto
      const infoProduto = await this.page.evaluate(() => {
        // Título
        const titulo = document.querySelector('h1')?.textContent?.trim() || 
                      document.querySelector('[class*="ProductName"]')?.textContent?.trim() || '';
        
        // Preço - buscar com seletor específico
        const precoEl = document.querySelector('h3.AddToCartContainer__price___4Ltr\\+') || 
                       document.querySelector('h3[class*="price"]') ||
                       document.querySelector('[class*="price"]');
        
        let preco = '';
        if (precoEl) {
          // Remover ícone e limpar texto
          const precoText = precoEl.textContent || '';
          preco = precoText.replace('info_outline', '').trim();
        }
        
        return { titulo, preco };
      });

      console.log(`📚 Produto: ${infoProduto.titulo || 'Sem título'}`);
      console.log(`💰 Preço: ${infoProduto.preco || 'Não disponível'}`);

      // Verificar se tem campo de quantidade - seletores mais amplos
      const campoQuantidade = await this.page.$('input[placeholder="0"]') ||
                              await this.page.$('input[type="number"]') ||
                              await this.page.$('input[class*="quantity"]') ||
                              await this.page.$('input[class*="Quantity"]') ||
                              await this.page.$('input[name*="quantity"]') ||
                              await this.page.$('.AddToCartContainer input[type="number"]');
      
      // Debug: Listar todos os inputs para encontrar o correto
      const todosInputs = await this.page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.map(input => ({
          type: input.type,
          placeholder: input.placeholder,
          name: input.name,
          className: input.className,
          value: input.value,
          visible: input.offsetParent !== null
        }));
      });
      
      console.log('🔍 Inputs encontrados:', JSON.stringify(todosInputs, null, 2));
      
      if (!campoQuantidade) {
        console.log('⚠️ Campo de quantidade não encontrado - verificando se produto está disponível...');
        
        // Verificar se existe botão de comprar (produto disponível mas sem campo visível)
        const temBotaoComprar = await this.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.some(btn => 
            btn.textContent.toUpperCase().includes('COMPRAR') &&
            !btn.textContent.includes('ACESSE') &&
            !btn.disabled
          );
        });
        
        if (temBotaoComprar) {
          console.log('✅ Produto disponível, mas sem campo de quantidade visível - assumindo estoque limitado');
          return {
            produtoId,
            titulo: infoProduto.titulo,
            preco: infoProduto.preco,
            estoque: 1, // Assume que tem pelo menos 1 se tem botão comprar
            disponivel: true,
            observacao: 'Estoque não verificável - produto disponível'
          };
        }
        
        return {
          produtoId,
          titulo: infoProduto.titulo,
          preco: infoProduto.preco,
          estoque: 0,
          disponivel: false,
          erro: 'Produto indisponível - sem campo de quantidade'
        };
      }

      // Limpar e inserir quantidade alta
      console.log('📝 Inserindo quantidade alta para verificar estoque...');
      await campoQuantidade.click({ clickCount: 3 });
      await this.page.keyboard.type('9999999');
      
      // Pequena pausa
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clicar no botão COMPRAR
      console.log('🛒 Clicando no botão COMPRAR...');
      
      const clicouComprar = await this.page.evaluate(() => {
        // Procurar botão com texto COMPRAR
        const buttons = Array.from(document.querySelectorAll('button'));
        const buyButton = buttons.find(btn => 
          btn.textContent.toUpperCase().includes('COMPRAR') &&
          !btn.textContent.includes('ACESSE')
        );
        
        if (buyButton) {
          buyButton.click();
          return true;
        }
        
        // Tentar seletor específico
        const specificButton = document.querySelector('button.AddToCartButton__addingProduct___1BOl7');
        if (specificButton) {
          specificButton.click();
          return true;
        }
        
        return false;
      });

      if (!clicouComprar) {
        console.log('⚠️ Botão COMPRAR não encontrado');
      }

      // Aguardar mensagem de estoque aparecer
      console.log('⏳ Aguardando mensagem de estoque...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Capturar mensagem de estoque
      const mensagemEstoque = await this.page.evaluate(() => {
        // Seletor específico principal
        const msgEl = document.querySelector('div.AddToCartError__container___sqVVF p.AddToCartError__message___UIAEo');
        if (msgEl) return msgEl.textContent;
        
        // Seletor alternativo
        const altEl = document.querySelector('.AddToCartError__message___UIAEo');
        if (altEl) return altEl.textContent;
        
        // Buscar por texto em qualquer elemento
        const allElements = document.querySelectorAll('p, div, span');
        for (let el of allElements) {
          const text = el.textContent || '';
          if (text.includes('disponíveis para compra')) {
            return text;
          }
        }
        
        return null;
      });

      let estoque = null;
      if (mensagemEstoque) {
        console.log(`📋 Mensagem: ${mensagemEstoque}`);
        const match = mensagemEstoque.match(/(\d+)\s*disponíveis/i);
        if (match) {
          estoque = parseInt(match[1]);
          console.log(`✅ ESTOQUE ENCONTRADO: ${estoque} unidades`);
        }
      } else {
        console.log('⚠️ Mensagem de estoque não capturada');
      }

      return {
        produtoId,
        titulo: infoProduto.titulo,
        preco: infoProduto.preco,
        estoque: estoque !== null ? estoque : null,
        disponivel: estoque > 0,
        mensagem: mensagemEstoque,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Erro ao verificar estoque: ${error.message}`);
      return {
        produtoId,
        estoque: null,
        disponivel: null,
        erro: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async verificarMultiplosEstoques(produtoIds) {
    const resultados = [];
    
    for (let i = 0; i < produtoIds.length; i++) {
      const id = produtoIds[i];
      console.log(`\n[${i + 1}/${produtoIds.length}] Verificando produto ${id}`);
      
      const resultado = await this.verificarEstoque(id);
      resultados.push(resultado);
      
      // Delay entre verificações
      if (i < produtoIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return resultados;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser fechado');
    }
  }
}

module.exports = QueenBooksStockChecker;
