/**
 * QUEENBOOKS BROWSER-BASED SEARCHER
 * 
 * Versão que usa Puppeteer para aguardar JavaScript carregar
 */

const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

class QueenBooksBrowserSearcher {
  constructor(options = {}) {
    this.baseUrl = 'https://www.queenbooks.com.br';
    this.dataDir = './data/produtos-auth';
    this.sessionFile = './data/.session-cache.json';
    
    // Configurações de autenticação
    this.credentials = {
      username: options.username || process.env.QUEENBOOKS_USERNAME,
      password: options.password || process.env.QUEENBOOKS_PASSWORD
    };
    
    this.browser = null;
    this.page = null;
    this.authenticated = false;
  }

  async init() {
    await fs.ensureDir(this.dataDir);
    await fs.ensureDir('./data');
    
    // Inicializar browser
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Configurar User-Agent
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('🚀 Browser inicializado');
  }

  async login() {
    if (!this.credentials.username || !this.credentials.password) {
      throw new Error('❌ Credenciais não fornecidas.');
    }

    console.log('🔐 Fazendo login no QueenBooks...');
    
    try {
      // 1. Navegar para página de login
      await this.page.goto(`${this.baseUrl}/entrar`, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      console.log('📋 Página de login carregada');

      // 2. Aguardar formulário carregar - usando seletores específicos
      await this.page.waitForSelector('.LoginForm__input___agORS, input[placeholder="E-mail"], input[type="email"]', { timeout: 10000 });
      
      // 3. Preencher credenciais - tentar múltiplos seletores
      const emailSelectors = [
        'input[placeholder="E-mail"]',
        '.LoginForm__input___agORS[type="email"]',
        'input[type="email"]'
      ];
      
      const passwordSelectors = [
        'input[placeholder="Senha"]',
        '.LoginForm__input___agORS[type="password"]',
        'input[type="password"]'
      ];
      
      // Preencher email
      let emailPreenchido = false;
      for (const selector of emailSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.type(selector, this.credentials.username);
          emailPreenchido = true;
          console.log(`✍️  Email preenchido com: ${selector}`);
          break;
        } catch (e) {}
      }
      
      if (!emailPreenchido) {
        throw new Error('❌ Campo de email não encontrado');
      }
      
      // Preencher senha
      let senhaPreenchida = false;
      for (const selector of passwordSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.type(selector, this.credentials.password);
          senhaPreenchida = true;
          console.log(`✍️  Senha preenchida com: ${selector}`);
          break;
        } catch (e) {}
      }
      
      if (!senhaPreenchida) {
        throw new Error('❌ Campo de senha não encontrado');
      }
      
      console.log('✍️  Credenciais preenchidas');

      // 4. Submeter formulário
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
        this.page.click('button[type="submit"], input[type="submit"], .btn-primary')
      ]);
      
      // 5. Verificar se login foi bem-sucedido
      const currentUrl = this.page.url();
      const isLoggedIn = !currentUrl.includes('/entrar') && !currentUrl.includes('/login');
      
      if (isLoggedIn) {
        console.log('✅ Login realizado com sucesso!');
        this.authenticated = true;
        return true;
      } else {
        throw new Error('❌ Falha no login - redirecionamento não ocorreu');
      }
      
    } catch (error) {
      console.log(`❌ Erro no login: ${error.message}`);
      this.authenticated = false;
      throw error;
    }
  }

  async buscarProdutoComPreco(codigo) {
    console.log('🎯 BUSCA COM BROWSER (JAVASCRIPT)');
    console.log('=' .repeat(50));
    console.log(`📋 Código: ${codigo}`);
    
    // Garantir que está autenticado
    if (!this.authenticated) {
      await this.login();
    }

    const produto = {
      codigo: codigo,
      id: codigo,
      titulo: '',
      descricao: '',
      informacoes: {},
      fotos: [],
      preco: null,
      preco_autenticado: null,
      status: 'unknown',
      urlProduto: `${this.baseUrl}/produtos/${codigo}`,
      encontradoEm: new Date().toISOString(),
      metodoBusca: 'browser_javascript'
    };

    try {
      // Navegar para página do produto
      console.log(`📄 Navegando para: ${produto.urlProduto}`);
      
      await this.page.goto(produto.urlProduto, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Aguardar conteúdo carregar
      console.log('⏳ Aguardando JavaScript carregar...');
      await this.page.waitForTimeout(3000);

      // Tentar aguardar elementos específicos
      try {
        await this.page.waitForSelector('h1, .price, [class*="price"]', { timeout: 5000 });
      } catch (e) {
        console.log('⚠️  Elementos não encontrados, continuando...');
      }

      // Extrair dados
      const dadosExtraidos = await this.page.evaluate(() => {
        const dados = {};
        
        // Título
        const titulo = document.querySelector('h1')?.textContent?.trim() ||
                     document.querySelector('title')?.textContent?.trim() ||
                     document.querySelector('[property="og:title"]')?.content;
        dados.titulo = titulo;

        // Preço - múltiplos seletores
        const precoSelectors = [
          'h3[class*="AddToCartContainer__price"]',
          '.price',
          '[class*="price"]',
          '[class*="Price"]',
          'span:contains("R$")',
          'div:contains("R$")'
        ];

        let precoEncontrado = null;
        for (const selector of precoSelectors) {
          try {
            const elemento = document.querySelector(selector);
            if (elemento) {
              const texto = elemento.textContent || elemento.innerText;
              const match = texto.match(/R\$\s*([0-9.,]+)/);
              if (match) {
                precoEncontrado = match[1];
                break;
              }
            }
          } catch (e) {}
        }

        // Se não encontrou, procurar por qualquer texto com R$
        if (!precoEncontrado) {
          const bodyText = document.body.innerText || '';
          const matches = bodyText.match(/R\$\s*([0-9.,]+)/g) || [];
          if (matches.length > 0) {
            // Pegar o primeiro valor que parece ser um preço (entre 10 e 10000)
            for (const match of matches) {
              const valor = parseFloat(match.replace(/[^\d,]/g, '').replace(',', '.'));
              if (valor >= 10 && valor <= 10000) {
                precoEncontrado = match.replace('R$ ', '').replace('R$', '');
                break;
              }
            }
          }
        }

        dados.preco = precoEncontrado;

        // Informações adicionais
        const infoText = document.body.innerText || '';
        dados.informacoes = {};
        
        // ISBN
        const isbnMatch = infoText.match(/ISBN:\s*([0-9-]+)/i);
        if (isbnMatch) dados.informacoes.ISBN = isbnMatch[1];
        
        // Editora
        const editoraMatch = infoText.match(/Editora:\s*([^\n]+)/i);
        if (editoraMatch) dados.informacoes.Editora = editoraMatch[1];
        
        // Autor
        const autorMatch = infoText.match(/Autor:\s*([^\n]+)/i);
        if (autorMatch) dados.informacoes.Autor = autorMatch[1];

        return dados;
      });

      // Aplicar dados extraídos
      produto.titulo = dadosExtraidos.titulo || '';
      produto.informacoes = dadosExtraidos.informacoes || {};

      if (dadosExtraidos.preco) {
        const precoStr = dadosExtraidos.preco.replace(/[^\d,]/g, '').replace(',', '.');
        const preco = parseFloat(precoStr);
        if (preco && preco > 0) {
          produto.preco_autenticado = preco;
          produto.preco = preco;
          console.log(`💰 Preço encontrado: R$ ${preco.toFixed(2).replace('.', ',')}`);
        }
      }

      // Salvar produto
      await this.salvarProduto(produto);
      
      console.log('✅ Produto processado com sucesso!');
      console.log(`📚 Título: ${produto.titulo}`);
      
      return { ...produto, encontrado: true };

    } catch (error) {
      console.log(`❌ Erro na busca: ${error.message}`);
      return { ...produto, encontrado: false, erro: error.message };
    }
  }

  async salvarProduto(produto) {
    const filename = `produto_${produto.codigo}_${Date.now()}.json`;
    const filepath = path.join(this.dataDir, filename);
    await fs.writeJson(filepath, produto, { spaces: 2 });
    console.log(`💾 Produto salvo: ${filename}`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔚 Browser fechado');
    }
  }
}

module.exports = QueenBooksBrowserSearcher;
