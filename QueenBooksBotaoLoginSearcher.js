/**
 * QUEENBOOKS BOTÃO LOGIN SEARCHER
 * 
 * Nova abordagem: clicar no botão "ACESSE PARA COMPRAR" e fazer login inline
 */

const puppeteer = require('puppeteer');

class QueenBooksBotaoLoginSearcher {
  constructor(options = {}) {
    this.baseUrl = 'https://www.queenbooks.com.br';
    
    // Configurações de autenticação
    this.credentials = {
      username: options.username || process.env.QUEENBOOKS_USERNAME,
      password: options.password || process.env.QUEENBOOKS_PASSWORD
    };
    
    // Configurações de execução
    this.isDebugMode = options.debug || false;
    this.isHeadless = options.headless !== false; // Default true, exceto se explicitamente false
    
    this.browser = null;
    this.page = null;
  }

  async init() {
    // Configurações do browser baseadas no modo
    const browserConfig = {
      headless: this.isHeadless ? "new" : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    };

    // Configurações específicas para cada modo
    if (this.isHeadless) {
      // Modo produção (headless)
      browserConfig.defaultViewport = { width: 1920, height: 1080 };
    } else {
      // Modo debug (com interface)
      browserConfig.defaultViewport = null;
      browserConfig.args.push('--start-maximized');
    }

    // Inicializar browser
    this.browser = await puppeteer.launch(browserConfig);
    
    this.page = await this.browser.newPage();
    
    // Configurar User-Agent
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('🚀 Browser inicializado');
  }

  async buscarProdutoComPreco(codigo) {
    console.log('🎯 BUSCA COM BOTÃO "ACESSE PARA COMPRAR"');
    console.log('=' .repeat(60));
    console.log(`📋 Código: ${codigo}`);
    
    const produto = {
      codigo: codigo,
      id: codigo,
      titulo: '',
      preco: null,
      preco_autenticado: null,
      informacoes: {},
      urlProduto: `${this.baseUrl}/produtos/${codigo}`,
      encontradoEm: new Date().toISOString(),
      metodoBusca: 'botao_login'
    };

    try {
      // 1. Navegar para página do produto
      console.log(`📄 Navegando para: ${produto.urlProduto}`);
      
      await this.page.goto(produto.urlProduto, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // 2. Aguardar página carregar
      console.log('⏳ Aguardando página carregar...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 3. Procurar pelo botão "ACESSE PARA COMPRAR"
      console.log('🔍 Procurando botão "ACESSE PARA COMPRAR"...');
      
      const botaoSelector = 'button[class*="AddToCartContainer__buyButtonNotAuthenticated"], button:contains("ACESSE PARA COMPRAR"), .AddToCartContainer__buyButtonNotAuthenticated';
      
      let botaoEncontrado = false;
      
      try {
        await this.page.waitForSelector(botaoSelector, { timeout: 10000 });
        botaoEncontrado = true;
        console.log('✅ Botão "ACESSE PARA COMPRAR" encontrado!');
      } catch (e) {
        // Tentar procurar manualmente
        const botoes = await this.page.evaluate(() => {
          const allButtons = Array.from(document.querySelectorAll('button'));
          return allButtons.map(btn => ({
            text: btn.textContent?.trim(),
            className: btn.className
          })).filter(btn => 
            btn.text?.includes('ACESSE') || 
            btn.text?.includes('COMPRAR') ||
            btn.className?.includes('buyButton')
          );
        });
        
        console.log('🔍 Botões encontrados:', botoes);
        
        if (botoes.length > 0) {
          botaoEncontrado = true;
          console.log('✅ Botão encontrado via busca manual!');
        }
      }

      if (!botaoEncontrado) {
        console.log('❌ Botão "ACESSE PARA COMPRAR" não encontrado');
        return { ...produto, encontrado: false, erro: 'Botão não encontrado' };
      }

      // 4. Clicar no botão
      console.log('🖱️ Clicando no botão "ACESSE PARA COMPRAR"...');
      
      try {
        // Tentar clicar especificamente no botão correto
        await this.page.click('.AddToCartContainer__buyButtonNotAuthenticated___DPNjB');
        console.log('✅ Clicou no botão principal');
      } catch (e) {
        // Tentar alternativa
        await this.page.evaluate(() => {
          const botao = document.querySelector('.AddToCartContainer__buyButtonNotAuthenticated___DPNjB') ||
                       Array.from(document.querySelectorAll('button'))
                         .find(btn => btn.textContent?.includes('ACESSE PARA COMPRAR'));
          if (botao) botao.click();
        });
        console.log('✅ Clicou via JavaScript');
      }

      // 5. Aguardar redirecionamento
      console.log('⏳ Aguardando redirecionamento...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 6. Verificar se redirecionou para página de login
      const urlAtual = await this.page.url();
      console.log(`🔍 URL atual: ${urlAtual}`);
      
      if (urlAtual.includes('/entrar') || urlAtual.includes('/login')) {
        console.log('✅ Redirecionou para página de login!');
        
        // Aguardar página de login carregar
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Procurar campos específicos da página de login
        console.log('🔍 Procurando campos de login na página dedicada...');
        
        try {
          // Preencher email
          await this.page.waitForSelector('input[type="email"], .LoginForm__input___agORS[type="email"]', { timeout: 5000 });
          await this.page.type('input[type="email"]', this.credentials.username);
          console.log('✅ Email preenchido na página de login');
          
          // Preencher senha
          await this.page.waitForSelector('input[type="password"], .LoginForm__input___agORS[type="password"]', { timeout: 5000 });
          await this.page.type('input[type="password"]', this.credentials.password);
          console.log('✅ Senha preenchida na página de login');
          
          // Submeter formulário
          console.log('🚀 Submetendo login...');
          
          try {
            await this.page.click('button[type="submit"], .btn-primary');
          } catch (e) {
            await this.page.keyboard.press('Enter');
          }
          
          // Aguardar login processar
          console.log('⏳ Aguardando login processar...');
          await new Promise(resolve => setTimeout(resolve, 8000));
          
          // Verificar se login foi bem sucedido
          const urlPosLogin = await this.page.url();
          console.log(`🔍 URL após login: ${urlPosLogin}`);
          
          // Voltar para o produto original para buscar preço
          console.log('� Voltando para página do produto...');
          await this.page.goto(produto.urlProduto, { waitUntil: 'networkidle0' });
          
          // Aguardar página carregar com usuário logado
          await new Promise(resolve => setTimeout(resolve, 5000));
          
        } catch (error) {
          console.log('❌ Erro no processo de login:', error.message);
          return { ...produto, encontrado: false, erro: `Erro no login: ${error.message}` };
        }
        
      } else {
        console.log('⚠️ Não redirecionou para página de login');
        return { ...produto, encontrado: false, erro: 'Não redirecionou para login' };
      }

      // 11. Procurar preço na página
      console.log('💰 Procurando preço após login...');
      
      const dadosPreco = await this.page.evaluate(() => {
        const dados = {};
        
        // Buscar preço de várias formas
        const precoSelectors = [
          'h3[class*="price"]',
          '[class*="AddToCartContainer__price"]',
          '.price',
          '[class*="Price"]'
        ];
        
        let precoEncontrado = null;
        
        for (const selector of precoSelectors) {
          const elemento = document.querySelector(selector);
          if (elemento) {
            const texto = elemento.textContent || elemento.innerText;
            const match = texto.match(/R\$\s*([\d.,]+)/);
            if (match) {
              precoEncontrado = match[1];
              dados.seletor_usado = selector;
              break;
            }
          }
        }
        
        // Se não encontrou, buscar em todo o texto
        if (!precoEncontrado) {
          const textoCompleto = document.body.innerText || document.body.textContent || '';
          const matches = textoCompleto.match(/R\$\s*([\d.,]+)/g) || [];
          dados.todos_precos = matches;
          
          // Procurar especificamente por valores que parecem preços de livros (10-10000)
          for (const match of matches) {
            const valor = parseFloat(match.replace(/[^\d,]/g, '').replace(',', '.'));
            if (valor >= 10 && valor <= 10000) {
              precoEncontrado = match.replace('R$ ', '').replace('R$', '');
              break;
            }
          }
        }
        
        dados.preco = precoEncontrado;
        dados.titulo = document.title;
        
        return dados;
      });

      // 12. Extração simples e rápida
      try {
        console.log('🔍 Extraindo dados da página...');
        
        const dadosBasicos = await this.page.evaluate(() => {
          // Busca simples por preço
          const todoTexto = document.body.textContent || '';
          const regexPreco = /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g;
          const matches = Array.from(todoTexto.matchAll(regexPreco));
          
          let precoEncontrado = null;
          for (const match of matches) {
            const valor = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
            if (valor > 10 && valor < 10000) {
              precoEncontrado = match[1];
              break;
            }
          }
          
          return {
            preco: precoEncontrado,
            titulo: document.title?.replace(' - QueenBooks', '') || ''
          };
        });

        // Processar dados
        produto.titulo = dadosBasicos.titulo;
        produto.informacoes = {}; // Por enquanto vazio, expandir depois
        
        if (dadosBasicos.preco) {
          const precoStr = dadosBasicos.preco.replace(/[^\d,]/g, '').replace(',', '.');
          const preco = parseFloat(precoStr);
          if (preco && preco > 0) {
            produto.preco_autenticado = preco;
            produto.preco = preco;
            console.log(`💰 PREÇO ENCONTRADO: R$ ${preco.toFixed(2).replace('.', ',')}`);
          }
        }

        console.log('✅ Extração simples concluída!');
        console.log(`📚 Título: ${produto.titulo}`);
        
      } catch (error) {
        console.log('⚠️ Erro na extração:', error.message);
        produto.titulo = 'Produto QueenBooks';
        produto.informacoes = {};
      }
      
      // Aguardar apenas em modo debug
      if (this.isDebugMode) {
        console.log('⏳ Aguardando 3 segundos para debug...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      return { ...produto, encontrado: true };

    } catch (error) {
      console.log(`❌ Erro na busca: ${error.message}`);
      return { ...produto, encontrado: false, erro: error.message };
    }
  }

  async fazerLoginPaginaDedicada() {
    console.log('🔐 Fazendo login em página dedicada...');
    
    try {
      // Aguardar página carregar
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Procurar campos na página de login
      const campos = await this.page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input')).map(input => ({
          type: input.type,
          placeholder: input.placeholder,
          name: input.name,
          id: input.id,
          className: input.className,
          visible: input.offsetWidth > 0 && input.offsetHeight > 0
        }));
        
        return inputs.filter(i => i.visible);
      });
      
      console.log('📝 Campos encontrados na página de login:', campos);
      
      // Preencher email (primeiro campo ou campo específico)
      let emailPreenchido = false;
      const emailSelectors = ['input[type="email"]', 'input[name*="email"]', 'input[placeholder*="mail"]'];
      
      for (const selector of emailSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.type(selector, this.credentials.username);
          console.log(`✅ Email preenchido: ${selector}`);
          emailPreenchido = true;
          break;
        } catch (e) {
          // Continuar
        }
      }
      
      if (!emailPreenchido && campos.length > 0) {
        // Tentar primeiro campo
        const primeiroInput = campos[0];
        const seletor = primeiroInput.id ? `#${primeiroInput.id}` : 
                       primeiroInput.name ? `[name="${primeiroInput.name}"]` :
                       `input[type="${primeiroInput.type}"]`;
        
        await this.page.click(seletor);
        await this.page.type(seletor, this.credentials.username);
        console.log(`✅ Email preenchido no primeiro campo: ${seletor}`);
        emailPreenchido = true;
      }
      
      // Preencher senha
      let senhaPreenchida = false;
      const passwordSelectors = ['input[type="password"]', 'input[name*="password"]', 'input[name*="senha"]'];
      
      for (const selector of passwordSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.type(selector, this.credentials.password);
          console.log(`✅ Senha preenchida: ${selector}`);
          senhaPreenchida = true;
          break;
        } catch (e) {
          // Continuar
        }
      }
      
      if (!senhaPreenchida && campos.length > 1) {
        // Tentar segundo campo
        const segundoInput = campos[1];
        const seletor = segundoInput.id ? `#${segundoInput.id}` : 
                       segundoInput.name ? `[name="${segundoInput.name}"]` :
                       `input[type="${segundoInput.type}"]`;
        
        await this.page.click(seletor);
        await this.page.type(seletor, this.credentials.password);
        console.log(`✅ Senha preenchida no segundo campo: ${seletor}`);
        senhaPreenchida = true;
      }
      
      if (!emailPreenchido || !senhaPreenchida) {
        throw new Error('Não foi possível preencher credenciais na página de login');
      }
      
      // Submeter formulário
      console.log('🚀 Submetendo login...');
      
      try {
        await this.page.click('button[type="submit"], .btn-primary, button:contains("ENTRAR"), button:contains("LOGIN")');
      } catch (e) {
        await this.page.keyboard.press('Enter');
      }
      
      // Aguardar login processar
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('✅ Login processado em página dedicada');
      return true;
      
    } catch (error) {
      console.log('❌ Erro no login em página dedicada:', error.message);
      return false;
    }
  }

  /**
   * Extrai todas as imagens do carrossel de um produto
   * @param {string} produtoId - ID do produto
   * @returns {Object} Resultado com todas as imagens encontradas
   */
  async extrairImagensCarrossel(produtoId) {
    console.log(`🎠 Extraindo imagens do carrossel para produto ${produtoId}`);
    
    try {
      await this.init();
      
      const url = `${this.baseUrl}/produtos/${produtoId}`;
      console.log(`📡 Navegando para: ${url}`);
      
      await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      // Aguardar página carregar
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Extrair informações básicas do produto
      const infoProduto = await this.page.evaluate(() => {
        const titulo = document.querySelector('h1, .product-title, [class*="title"]')?.textContent?.trim();
        const preco = document.querySelector('.price, [class*="price"], [class*="Price"]')?.textContent?.trim();
        return { titulo, preco };
      });
      
      console.log(`📖 Produto: ${infoProduto.titulo}`);
      
      // Buscar indicadores do carrossel
      let indicadores = [];
      const seletoresIndicadores = [
        '[data-testid="indicator-item"]',
        '[class*="indicator"]',
        '[class*="dot"]',
        '[class*="bullet"]'
      ];
      
      for (const seletor of seletoresIndicadores) {
        indicadores = await this.page.$$(seletor);
        if (indicadores.length > 0) {
          console.log(`✅ Encontrados ${indicadores.length} indicadores com seletor: ${seletor}`);
          break;
        }
      }
      
      const imagens = [];
      
      if (indicadores.length === 0) {
        console.log('ℹ️ Nenhum indicador encontrado, extraindo imagem atual...');
        
        // Buscar primeira imagem do produto
        const seletoresImagem = [
          '.Carrousel__imageContainer___9tur5 img',
          '[class*="product"] img',
          '[class*="gallery"] img',
          '[class*="image"] img',
          'img[alt*="produto"]',
          'img[alt*="Produto"]'
        ];
        
        for (const seletor of seletoresImagem) {
          const imagemInfo = await this.page.evaluate((sel) => {
            const img = document.querySelector(sel);
            return img ? {
              src: img.src,
              alt: img.alt || 'Imagem do produto',
              width: img.width,
              height: img.height
            } : null;
          }, seletor);
          
          if (imagemInfo && imagemInfo.src && !imagemInfo.src.includes('data:')) {
            imagens.push({
              indice: 1,
              url: imagemInfo.src,
              alt: imagemInfo.alt,
              width: imagemInfo.width,
              height: imagemInfo.height
            });
            console.log(`✅ Imagem encontrada com seletor: ${seletor}`);
            break;
          }
        }
      } else {
        // Iterar pelos indicadores para extrair todas as imagens
        for (let i = 0; i < indicadores.length; i++) {
          console.log(`🖼️ Extraindo imagem ${i + 1}/${indicadores.length}`);
          
          try {
            // Clicar no indicador
            await indicadores[i].click();
            
            // Aguardar imagem carregar
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Extrair imagem atual
            const imagemInfo = await this.page.evaluate(() => {
              const seletores = [
                '.Carrousel__imageContainer___9tur5 img',
                '[class*="carousel"] img',
                '[class*="gallery"] img:first-of-type',
                '[class*="product"] img:first-of-type'
              ];
              
              for (const sel of seletores) {
                const img = document.querySelector(sel);
                if (img && img.src && !img.src.includes('data:')) {
                  return {
                    src: img.src,
                    alt: img.alt || 'Imagem do produto',
                    width: img.width,
                    height: img.height
                  };
                }
              }
              return null;
            });
            
            if (imagemInfo) {
              // Verificar se já não temos essa imagem (evitar duplicatas)
              const jaExiste = imagens.some(img => img.url === imagemInfo.src);
              if (!jaExiste) {
                imagens.push({
                  indice: i + 1,
                  url: imagemInfo.src,
                  alt: imagemInfo.alt,
                  width: imagemInfo.width,
                  height: imagemInfo.height
                });
                console.log(`  ✅ Imagem ${i + 1}: ${imagemInfo.src.substring(0, 60)}...`);
              } else {
                console.log(`  ⚠️ Imagem ${i + 1} duplicada, ignorando`);
              }
            } else {
              console.log(`  ❌ Não foi possível extrair imagem ${i + 1}`);
            }
            
          } catch (error) {
            console.log(`  ⚠️ Erro ao processar indicador ${i + 1}:`, error.message);
          }
        }
      }
      
      // Se ainda não encontramos nenhuma imagem, fazer busca mais ampla
      if (imagens.length === 0) {
        console.log('🔍 Nenhuma imagem encontrada, fazendo busca ampla...');
        
        const todasImagens = await this.page.evaluate(() => {
          const imgs = Array.from(document.querySelectorAll('img'));
          return imgs
            .filter(img => img.src && !img.src.includes('data:') && img.width > 100 && img.height > 100)
            .map((img, index) => ({
              indice: index + 1,
              url: img.src,
              alt: img.alt || 'Imagem do produto',
              width: img.width,
              height: img.height,
              className: img.className
            }))
            .slice(0, 10); // Limitar a 10 imagens
        });
        
        imagens.push(...todasImagens);
        console.log(`✅ Encontradas ${todasImagens.length} imagens na busca ampla`);
      }
      
      const resultado = {
        sucesso: true,
        produto_id: produtoId,
        url: url,
        titulo: infoProduto.titulo,
        preco: infoProduto.preco,
        total_imagens: imagens.length,
        imagens: imagens,
        metodo: indicadores.length > 0 ? 'carrossel_com_indicadores' : 'busca_direta',
        timestamp: new Date().toISOString()
      };
      
      console.log(`📋 Extração concluída: ${imagens.length} imagens encontradas`);
      return resultado;
      
    } catch (error) {
      console.error('❌ Erro ao extrair imagens:', error);
      return {
        sucesso: false,
        produto_id: produtoId,
        erro: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      await this.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔚 Browser fechado');
    }
  }
}

module.exports = QueenBooksBotaoLoginSearcher;
