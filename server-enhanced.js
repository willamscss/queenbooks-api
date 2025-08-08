#!/usr/bin/env node

/**
 * SERVIDOR QUEENBOOKS COM AUTENTICAÇÃO
 * Versão melhorada com suporte a preços autenticados
 */

const express = require('express');
const { QueenBooksRealSearcher } = require('./busca-real.js');
const QueenBooksAuthSearcher = require('./QueenBooksAuthSearcher.js');
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

let searcherAuth = null;
const temCredenciais = process.env.QUEENBOOKS_USERNAME && process.env.QUEENBOOKS_PASSWORD;

if (temCredenciais) {
  console.log('🔐 Credenciais encontradas - Modo autenticado habilitado');
  searcherAuth = new QueenBooksAuthSearcher({
    username: process.env.QUEENBOOKS_USERNAME,
    password: process.env.QUEENBOOKS_PASSWORD
  });
  searcherAuth.init();
} else {
  console.log('⚠️  Sem credenciais - Usando apenas modo básico');
}

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'queenbooks-api-enhanced',
    version: '2.0.0',
    features: {
      busca_basica: true,
      busca_autenticada: !!searcherAuth,
      precos_disponiveis: !!searcherAuth
    }
  });
});

app.get('/status', (req, res) => {
  res.json({
    service: 'QueenBooks API Enhanced',
    version: '2.0.0',
    features: {
      busca_basica: 'Busca produtos sem autenticação',
      busca_autenticada: searcherAuth ? 'Busca com preços (autenticado)' : 'Indisponível - sem credenciais',
      batch_processing: 'Busca múltiplos produtos'
    },
    endpoints: {
      'GET /health': 'Health check',
      'GET /status': 'Esta documentação',
      'POST /buscar-produto': 'Busca produto por ID',
      'POST /buscar-produto-com-preco': 'Busca produto com preço (requer autenticação)',
      'POST /buscar-produtos-batch': 'Busca múltiplos produtos'
    },
    exemplo_uso: {
      busca_basica: {
        url: '/buscar-produto',
        body: { id: '177775811' }
      },
      busca_com_preco: searcherAuth ? {
        url: '/buscar-produto-com-preco',
        body: { id: '177775811' }
      } : 'Indisponível - configure QUEENBOOKS_USERNAME e QUEENBOOKS_PASSWORD'
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
    const resultado = await searcherBasico.buscarProdutoReal(id);
    
    if (resultado) {
      res.json({
        sucesso: true,
        encontrado: true,
        produto: {
          id: resultado.id || id,
          codigo_isbn: resultado.informacoes?.ISBN || null,
          titulo: resultado.titulo,
          descricao: resultado.descricao,
          preco: resultado.preco,
          status: resultado.status,
          url_produto: resultado.urlProduto,
          fotos: resultado.fotos || [],
          total_fotos: resultado.fotos?.length || 0,
          informacoes: resultado.informacoes || {},
          categoria_sugerida: resultado.categoriaSugerida || 'Não categorizado',
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
        produto: null,
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

// Busca com preços (autenticada)
app.post('/buscar-produto-com-preco', async (req, res) => {
  try {
    if (!searcherAuth) {
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

    console.log(`🔐 Busca autenticada para produto: ${id}`);
    const resultado = await searcherAuth.buscarProdutoComPreco(id);
    
    if (resultado.encontrado) {
      res.json({
        sucesso: true,
        encontrado: true,
        autenticado: true,
        produto: {
          id: resultado.id || id,
          codigo_isbn: resultado.informacoes?.ISBN || null,
          titulo: resultado.titulo,
          descricao: resultado.descricao,
          preco: resultado.preco_autenticado,
          preco_autenticado: resultado.preco_autenticado,
          status: resultado.status,
          url_produto: resultado.urlProduto,
          fotos: resultado.fotos || [],
          total_fotos: resultado.fotos?.length || 0,
          informacoes: resultado.informacoes || {},
          categoria_sugerida: resultado.categoriaSugerida || 'Não categorizado',
          dropshipping: {
            adequado_dropshipping: true,
            margem_sugerida: resultado.preco_autenticado ? 
              calcularMargemSugerida(resultado.preco_autenticado) : '15-25%',
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
        autenticado: true,
        produto: null,
        erro: resultado.erro,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Erro na busca autenticada:', error);
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
        exemplo: { ids: ['177775811', '123456789'], usar_autenticacao: false }
      });
    }

    if (ids.length > 10) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Máximo 10 produtos por vez'
      });
    }

    const useAuth = usar_autenticacao && searcherAuth;
    const searcher = useAuth ? searcherAuth : searcherBasico;
    const metodo = useAuth ? 'buscarProdutoComPreco' : 'buscarProdutoReal';
    
    console.log(`🔍 Busca em lote: ${ids.length} produtos (${useAuth ? 'autenticado' : 'básico'})`);
    
    const resultados = [];
    
    for (const id of ids) {
      try {
        const resultado = await searcher[metodo](id);
        resultados.push({
          id,
          encontrado: useAuth ? resultado.encontrado : !!resultado,
          produto: useAuth ? resultado : resultado
        });
        
        // Delay entre requisições
        await new Promise(resolve => setTimeout(resolve, 1000));
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
  console.log('🚀 SERVIDOR N8N SIMPLES INICIADO');
  console.log('========================================');
  console.log(`📡 Porta: ${port}`);
  console.log(`🔗 URL Base: http://localhost:${port}`);
  console.log('');
  console.log('📋 ENDPOINTS DISPONÍVEIS:');
  console.log('   GET  /health');
  console.log('   GET  /status');
  console.log('   POST /buscar-produto');
  if (searcherAuth) {
    console.log('   POST /buscar-produto-com-preco 🔐');
  }
  console.log('   POST /buscar-produtos-batch');
  console.log('');
  console.log('💡 PARA N8N:');
  console.log(`   URL: http://192.168.15.6:${port}/buscar-produto`);
  if (searcherAuth) {
    console.log(`   URL (com preços): http://192.168.15.6:${port}/buscar-produto-com-preco`);
  }
  console.log(`   Body: { "id": "177775811" }`);
  console.log('');
  console.log('✅ Servidor pronto!');
  
  if (searcherAuth) {
    console.log('🔐 Modo autenticado habilitado - preços disponíveis!');
  } else {
    console.log('⚠️  Modo básico - configure credenciais para acessar preços');
  }
});
