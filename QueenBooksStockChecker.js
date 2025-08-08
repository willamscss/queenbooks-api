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
    
    this.browser = await puppeteer.launch({
      headless: this.headless,
      defaultViewport: null,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
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
      
      // Navegar para um produto qualquer
      const urlProduto = produtoId ? 
        `${this.baseUrl}/produtos/${produtoId}` : 
        `${this.baseUrl}/produtos/177776741`; // Produto padrão para login
      
      console.log(`📄 Acessando: ${urlProduto}`);
      await this.page.goto(urlProduto, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Aguardar página carregar
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Procurar o botão "ACESSE PARA COMPRAR"
      const botaoAcesso = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => 
          b.textContent.includes('ACESSE PARA COMPRAR') || 
          b.classList.contains('AddToCartContainer__buyButtonNotAuthenticated___DPNjB')
        );
        return btn ? true : false;
      });

      if (!botaoAcesso) {
        console.log('✅ Já está autenticado (botão de acesso não encontrado)');
        this.authenticated = true;
        return true;
      }

      // Clicar no botão "ACESSE PARA COMPRAR"
      console.log('🖱️ Clicando em "ACESSE PARA COMPRAR"...');
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => 
          b.textContent.includes('ACESSE PARA COMPRAR') || 
          b.classList.contains('AddToCartContainer__buyButtonNotAuthenticated___DPNjB')
        );
        if (btn) btn.click();
      });

      // Aguardar redirecionamento para página de login
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Agora fazer o login
      console.log(`📧 Email: ${this.username}`);
      
      // Tentar múltiplos seletores para o campo de email
      const emailSelectors = [
        'input[type="email"]',
        'input[placeholder*="mail" i]',
        'input.LoginForm__input___agORS[type="email"]',
        'input[name="email"]'
      ];

      let emailInput = null;
      for (const selector of emailSelectors) {
        emailInput = await this.page.$(selector);
        if (emailInput) {
          console.log(`✅ Campo email encontrado: ${selector}`);
          break;
        }
      }

      if (!emailInput) {
        throw new Error('Campo de email não encontrado');
      }

      // Preencher email
      await emailInput.click();
      await this.page.keyboard.type(this.username, { delay: 100 });

      // Tentar múltiplos seletores para o campo de senha
      const senhaSelectors = [
        'input[type="password"]',
        'input[placeholder*="senha" i]',
        'input.LoginForm__input___agORS[type="password"]',
        'input[name="password"]'
      ];

      let senhaInput = null;
      for (const selector of senhaSelectors) {
        senhaInput = await this.page.$(selector);
        if (senhaInput) {
          console.log(`✅ Campo senha encontrado: ${selector}`);
          break;
        }
      }

      if (!senhaInput) {
        throw new Error('Campo de senha não encontrado');
      }

      // Preencher senha
      await senhaInput.click();
      await this.page.keyboard.type(this.password, { delay: 100 });

      // Submeter formulário
      console.log('📤 Submetendo formulário...');
      
      // Tentar encontrar botão de submit
      const submitButton = await this.page.$('button[type="submit"]') || 
                          await this.page.$('button:contains("Entrar")') ||
                          await this.page.$('button:contains("LOGIN")');
      
      if (submitButton) {
        await submitButton.click();
      } else {
        // Se não encontrar botão, pressionar Enter
        await this.page.keyboard.press('Enter');
      }

      // Aguardar login processar
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verificar se voltou para a página do produto ou está logado
      const urlAtual = this.page.url();
      if (urlAtual.includes('/produtos/') || !urlAtual.includes('/entrar')) {
        console.log('✅ Login realizado com sucesso!');
        this.authenticated = true;
        return true;
      } else {
        throw new Error('Login pode ter falhado - ainda na página de login');
      }

    } catch (error) {
      console.error('❌ Erro no login:', error.message);
      
      // Tentar login direto como fallback
      if (this.loginTentativas < 2) {
        this.loginTentativas++;
        console.log('🔄 Tentando login direto como fallback...');
        return await this.fazerLoginDireto();
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

      // Verificar se tem campo de quantidade
      const campoQuantidade = await this.page.$('input[type="number"][placeholder="0"]') ||
                              await this.page.$('input[type="number"]');
      
      if (!campoQuantidade) {
        console.log('⚠️ Campo de quantidade não encontrado - produto indisponível');
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
