#!/usr/bin/env node

/**
 * SERVIDOR QUEENBOOKS COM SESSÃO PERSISTENTE
 * Versão otimizada que mantém a autenticação entre requisições
 */

const express = require('express');
const { QueenBooksRealSearcher } = require('./busca-real.js');
const QueenBooksBotaoLoginSearcher = require('./QueenBooksBotaoLoginSearcher.js');
const QueenBooksStockChecker = require('./QueenBooksStockChecker');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  console.log(`🔄 ${timestamp} - ${req.method} ${req.path} from ${clientIP}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📦 Body:`, req.body);
  }
  next();
});

// Inicializar searchers
const searcherBasico = new QueenBooksRealSearcher();
searcherBasico.init();

let searcherPersistente = null;
const temCredenciais = process.env.QUEENBOOKS_USERNAME && process.env.QUEENBOOKS_PASSWORD;

if (temCredenciais) {
  console.log('🔐 Credenciais encontradas - Inicializando sistema de autenticação');
  searcherPersistente = new QueenBooksBotaoLoginSearcher({
    username: process.env.QUEENBOOKS_USERNAME,
    password: process.env.QUEENBOOKS_PASSWORD,
    headless: true,  // Sempre headless em produção
    debug: false
  });
} else {
  console.log('⚠️  Sem credenciais - Usando apenas modo básico');
}

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'queenbooks-api-persistent',
    version: '3.0.0',
    features: {
      busca_basica: true,
      busca_autenticada: !!searcherPersistente,
      sessao_persistente: !!searcherPersistente,
      precos_disponiveis: !!searcherPersistente
    }
  });
});

app.get('/status', (req, res) => {
  res.json({
    service: 'QueenBooks API with UI Authentication',
    version: '4.0.0',
    features: {
      busca_basica: 'Busca produtos sem autenticação',
      busca_com_precos: searcherPersistente ? 'Busca com preços usando sessão persistente' : 'Indisponível - sem credenciais',
      sessao_persistente: searcherPersistente ? 'Sessão mantida por 24h - sem re-login constante' : 'Indisponível',
      batch_processing: 'Busca múltiplos produtos'
    },
    endpoints: {
      'GET /health': 'Health check',
      'GET /status': 'Esta documentação',
      'POST /buscar-produto': 'Busca básica (sem preços) - RÁPIDO ⚡',
      'POST /buscar-apenas-preco': 'Busca APENAS preço - OTIMIZADO 💰',
      'POST /buscar-produto-com-preco': 'Busca completa com preços',
      'POST /buscar-produtos-batch': 'Busca múltiplos produtos',
      'POST /extrair-imagens': 'Extrai todas as imagens do carrossel 🎠',
      'POST /verificar-estoque': 'Verifica estoque de produtos 📦',
      'GET /estoque/:id': 'Verificação rápida de estoque via GET 📦',
      'POST /limpar-sessao': 'Limpar sessão salva'
    },
    credenciais_configuradas: temCredenciais,
    exemplo_uso: {
      busca_rapida: {
        url: '/buscar-produto',
        body: { id: '177775811' },
        resposta_tempo: '~1-2s',
        observacao: 'Dados completos SEM preços - resposta em ~1s'
      },
      busca_preco: searcherPersistente ? {
        url: '/buscar-apenas-preco',
        body: { id: '177775811' },
        resposta_tempo: '~60s',
        observacao: 'APENAS preço - otimizado para velocidade'
      } : 'Configure QUEENBOOKS_USERNAME e QUEENBOOKS_PASSWORD',
      extrair_imagens: {
        url: '/extrair-imagens',
        body: { id: '177776045' },
        resposta_tempo: '~10-15s',
        observacao: 'Todas as imagens do carrossel'
      },
      verificar_estoque: searcherPersistente ? {
        url: '/verificar-estoque',
        body: { id: '177776741' },
        resposta_tempo: '~60-90s',
        observacao: 'Verifica estoque real disponível'
      } : 'Configure QUEENBOOKS_USERNAME e QUEENBOOKS_PASSWORD',
      verificar_multiplos_estoques: searcherPersistente ? {
        url: '/verificar-estoque',
        body: { ids: ['177776741', '177776553', '207737053'] },
        resposta_tempo: '~120-180s',
        observacao: 'Verifica estoque de múltiplos produtos'
      } : 'Configure QUEENBOOKS_USERNAME e QUEENBOOKS_PASSWORD',
      busca_completa: searcherPersistente ? {
        url: '/buscar-produto-com-preco',
        body: { id: '177775811' },
        observacao: 'Dados completos COM preços - mais lento'
      } : 'Configure QUEENBOOKS_USERNAME e QUEENBOOKS_PASSWORD'
    }
  });
});

// Busca básica (compatibilidade)
app.post('/buscar-produto', async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({
        sucesso: false,
        erro: 'ID do produto é obrigatório',
        exemplo: { id: '177775811' }
      });
    }

    console.log(`🔍 Busca básica para produto: ${id}`);
    
    // Buscar dados básicos usando requisição HTTP direta
    try {
      const axios = require('axios');
      const cheerio = require('cheerio');
      
      const response = await axios.get(`https://www.queenbooks.com.br/produtos/${id}`, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        
        // Extrair informações básicas
        const titulo = $('title').text().replace(' - QueenBooks', '').trim();
        const descricaoMeta = $('meta[name="description"]').attr('content') || '';
        
        // Extrair informações da meta description
        const informacoes = {};
        if (descricaoMeta) {
          const linhas = descricaoMeta.split('\n');
          linhas.forEach(linha => {
            const [chave, valor] = linha.split(':').map(s => s.trim());
            if (chave && valor) {
              informacoes[chave] = valor;
            }
          });
        }
        
        res.json({
          sucesso: true,
          encontrado: true,
          produto: {
            id: id,
            codigo_isbn: informacoes.ISBN || null,
            titulo: titulo || '',
            descricao: descricaoMeta || '',
            preco: null, // Sem preços na busca básica
            status: 'found',
            url_produto: `https://www.queenbooks.com.br/produtos/${id}`,
            fotos: [],
            total_fotos: 0,
            informacoes: informacoes,
            categoria_sugerida: informacoes.Editora?.toLowerCase().includes('assouline') ? 'Livros de Luxo' : 
                               informacoes.Origem?.toLowerCase().includes('nacional') ? 'Livros Nacionais' : 'Livros',
            dropshipping: {
              adequado_dropshipping: true,
              margem_sugerida: '15-25%',
              publico_alvo: informacoes.Editora?.toLowerCase().includes('assouline') ? 'Colecionadores de livros de luxo' : 'Geral',
              nivel_concorrencia: 'medio',
              potencial_vendas: 'bom'
            }
          },
          timestamp: new Date().toISOString()
        });
        return;
      }
    } catch (error) {
      console.log('Erro na busca HTTP direta:', error.message);
    }
    
    // Fallback para busca-real se HTTP direto falhar
    const { buscarProdutoReal } = require('./busca-real');
    const resultado = await buscarProdutoReal(id);
    
    if (resultado && resultado.encontrado) {
      res.json({
        sucesso: true,
        encontrado: true,
        produto: {
          id: resultado.idSite || id,
          codigo_isbn: resultado.codigoIsbn || resultado.informacoes?.ISBN || null,
          titulo: resultado.titulo || '',
          descricao: resultado.descricao || '',
          preco: null, // Sem preços na busca básica
          status: resultado.status || 'found',
          url_produto: resultado.urlProduto || `https://www.queenbooks.com.br/produtos/${id}`,
          fotos: resultado.fotos || [],
          total_fotos: (resultado.fotos || []).length,
          informacoes: resultado.informacoes || {},
          categoria_sugerida: resultado.informacoes?.Editora?.toLowerCase().includes('assouline') ? 'Livros de Luxo' : 
                             resultado.informacoes?.Origem?.toLowerCase().includes('nacional') ? 'Livros Nacionais' : 'Livros',
          dropshipping: resultado.analiseDropshipping || {
            adequado_dropshipping: true,
            margem_sugerida: '15-25%',
            publico_alvo: 'Geral',
            nivel_concorrencia: 'medio',
            potencial_vendas: 'bom'
          }
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        sucesso: true,
        encontrado: false,
        produto: {
          id: id,
          codigo_isbn: null,
          titulo: '',
          descricao: '',
          preco: null,
          status: 'not_found',
          url_produto: `https://www.queenbooks.com.br/produtos/${id}`,
          fotos: [],
          total_fotos: 0,
          informacoes: {},
          categoria_sugerida: 'Não encontrado'
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Erro na busca:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Busca com preços (sessão persistente) - ENDPOINT PRINCIPAL
app.post('/buscar-produto-com-preco', async (req, res) => {
  try {
    if (!searcherPersistente) {
      return res.status(503).json({
        sucesso: false,
        erro: 'Busca autenticada não disponível',
        detalhes: 'Configure QUEENBOOKS_USERNAME e QUEENBOOKS_PASSWORD nas variáveis de ambiente',
        timestamp: new Date().toISOString()
      });
    }

    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({
        sucesso: false,
        erro: 'ID do produto é obrigatório',
        exemplo: { id: '177775811' }
      });
    }

    console.log(`🔐 Nova busca com autenticação UI para produto: ${id}`);
    
    // Inicializar searcher para cada requisição
    try {
      await searcherPersistente.init();
      const resultado = await searcherPersistente.buscarProdutoComPreco(id);
      
      res.json({
        sucesso: true,
        encontrado: resultado.encontrado || false,
        autenticado: true,
        sessao_persistente: true,
        produto: {
          id: resultado.idSite || id,
          codigo_isbn: resultado.codigoIsbn || null,
          titulo: resultado.titulo || '',
          descricao: resultado.descricao || '',
          preco: resultado.preco,
          preco_autenticado: resultado.preco_autenticado || resultado.preco,
          status: resultado.status || 'unknown',
          url_produto: resultado.urlProduto || `https://www.queenbooks.com.br/produtos/${id}`,
          fotos: resultado.fotos || [],
          total_fotos: (resultado.fotos || []).length,
          informacoes: resultado.informacoes || {},
          categoria_sugerida: resultado.informacoes?.Editora?.toLowerCase().includes('assouline') ? 'Livros de Luxo' : 'Livros',
          dropshipping: {
            adequado_dropshipping: true,
            margem_sugerida: resultado.preco ? 
              calcularMargemSugerida(resultado.preco) : '15-25%',
            publico_alvo: resultado.informacoes?.Editora?.toLowerCase().includes('assouline') ? 'Colecionadores de livros de luxo' : 'Geral',
            nivel_concorrencia: 'medio',
            potencial_vendas: 'bom',
            preco_base: resultado.preco
          }
        },
        timestamp: new Date().toISOString()
      });
      
    } finally {
      // Sempre fechar browser
      await searcherPersistente.close();
    }

  } catch (error) {
    console.error('❌ Erro na busca com autenticação UI:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Busca em lote
app.post('/buscar-produtos-batch', async (req, res) => {
  try {
    const { ids, usar_autenticacao } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Array de IDs é obrigatório',
        exemplo: { ids: ['177775811', '123456789'], usar_autenticacao: true }
      });
    }

    if (ids.length > 10) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Máximo 10 produtos por vez'
      });
    }

    const useAuth = usar_autenticacao && searcherPersistente;
    const searcher = useAuth ? searcherPersistente : searcherBasico;
    const metodo = useAuth ? 'buscarProdutoComPreco' : 'buscarProdutoReal';
    
    console.log(`🔍 Busca em lote: ${ids.length} produtos (${useAuth ? 'sessão persistente' : 'básico'})`);
    
    const resultados = [];
    
    for (const id of ids) {
      try {
        const resultado = await searcher[metodo](id);
        resultados.push({
          id,
          encontrado: useAuth ? resultado.encontrado : !!resultado,
          produto: useAuth ? resultado : resultado,
          preco: useAuth && resultado.preco_autenticado ? resultado.preco_autenticado : null
        });
        
        // Delay entre requisições
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        resultados.push({
          id,
          encontrado: false,
          erro: error.message
        });
      }
    }

    res.json({
      sucesso: true,
      total_processados: resultados.length,
      autenticado: useAuth,
      sessao_persistente: useAuth,
      resultados,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro na busca em lote:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Limpar sessão salva
app.post('/limpar-sessao', async (req, res) => {
  try {
    if (!searcherPersistente) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Sessão persistente não disponível'
      });
    }

    await searcherPersistente.clearSession();
    
    res.json({
      sucesso: true,
      mensagem: 'Sessão limpa com sucesso',
      detalhes: 'Próxima busca fará novo login',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      sucesso: false,
      erro: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Busca APENAS preço (otimizada e rápida)
app.post('/buscar-apenas-preco', async (req, res) => {
  if (!searcherPersistente) {
    return res.status(503).json({
      sucesso: false,
      erro: 'Serviço de autenticação não disponível',
      detalhes: 'Configure QUEENBOOKS_USERNAME e QUEENBOOKS_PASSWORD'
    });
  }

  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({
        sucesso: false,
        erro: 'ID do produto é obrigatório',
        exemplo: { id: '177775811' }
      });
    }

    console.log(`💰 Busca APENAS preço para produto: ${id}`);
    
    try {
      // Usar o método buscarProdutoComPreco existente que já funciona
      await searcherPersistente.init();
      const resultado = await searcherPersistente.buscarProdutoComPreco(id);
      
      res.json({
        sucesso: true,
        encontrado: resultado.encontrado || false,
        autenticado: true,
        produto: {
          id: resultado.idSite || id,
          preco: resultado.preco,
          preco_autenticado: resultado.preco_autenticado || resultado.preco
        },
        timestamp: new Date().toISOString()
      });
      
    } finally {
      await searcherPersistente.close();
    }

  } catch (error) {
    console.error('❌ Erro na busca de preço:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para extrair imagens do carrossel
app.post('/extrair-imagens', async (req, res) => {
  console.log('\n🎠 Requisição de extração de imagens recebida');
  const startTime = Date.now();
  
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({
        sucesso: false,
        erro: 'ID do produto é obrigatório',
        exemplo: { id: '177776045' }
      });
    }
    
    console.log(`🔍 Extraindo imagens para produto: ${id}`);
    
    // Criar uma instância separada para extração de imagens
    const imagensSearcher = new QueenBooksBotaoLoginSearcher({
      headless: true,
      debug: false
    });
    
    const resultado = await imagensSearcher.extrairImagensCarrossel(id);
    
    const endTime = Date.now();
    const tempoExecucao = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Extração concluída em ${tempoExecucao}s - ${resultado.total_imagens || 0} imagens`);
    
    // Adicionar tempo de execução ao resultado
    resultado.tempo_execucao = `${tempoExecucao}s`;
    
    res.json(resultado);
    
  } catch (error) {
    const endTime = Date.now();
    const tempoExecucao = ((endTime - startTime) / 1000).toFixed(2);
    
    console.error('❌ Erro na extração de imagens:', error);
    
    res.status(500).json({
      sucesso: false,
      erro: error.message,
      produto_id: req.body.id,
      tempo_execucao: `${tempoExecucao}s`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para verificar estoque
app.post('/verificar-estoque', async (req, res) => {
  console.log('\n📦 Requisição de verificação de estoque recebida');
  const startTime = Date.now();
  
  try {
    const { id, ids } = req.body;
    
    if (!id && !ids) {
      return res.status(400).json({
        sucesso: false,
        erro: 'ID do produto ou array de IDs é obrigatório',
        exemplo: { id: '177776741' },
        exemplo_multiplo: { ids: ['177776741', '177776553', '207737053'] }
      });
    }

    // Criar instância do verificador
    const checker = new QueenBooksStockChecker({
      username: process.env.QUEENBOOKS_USERNAME || process.env.QUEENBOOKS_EMAIL || 'willamscss@outlook.com',
      password: process.env.QUEENBOOKS_PASSWORD || '618536'
    });

    await checker.init();

    let resultado;
    
    if (id) {
      // Verificação única
      console.log(`🔍 Verificando estoque do produto: ${id}`);
      resultado = await checker.verificarEstoque(id);
      
      const endTime = Date.now();
      const tempoExecucao = ((endTime - startTime) / 1000).toFixed(2);
      
      await checker.close();
      
      res.json({
        sucesso: true,
        tempo_execucao: `${tempoExecucao}s`,
        produto: resultado
      });
    } else {
      // Verificação múltipla
      console.log(`🔍 Verificando estoque de ${ids.length} produtos`);
      const resultados = await checker.verificarMultiplosEstoques(ids);
      
      const endTime = Date.now();
      const tempoExecucao = ((endTime - startTime) / 1000).toFixed(2);
      
      await checker.close();
      
      res.json({
        sucesso: true,
        tempo_execucao: `${tempoExecucao}s`,
        total_verificados: resultados.length,
        produtos: resultados
      });
    }
    
  } catch (error) {
    const endTime = Date.now();
    const tempoExecucao = ((endTime - startTime) / 1000).toFixed(2);
    
    console.error('❌ Erro na verificação de estoque:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message,
      tempo_execucao: `${tempoExecucao}s`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint GET para teste rápido de estoque
app.get('/estoque/:id', async (req, res) => {
  const produtoId = req.params.id;
  console.log(`📦 Verificação rápida de estoque: ${produtoId}`);
  
  try {
    const checker = new QueenBooksStockChecker({
      username: process.env.QUEENBOOKS_USERNAME || process.env.QUEENBOOKS_EMAIL || 'willamscss@outlook.com',
      password: process.env.QUEENBOOKS_PASSWORD || '618536'
    });
    await checker.init();
    
    const resultado = await checker.verificarEstoque(produtoId);
    await checker.close();
    
    res.json({
      sucesso: true,
      produto: resultado
    });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * Calcular margem sugerida baseada no preço
 */
function calcularMargemSugerida(preco) {
  if (preco < 50) return '25-40%';
  if (preco < 100) return '20-35%';
  if (preco < 200) return '15-30%';
  return '10-25%';
}

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log('🚀 SERVIDOR QUEENBOOKS COM SESSÃO PERSISTENTE');
  console.log('========================================');
  console.log(`📡 Porta: ${port}`);
  console.log(`🔗 URL Base: http://localhost:${port}`);
  console.log('');
  console.log('📋 ENDPOINTS DISPONÍVEIS:');
  console.log('   GET  /health');
  console.log('   GET  /status');
  console.log('   POST /buscar-produto (básico)');
  if (searcherPersistente) {
    console.log('   POST /buscar-produto-com-preco 🔐 (RECOMENDADO)');
    console.log('   POST /verificar-estoque 📦 (NOVO)');
    console.log('   GET  /estoque/:id 📦 (RÁPIDO)');
    console.log('   POST /limpar-sessao');
  }
  console.log('   POST /buscar-produtos-batch');
  console.log('');
  console.log('💡 PARA N8N:');
  console.log(`   URL: http://192.168.15.6:${port}/buscar-produto`);
  if (searcherPersistente) {
    console.log(`   URL (com preços): http://192.168.15.6:${port}/buscar-produto-com-preco`);
    console.log('   🎯 RECOMENDADO: Use o endpoint com preços!');
  }
  console.log(`   Body: { "id": "177775811" }`);
  console.log('');
  
  if (searcherPersistente) {
    console.log('🔐 SESSÃO PERSISTENTE ATIVA:');
    console.log('   ✅ Login será feito apenas uma vez');
    console.log('   ✅ Sessão salva por 24 horas');
    console.log('   ✅ Preços disponíveis em todas as buscas');
    console.log('   ✅ Performance otimizada');
  } else {
    console.log('⚠️  Modo básico - configure credenciais para preços');
  }
  
  console.log('');
  console.log('✅ Servidor pronto!');
});
