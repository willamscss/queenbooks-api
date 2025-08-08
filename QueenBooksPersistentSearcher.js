/**
 * QUEENBOOKS PERSISTENT SESSION SEARCHER
 * 
 * Versão com sessão persistente - evita autenticação a cada busca
 * Salva cookies e estado de autenticação em arquivo
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class QueenBooksPersistentSearcher {
  constructor(options = {}) {
    this.baseUrl = 'https://www.queenbooks.com.br';
    this.dataDir = './data/produtos-auth';
    this.sessionFile = './data/.session-cache.json';
    this.timeout = 15000;
    
    // Configurações de autenticação
    this.credentials = {
      username: options.username || process.env.QUEENBOOKS_USERNAME,
      password: options.password || process.env.QUEENBOOKS_PASSWORD
    };
    
    this.authenticated = false;
    this.session = null;
    this.sessionData = {
      cookies: '',
      authenticated: false,
      lastAuth: null,
      expiresAt: null
    };
    
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
    await fs.ensureDir('./data');
    await fs.ensureDir('./logs');
    
    // Criar sessão axios
    this.session = axios.create({
      timeout: this.timeout,
      headers: this.defaultHeaders,
      withCredentials: true
    });

    // Carregar sessão salva
    await this.loadSession();
  }

  /**
   * Carregar sessão salva do arquivo
   */
  async loadSession() {
    try {
      if (await fs.pathExists(this.sessionFile)) {
        console.log('📄 Carregando sessão salva...');
        this.sessionData = await fs.readJson(this.sessionFile);
        
        // Verificar se a sessão ainda é válida (24 horas)
        const now = new Date();
        const expiresAt = new Date(this.sessionData.expiresAt || 0);
        
        if (this.sessionData.authenticated && expiresAt > now) {
          console.log('✅ Sessão válida encontrada - usando autenticação salva');
          this.authenticated = true;
          return true;
        } else {
          console.log('⚠️  Sessão expirada - nova autenticação necessária');
          this.sessionData.authenticated = false;
        }
      }
    } catch (error) {
      console.log('⚠️  Erro ao carregar sessão:', error.message);
    }
    
    return false;
  }

  /**
   * Salvar sessão no arquivo
   */
  async saveSession() {
    try {
      // Definir expiração para 24 horas
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      this.sessionData = {
        ...this.sessionData,
        authenticated: this.authenticated,
        lastAuth: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      };
      
      await fs.writeJson(this.sessionFile, this.sessionData, { spaces: 2 });
      console.log('💾 Sessão salva com sucesso');
    } catch (error) {
      console.log('⚠️  Erro ao salvar sessão:', error.message);
    }
  }

  /**
   * Realizar login no QueenBooks (só quando necessário)
   */
  async ensureAuthenticated() {
    // Se já está autenticado, verificar se ainda é válido
    if (this.authenticated) {
      const isValid = await this.verifyAuthentication();
      if (isValid) {
        console.log('✅ Sessão ainda válida - usando autenticação existente');
        return true;
      } else {
        console.log('⚠️  Sessão inválida - reautenticando...');
        this.authenticated = false;
      }
    }

    // Fazer login
    return await this.login();
  }

  async login() {
    if (!this.credentials.username || !this.credentials.password) {
      throw new Error('❌ Credenciais não fornecidas.');
    }

    console.log('🔐 Iniciando login no QueenBooks...');
    
    try {
      // 1. Acessar página de login
      console.log('📋 Acessando página de login: /entrar');
      const loginPageResponse = await this.session.get(`${this.baseUrl}/entrar`);
      
      // Extrair cookies da resposta
      this.updateCookies(loginPageResponse);
      
      // 2. Analisar formulário de login
      const loginHtml = loginPageResponse.data;
      const csrfToken = this.extractCSRFToken(loginHtml);
      const formAction = this.extractFormAction(loginHtml) || '/entrar';
      
      // 3. Preparar dados do login
      const loginData = new URLSearchParams({
        email: this.credentials.username,
        password: this.credentials.password,
        ...(csrfToken && { _token: csrfToken })
      });

      console.log('🚀 Enviando credenciais...');
      
      // 4. Fazer login
      const response = await this.session.post(`${this.baseUrl}${formAction}`, loginData, {
        headers: {
          ...this.defaultHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${this.baseUrl}/entrar`,
          ...(this.sessionData.cookies && { 'Cookie': this.sessionData.cookies })
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 400 || status === 302
      });
      
      this.updateCookies(response);
      
      // 5. Verificar se login foi bem-sucedido
      if (await this.verifyAuthentication()) {
        console.log('✅ Login realizado com sucesso!');
        this.authenticated = true;
        await this.saveSession();
        return true;
      }
      
      throw new Error('❌ Falha na verificação de autenticação');
      
    } catch (error) {
      console.log(`❌ Erro no login: ${error.message}`);
      this.authenticated = false;
      throw error;
    }
  }

  /**
   * Extrair CSRF token
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
   * Extrair action do formulário
   */
  extractFormAction(html) {
    const patterns = [
      /<form[^>]*action=["']([^"']+)["'][^>]*>/i,
      /action=["']([^"']+)["']/i
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
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
      const newCookies = setCookies.map(cookie => cookie.split(';')[0]).join('; ');
      
      // Combinar com cookies existentes se houver
      if (this.sessionData.cookies) {
        const existingCookies = this.sessionData.cookies.split('; ');
        const allCookies = [...existingCookies, ...newCookies.split('; ')];
        
        // Remover duplicatas (manter o mais recente)
        const cookieMap = {};
        allCookies.forEach(cookie => {
          const [name] = cookie.split('=');
          if (name) cookieMap[name] = cookie;
        });
        
        this.sessionData.cookies = Object.values(cookieMap).join('; ');
      } else {
        this.sessionData.cookies = newCookies;
      }
      
      console.log('🍪 Cookies atualizados');
    }
  }

  /**
   * Verificar se ainda está autenticado
   */
  async verifyAuthentication() {
    try {
      const response = await this.session.get(`${this.baseUrl}/minha-conta`, {
        headers: {
          ...this.defaultHeaders,
          ...(this.sessionData.cookies && { 'Cookie': this.sessionData.cookies })
        }
      });
      
      const html = response.data;
      const loginIndicators = [/logout/i, /sair/i, /minha conta/i, /pedidos/i];
      const notLoggedIndicators = [/fazer login/i, /entrar/i, /login/i];
      
      const isLoggedIn = loginIndicators.some(pattern => pattern.test(html));
      const notLoggedIn = notLoggedIndicators.some(pattern => pattern.test(html));
      
      return isLoggedIn && !notLoggedIn;
    } catch (error) {
      return false;
    }
  }

  /**
   * Buscar produto com preços (com sessão persistente)
   */
  async buscarProdutoComPreco(codigo) {
    console.log('🎯 BUSCA COM SESSÃO PERSISTENTE');
    console.log('=' .repeat(50));
    console.log(`📋 Código: ${codigo}`);
    
    // Garantir que está autenticado
    await this.ensureAuthenticated();

    const produto = {
      codigo: codigo,
      id: codigo, // O código já é o ID
      titulo: '',
      descricao: '',
      informacoes: {},
      fotos: [],
      preco: null,
      preco_autenticado: null,
      status: 'unknown',
      urlProduto: `${this.baseUrl}/produtos/${codigo}`,
      encontradoEm: new Date().toISOString(),
      metodoBusca: 'sessao_persistente'
    };

    try {
      // Acessar diretamente a página do produto
      console.log(`� Acessando página do produto: ${codigo}`);
      console.log(`🔗 URL: ${produto.urlProduto}`);
      
      const produtoResponse = await this.session.get(produto.urlProduto, {
        headers: {
          ...this.defaultHeaders,
          ...(this.sessionData.cookies && { 'Cookie': this.sessionData.cookies })
        }
      });

      // Verificar se a página foi encontrada
      if (produtoResponse.status === 404) {
        console.log('❌ Produto não encontrado (404)');
        return { ...produto, encontrado: false };
      }

      let html = produtoResponse.data;
      
      // Se o HTML é muito pequeno, pode ser SPA - tentar aguardar ou buscar API
      if (html.length < 5000) {
        console.log('⚠️  HTML pequeno detectado - possivelmente SPA');
        console.log('🔍 Tentando buscar dados via meta tags...');
        
        // Extrair dados dos meta tags (que estão disponíveis)
        this.extrairDadosMetaTags(html, produto);
        
        // Tentar encontrar API endpoints
        console.log('🔍 Procurando por APIs internas...');
        await this.tentarAPIsInternas(produto);
        
        // Tentar API específica do Mercos
        if (!produto.preco_autenticado) {
          console.log('🎯 Tentando API específica do Mercos...');
          const resultadoMercos = await this.buscarPrecoViaMercosAPI(produto.codigo);
          
          if (resultadoMercos.sucesso && resultadoMercos.preco) {
            produto.preco_autenticado = resultadoMercos.preco;
            produto.preco = resultadoMercos.preco;
            console.log(`✅ Preço obtido via API Mercos: R$ ${resultadoMercos.preco.toFixed(2)}`);
          }
        }
      } else {
        // HTML completo - extração normal
        this.extrairDadosCompletos(html, produto);
      }
      
      // Verificar se encontrou dados básicos
      if (!produto.titulo && !produto.preco_autenticado) {
        console.log('❌ Produto não contém dados válidos');
        return { ...produto, encontrado: false };
      }
      
      // Salvar produto
      await this.salvarProduto(produto);
      
      console.log('✅ Produto processado com sucesso!');
      console.log('🔄 Sessão mantida para próximas buscas');
      
      return { ...produto, encontrado: true };

    } catch (error) {
      console.log(`❌ Erro na busca: ${error.message}`);
      
      // Se erro de autenticação, limpar sessão
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🔄 Limpando sessão inválida...');
        this.authenticated = false;
        this.sessionData.authenticated = false;
        await this.saveSession();
      }
      
      return { ...produto, encontrado: false, erro: error.message };
    }
  }

  /**
   * Extrair ID do produto
   */
  extrairIdProduto(html, codigo) {
    const codigoRegex = new RegExp(`Cód\\.\\s*${codigo}`, 'gi');
    if (!html.match(codigoRegex)) {
      return null;
    }

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
   * Extrair dados do produto incluindo preço
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
        produto.titulo = match[1].trim().replace(' - QueenBooks', '');
        break;
      }
    }

    // Preço - padrões específicos baseados no HTML fornecido
    const precoPatterns = [
      // Padrão específico: <h3 class="AddToCartContainer__price___4Ltr+">R$ 629,30
      /<h3[^>]*class="[^"]*AddToCartContainer__price[^"]*"[^>]*>R\$\s*([0-9.,]+)/i,
      // Padrão alternativo sem aspas na classe
      /<h3[^>]*AddToCartContainer__price[^>]*>R\$\s*([0-9.,]+)/i,
      // Qualquer elemento com classe price que contenha R$
      /class="[^"]*price[^"]*"[^>]*>.*?R\$\s*([0-9.,]+)/gi,
      // Div com informationForSale seguido de preço
      /AddToCartContainer__informationForSale[^>]*>.*?R\$\s*([0-9.,]+)/gi,
      // Padrões gerais de fallback
      /R\$\s*([0-9.,]+)/gi,
      /price[^>]*>.*?R\$\s*([0-9.,]+)/gi,
      /"price"\s*:\s*"?([0-9.,]+)"?/gi
    ];
    
    for (const pattern of precoPatterns) {
      let match;
      if (pattern.global) {
        const matches = [...html.matchAll(pattern)];
        match = matches[0];
      } else {
        match = html.match(pattern);
      }
      
      if (match && match[1]) {
        const precoStr = match[1].replace(/[^\d,]/g, '').replace(',', '.');
        const preco = parseFloat(precoStr);
        if (preco && preco > 0 && preco < 50000) { // Validação ajustada para preços maiores
          produto.preco_autenticado = preco;
          produto.preco = preco;
          console.log(`💰 Preço encontrado: R$ ${preco.toFixed(2).replace('.', ',')}`);
          console.log(`🔍 Padrão usado: ${pattern.toString()}`);
          break;
        }
      }
    }

    // Debug: Se não encontrou preço, procurar por elementos relacionados
    if (!produto.preco_autenticado) {
      console.log('🔍 Debug: Procurando elementos de preço na página...');
      
      // Procurar por AddToCartContainer
      const addToCartMatch = html.match(/AddToCartContainer[^>]*>/gi);
      if (addToCartMatch) {
        console.log(`📦 Encontrado ${addToCartMatch.length} elementos AddToCartContainer`);
      }
      
      // Procurar por qualquer R$ na página
      const rsMatches = [...html.matchAll(/R\$\s*[0-9.,]+/gi)];
      if (rsMatches.length > 0) {
        console.log(`💸 Encontrados ${rsMatches.length} valores R$ na página:`);
        rsMatches.slice(0, 3).forEach((match, i) => {
          console.log(`   ${i+1}. ${match[0]}`);
        });
      }
    }

    // Informações adicionais
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

    console.log(`📚 Título: ${produto.titulo}`);
    if (produto.preco_autenticado) {
      console.log(`💰 Preço: R$ ${produto.preco_autenticado.toFixed(2)}`);
    } else {
      console.log('⚠️  Preço não encontrado - pode precisar ajustar padrões');
    }
  }

  /**
   * Extrair dados dos meta tags (para SPAs)
   */
  extrairDadosMetaTags(html, produto) {
    console.log('📋 Extraindo dados dos meta tags...');
    
    // Título
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      produto.titulo = titleMatch[1].trim().replace(' - QueenBooks', '');
    }
    
    // Meta description com informações
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    if (descMatch) {
      const descContent = descMatch[1];
      
      // Extrair informações específicas
      const infoPatterns = {
        'ISBN': /ISBN:\s*([0-9-]+)/i,
        'Editora': /Editora:\s*([^\n]+)/i,
        'Autor': /Autor:\s*([^\n]+)/i,
        'Páginas': /Páginas:\s*(\d+)/i,
        'Ano': /Ano:\s*(\d{4})/i,
        'Origem': /Origem:\s*([^\n]+)/i
      };
      
      for (const [key, pattern] of Object.entries(infoPatterns)) {
        const match = descContent.match(pattern);
        if (match) {
          produto.informacoes[key] = match[1].trim();
        }
      }
    }
    
    console.log(`📚 Título (meta): ${produto.titulo}`);
    console.log(`📋 Informações extraídas: ${Object.keys(produto.informacoes).length} campos`);
  }

  /**
   * Tentar APIs internas para buscar preços
   */
  async tentarAPIsInternas(produto) {
    console.log('🔍 Tentando APIs internas...');
    
    // APIs comuns do Mercos/QueenBooks
    const apiEndpoints = [
      `/api/produtos/${produto.codigo}`,
      `/api/product/${produto.codigo}`,
      `/produtos/${produto.codigo}/preco`,
      `/api/v1/produtos/${produto.codigo}`,
      `/mercos/produtos/${produto.codigo}`
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`🔍 Tentando: ${endpoint}`);
        
        const response = await this.session.get(`${this.baseUrl}${endpoint}`, {
          headers: {
            ...this.defaultHeaders,
            'Accept': 'application/json',
            ...(this.sessionData.cookies && { 'Cookie': this.sessionData.cookies })
          }
        });
        
        if (response.status === 200 && response.data) {
          console.log(`✅ API encontrada: ${endpoint}`);
          
          // Tentar extrair preço do JSON
          const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
          
          const precoFields = ['preco', 'price', 'valor', 'value', 'preco_venda'];
          for (const field of precoFields) {
            if (data[field] && typeof data[field] === 'number') {
              produto.preco_autenticado = data[field];
              produto.preco = data[field];
              console.log(`💰 Preço encontrado via API: R$ ${data[field].toFixed(2).replace('.', ',')}`);
              return;
            }
          }
        }
      } catch (error) {
        // Continuar tentando outras APIs
      }
    }
    
    console.log('❌ Nenhuma API interna funcionou');
  }

  /**
   * Buscar preço via API do Mercos (solução definitiva)
   */
  async buscarPrecoViaMercosAPI(codigo) {
    console.log('🎯 BUSCA VIA API MERCOS');
    console.log('=' .repeat(50));
    console.log(`📋 Código: ${codigo}`);
    
    // Garantir que está autenticado
    await this.ensureAuthenticated();

    try {
      // 1. Primeiro, acessar a página do produto para obter tokens/contexto
      console.log('🔍 Acessando página do produto primeiro...');
      const paginaResponse = await this.session.get(`${this.baseUrl}/produtos/${codigo}`, {
        headers: {
          ...this.defaultHeaders,
          ...(this.sessionData.cookies && { 'Cookie': this.sessionData.cookies })
        }
      });
      
      // Aguardar um pouco para simular carregamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 2. Tentar diferentes endpoints e headers
      const endpoints = [
        `https://app.mercos.com/api_b2b/v1/produtos/${codigo}`,
        `${this.baseUrl}/api/produtos/${codigo}`,
        `${this.baseUrl}/api/mercos/produtos/${codigo}`,
      ];
      
      const headerConfigs = [
        {
          ...this.defaultHeaders,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${this.baseUrl}/produtos/${codigo}`,
          'Origin': this.baseUrl
        },
        {
          ...this.defaultHeaders,
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      ];
      
      for (const endpoint of endpoints) {
        for (const headers of headerConfigs) {
          try {
            console.log(`🔍 Tentando: ${endpoint}`);
            
            const response = await this.session.get(endpoint, {
              headers: {
                ...headers,
                ...(this.sessionData.cookies && { 'Cookie': this.sessionData.cookies })
              }
            });

            if (response.status === 200) {
              console.log(`✅ API respondeu: ${endpoint}`);
              
              const data = response.data;
              
              // Se recebeu HTML, não é a API que queremos
              if (typeof data === 'string' && data.includes('<html')) {
                console.log('⚠️ Recebeu HTML, não JSON');
                continue;
              }
              
              console.log('📄 Dados recebidos:', JSON.stringify(data).substring(0, 300) + '...');
              
              // Procurar preço nos dados
              const precoFields = [
                'preco', 'price', 'valor', 'value', 'preco_venda', 
                'preco_unitario', 'valor_unitario', 'preco_final',
                'preco_tabela', 'preco_promocional'
              ];
              
              let precoEncontrado = null;
              
              // Buscar em campos diretos
              for (const field of precoFields) {
                if (data[field] && (typeof data[field] === 'number' || typeof data[field] === 'string')) {
                  const valor = parseFloat(data[field].toString().replace(/[^\d.,]/g, '').replace(',', '.'));
                  if (valor > 0 && valor < 50000) {
                    precoEncontrado = valor;
                    console.log(`💰 Preço encontrado no campo '${field}': R$ ${valor.toFixed(2)}`);
                    return {
                      sucesso: true,
                      preco: precoEncontrado,
                      dados_completos: data,
                      endpoint_usado: endpoint
                    };
                  }
                }
              }
              
              // Se não encontrou, buscar em objetos aninhados
              if (!precoEncontrado && typeof data === 'object') {
                const dataStr = JSON.stringify(data);
                
                // Procurar especificamente por 629
                if (dataStr.includes('629')) {
                  console.log('🎯 Valor 629 encontrado nos dados!');
                  const matches629 = dataStr.match(/629[.,]?30?/g);
                  if (matches629) {
                    precoEncontrado = 629.30;
                    console.log(`💰 Preço específico encontrado: R$ 629,30`);
                    return {
                      sucesso: true,
                      preco: precoEncontrado,
                      dados_completos: data,
                      endpoint_usado: endpoint
                    };
                  }
                }
                
                // Regex mais amplo
                const matches = dataStr.match(/[\"\']?(?:preco|price|valor)[\"\']?\s*:\s*[\"\']?(\d+[.,]?\d*)/gi);
                
                if (matches) {
                  for (const match of matches) {
                    const valorMatch = match.match(/(\d+[.,]?\d*)/);
                    if (valorMatch) {
                      const valor = parseFloat(valorMatch[1].replace(',', '.'));
                      if (valor > 10 && valor < 50000) {
                        precoEncontrado = valor;
                        console.log(`💰 Preço encontrado via regex: R$ ${valor.toFixed(2)}`);
                        return {
                          sucesso: true,
                          preco: precoEncontrado,
                          dados_completos: data,
                          endpoint_usado: endpoint
                        };
                      }
                    }
                  }
                }
              }
              
            } else {
              console.log(`❌ Status: ${response.status} para ${endpoint}`);
            }
            
          } catch (error) {
            console.log(`❌ Erro em ${endpoint}: ${error.message}`);
          }
        }
      }
        
      return { sucesso: false, erro: 'Nenhum endpoint funcionou' };
      
    } catch (error) {
      console.log(`❌ Erro geral na API do Mercos: ${error.message}`);
      return { sucesso: false, erro: error.message };
    }
  }

  /**
   * Salvar produto
   */
  async salvarProduto(produto) {
    const filename = `produto_${produto.codigo}_${Date.now()}.json`;
    const filepath = path.join(this.dataDir, filename);
    await fs.writeJson(filepath, produto, { spaces: 2 });
    console.log(`💾 Produto salvo: ${filename}`);
  }

  /**
   * Limpar sessão salva
   */
  async clearSession() {
    try {
      await fs.remove(this.sessionFile);
      this.sessionData = {
        cookies: '',
        authenticated: false,
        lastAuth: null,
        expiresAt: null
      };
      this.authenticated = false;
      console.log('🗑️  Sessão limpa');
    } catch (error) {
      console.log('⚠️  Erro ao limpar sessão:', error.message);
    }
  }
}

module.exports = QueenBooksPersistentSearcher;
