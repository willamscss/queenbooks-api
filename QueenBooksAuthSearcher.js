/**
 * QUEENBOOKS AUTHENTICATED SEARCHER
 * 
 * Versão com autenticação para acessar preços dos produtos
 * Mantém compatibilidade com a versão atual
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class QueenBooksAuthSearcher {
  constructor(options = {}) {
    this.baseUrl = 'https://www.queenbooks.com.br';
    this.dataDir = './data/produtos-auth';
    this.timeout = 15000;
    
    // Configurações de autenticação
    this.credentials = {
      username: options.username || process.env.QUEENBOOKS_USERNAME,
      password: options.password || process.env.QUEENBOOKS_PASSWORD
    };
    
    this.authenticated = false;
    this.session = null;
    this.cookies = '';
    
    // Headers padrão
    this.defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
  }

  async init() {
    await fs.ensureDir(this.dataDir);
    await fs.ensureDir('./logs');
    
    // Criar sessão axios
    this.session = axios.create({
      timeout: this.timeout,
      headers: this.defaultHeaders,
      withCredentials: true
    });
  }

  /**
   * Realizar login no QueenBooks
   */
  async login() {
    if (!this.credentials.username || !this.credentials.password) {
      throw new Error('❌ Credenciais não fornecidas. Use USERNAME e PASSWORD ou passe como parâmetro.');
    }

    console.log('🔐 Iniciando login no QueenBooks...');
    
    try {
      // 1. Acessar página de login para pegar tokens/cookies
      console.log('📋 Acessando página de login: /entrar');
      const loginPageResponse = await this.session.get(`${this.baseUrl}/entrar`);
      
      // Extrair cookies da resposta
      this.updateCookies(loginPageResponse);
      
      // 2. Procurar por campos/tokens necessários
      const loginHtml = loginPageResponse.data;
      const csrfToken = this.extractCSRFToken(loginHtml);
      
      // 3. Analisar formulário de login
      const formAction = this.extractFormAction(loginHtml);
      console.log(`🎯 Form action encontrado: ${formAction || '/entrar'}`);
      
      // 4. Preparar dados do login (múltiplos formatos)
      const loginDataFormats = [
        // Formato 1: campos padrão
        {
          username: this.credentials.username,
          password: this.credentials.password,
          ...(csrfToken && { _token: csrfToken })
        },
        // Formato 2: email/senha
        {
          email: this.credentials.username,
          password: this.credentials.password,
          ...(csrfToken && { _token: csrfToken })
        },
        // Formato 3: login/senha
        {
          login: this.credentials.username,
          senha: this.credentials.password,
          ...(csrfToken && { _token: csrfToken })
        }
      ];

      console.log('🚀 Enviando credenciais...');
      
      // 5. Tentar login com diferentes formatos
      const loginEndpoint = formAction || '/entrar';
      
      for (const loginData of loginDataFormats) {
        try {
          console.log(`🔄 Tentativa com formato:`, Object.keys(loginData));
          
          const response = await this.session.post(`${this.baseUrl}${loginEndpoint}`, 
            new URLSearchParams(loginData).toString(), {
            headers: {
              ...this.defaultHeaders,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Referer': `${this.baseUrl}/entrar`,
              ...(this.cookies && { 'Cookie': this.cookies })
            },
            maxRedirects: 0,
            validateStatus: (status) => status < 400 || status === 302
          });
          
          this.updateCookies(response);
          
          // Verificar se login foi bem-sucedido
          if (await this.verifyAuthentication()) {
            console.log('✅ Login realizado com sucesso!');
            this.authenticated = true;
            return true;
          }
        } catch (error) {
          console.log(`⚠️  Tentativa falhou: ${error.message}`);
        }
      }
      
      throw new Error('❌ Falha no login com todos os formatos testados');
      
    } catch (error) {
      console.log(`❌ Erro no login: ${error.message}`);
      this.authenticated = false;
      throw error;
    }
  }

  /**
   * Extrair action do formulário de login
   */
  extractFormAction(html) {
    const patterns = [
      /<form[^>]*action=["']([^"']+)["'][^>]*>/i,
      /action=["']([^"']+)["']/i
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        console.log('🎯 Form action encontrado:', match[1]);
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Extrair CSRF token da página de login
   */
  extractCSRFToken(html) {
    const patterns = [
      /_token["']?\s*:\s*["']([^"']+)["']/i,
      /name=["']_token["']\s+value=["']([^"']+)["']/i,
      /csrf_token["']?\s*:\s*["']([^"']+)["']/i,
      /name=["']csrf_token["']\s+value=["']([^"']+)["']/i
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        console.log('🔑 CSRF token encontrado');
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Atualizar cookies da sessão
   */
  updateCookies(response) {
    const setCookies = response.headers['set-cookie'];
    if (setCookies) {
      this.cookies = setCookies.map(cookie => cookie.split(';')[0]).join('; ');
      console.log('🍪 Cookies atualizados');
    }
  }

  /**
   * Verificar se está autenticado
   */
  async verifyAuthentication() {
    try {
      // Tentar acessar uma página que requer login ou uma página que muda quando logado
      const testPages = [
        '/minha-conta',
        '/conta',
        '/perfil',
        '/pedidos',
        '/entrar' // A própria página de login pode mostrar se já está logado
      ];
      
      for (const page of testPages) {
        try {
          const response = await this.session.get(`${this.baseUrl}${page}`, {
            headers: {
              ...this.defaultHeaders,
              ...(this.cookies && { 'Cookie': this.cookies })
            }
          });
          
          // Procurar indicadores de login bem-sucedido
          const html = response.data;
          const loginIndicators = [
            /logout/i,
            /sair/i,
            /minha conta/i,
            /welcome/i,
            /bem-vindo/i,
            /dashboard/i,
            /olá/i,
            /logado/i,
            /meus pedidos/i
          ];
          
          // Procurar indicadores de NÃO estar logado
          const notLoggedIndicators = [
            /fazer login/i,
            /entrar/i,
            /login/i,
            /cadastre-se/i,
            /criar conta/i
          ];
          
          const isLoggedIn = loginIndicators.some(pattern => pattern.test(html));
          const notLoggedIn = notLoggedIndicators.some(pattern => pattern.test(html));
          
          if (isLoggedIn && !notLoggedIn) {
            console.log(`✅ Autenticação verificada em: ${page}`);
            return true;
          }
        } catch (error) {
          // Continuar tentando outras páginas
          console.log(`⚠️  Erro ao verificar ${page}: ${error.message}`);
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Buscar produto com preços (versão autenticada)
   */
  async buscarProdutoComPreco(codigo) {
    console.log('🎯 BUSCA AUTENTICADA QUEENBOOKS');
    console.log('=' .repeat(50));
    console.log(`📋 Código: ${codigo}`);
    
    // Verificar se está autenticado
    if (!this.authenticated) {
      console.log('🔐 Realizando login...');
      await this.login();
    }

    const produto = {
      codigo: codigo,
      titulo: '',
      descricao: '',
      informacoes: {},
      fotos: [],
      preco: null,
      preco_autenticado: null,
      status: 'unknown',
      urlBusca: `${this.baseUrl}/?busca=${codigo}`,
      urlProduto: '',
      encontradoEm: new Date().toISOString(),
      metodoBusca: 'autenticado'
    };

    try {
      // 1. Buscar o produto
      console.log('🔍 Buscando produto...');
      const buscaResponse = await this.session.get(`${this.baseUrl}/?busca=${codigo}`, {
        headers: {
          ...this.defaultHeaders,
          ...(this.cookies && { 'Cookie': this.cookies })
        }
      });

      // 2. Extrair ID do produto
      const produtoId = this.extrairIdProduto(buscaResponse.data, codigo);
      
      if (!produtoId) {
        console.log('❌ Produto não encontrado');
        return { ...produto, encontrado: false };
      }

      produto.id = produtoId;
      produto.urlProduto = `${this.baseUrl}/produtos/${produtoId}`;
      
      // 3. Acessar página do produto autenticado
      console.log(`📄 Acessando página do produto: ${produtoId}`);
      const produtoResponse = await this.session.get(produto.urlProduto, {
        headers: {
          ...this.defaultHeaders,
          ...(this.cookies && { 'Cookie': this.cookies })
        }
      });

      // 4. Extrair dados do produto incluindo preço
      this.extrairDadosCompletos(produtoResponse.data, produto);
      
      // 5. Salvar dados
      await this.salvarProduto(produto);
      
      console.log('✅ Produto processado com sucesso!');
      return { ...produto, encontrado: true };

    } catch (error) {
      console.log(`❌ Erro na busca: ${error.message}`);
      return { ...produto, encontrado: false, erro: error.message };
    }
  }

  /**
   * Extrair ID do produto da página de busca
   */
  extrairIdProduto(html, codigo) {
    // Procurar pelo código específico e extrair ID próximo
    const codigoRegex = new RegExp(`Cód\\.\\s*${codigo}`, 'gi');
    if (!html.match(codigoRegex)) {
      return null;
    }

    // Extrair ID do produto do contexto
    const idPatterns = [
      /\/produtos\/(\d+)/gi,
      /data-product-id="(\d+)"/gi,
      /product[^"]*(\d{8,})/gi
    ];

    for (const pattern of idPatterns) {
      const matches = [...html.matchAll(pattern)];
      for (const match of matches) {
        const id = match[1];
        if (id && id.length >= 6) {
          return id;
        }
      }
    }

    return null;
  }

  /**
   * Extrair todos os dados do produto incluindo preço
   */
  extrairDadosCompletos(html, produto) {
    // Título
    const titlePatterns = [
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /<title>([^<]+)<\/title>/i,
      /property="og:title"[^>]*content="([^"]+)"/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match) {
        produto.titulo = match[1].trim();
        break;
      }
    }

    // Preço (múltiplos formatos)
    const precoPatterns = [
      /R\$\s*([0-9.,]+)/gi,
      /price[^>]*>.*?R\$\s*([0-9.,]+)/gi,
      /valor[^>]*>.*?([0-9.,]+)/gi,
      /"price"\s*:\s*"?([0-9.,]+)"?/gi
    ];
    
    for (const pattern of precoPatterns) {
      const matches = [...html.matchAll(pattern)];
      for (const match of matches) {
        const precoStr = match[1].replace(/[^\d,]/g, '').replace(',', '.');
        const preco = parseFloat(precoStr);
        if (preco && preco > 0) {
          produto.preco_autenticado = preco;
          produto.preco = preco; // Compatibilidade
          console.log(`💰 Preço encontrado: R$ ${preco.toFixed(2)}`);
          break;
        }
      }
      if (produto.preco) break;
    }

    // Informações adicionais (ISBN, editora, etc.)
    const infoPatterns = {
      'ISBN': /isbn[^:]*:?\s*([0-9-]+)/gi,
      'Editora': /editora[^:]*:?\s*([^<\n]+)/gi,
      'Autor': /autor[^:]*:?\s*([^<\n]+)/gi,
      'Páginas': /páginas?[^:]*:?\s*(\d+)/gi,
      'Ano': /ano[^:]*:?\s*(\d{4})/gi
    };

    for (const [key, pattern] of Object.entries(infoPatterns)) {
      const match = html.match(pattern);
      if (match) {
        produto.informacoes[key] = match[1].trim();
      }
    }

    console.log(`📚 Dados extraídos: ${produto.titulo}`);
    if (produto.preco_autenticado) {
      console.log(`💰 Preço: R$ ${produto.preco_autenticado.toFixed(2)}`);
    }
  }

  /**
   * Salvar produto no arquivo
   */
  async salvarProduto(produto) {
    const filename = `produto_${produto.codigo}_${Date.now()}.json`;
    const filepath = path.join(this.dataDir, filename);
    await fs.writeJson(filepath, produto, { spaces: 2 });
    console.log(`💾 Produto salvo: ${filename}`);
  }
}

module.exports = QueenBooksAuthSearcher;
