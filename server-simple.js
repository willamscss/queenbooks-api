#!/usr/bin/env node

/**
 * SERVIDOR N8N SIMPLES - QUEENBOOKS
 * Servidor básico para teste com n8n
 */

const express = require('express');
const { QueenBooksRealSearcher } = require('./busca-real.js');

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

// Inicializar searcher
const searcher = new QueenBooksRealSearcher();
searcher.init();

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'queenbooks-n8n-simple',
    version: '1.0.0'
  });
});

app.get('/status', (req, res) => {
  res.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    service: 'QueenBooks Simple API for n8n',
    endpoints: {
      health: 'GET /health',
      status: 'GET /status',
      buscarProduto: 'POST /buscar-produto',
      buscarProdutoComPreco: 'POST /buscar-produto-com-preco 🔐'
    },
    usage: {
      buscarProduto: 'Envie { "id": "177775811" } para buscar produto por ID (sem preços)',
      buscarProdutoComPreco: 'Envie { "id": "177775811" } para buscar produto com preços reais'
    }
  });
});

app.post('/buscar-produto', async (req, res) => {
  try {
    console.log('📋 Nova solicitação de busca recebida');
    
    const { id, codigo } = req.body;
    
    if (!id && !codigo) {
      return res.status(400).json({
        erro: true,
        mensagem: 'ID ou código do produto é obrigatório',
        exemplo: { id: "177775811" },
        timestamp: new Date().toISOString()
      });
    }

    const idProduto = id || codigo;
    
    console.log(`🎯 Iniciando busca para ID: ${idProduto}`);
    
    // Buscar produto
    const produto = await searcher.buscarPorIdSite(idProduto);
    
    // Formatear resposta simples para n8n
    const resposta = {
      sucesso: true,
      encontrado: produto.titulo && produto.titulo.length > 0,
      produto: {
        id: produto.idSite,
        codigo_isbn: produto.codigoIsbn,
        titulo: produto.titulo,
        descricao: produto.descricao,
        preco: produto.preco,
        status: produto.status,
        url_produto: produto.urlProduto,
        fotos: produto.fotos || [],
        total_fotos: (produto.fotos || []).length,
        informacoes: produto.informacoes || {},
        categoria_sugerida: produto.informacoes?.Editora?.toLowerCase().includes('assouline') ? 'Livros de Luxo' : 'Livros Importados',
        dropshipping: {
          adequado_dropshipping: true,
          margem_sugerida: produto.informacoes?.Editora?.toLowerCase().includes('assouline') ? '20-35%' : '15-25%',
          publico_alvo: produto.informacoes?.Editora?.toLowerCase().includes('assouline') ? 'Colecionadores de livros de luxo' : 'Leitores interessados em livros importados',
          nivel_concorrencia: 'medio',
          potencial_vendas: 'bom'
        }
      },
      timestamp: new Date().toISOString()
    };
    
    if (produto.erro) {
      resposta.sucesso = false;
      resposta.erro = produto.erro;
    }
    
    if (!produto.titulo || produto.titulo.length === 0) {
      resposta.encontrado = false;
      resposta.mensagem = 'Produto não encontrado ou sem dados válidos';
    }
    
    console.log('✅ Busca concluída, enviando resposta');
    res.json(resposta);
    
  } catch (error) {
    console.error('❌ Erro na busca:', error.message);
    
    res.status(500).json({
      erro: true,
      mensagem: 'Erro interno do servidor',
      detalhes: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint com autenticação para buscar produtos com preços
app.post('/buscar-produto-com-preco', async (req, res) => {
  try {
    console.log('🔐 Nova solicitação de busca COM PREÇOS recebida');
    
    const { id, codigo } = req.body;
    
    if (!id && !codigo) {
      return res.status(400).json({
        erro: true,
        mensagem: 'ID ou código do produto é obrigatório',
        exemplo: { id: "177775811" },
        timestamp: new Date().toISOString()
      });
    }

    const idProduto = id || codigo;
    
    console.log(`🎯 Iniciando busca COM PREÇOS para ID: ${idProduto}`);
    
    // Inicializar sistema de autenticação
    const QueenBooksBotaoLoginSearcher = require('./QueenBooksBotaoLoginSearcher');
    const searcher = new QueenBooksBotaoLoginSearcher({
      headless: true,  // Sempre headless em produção
      debug: false
    });
    
    let produto;
    try {
      await searcher.init();
      produto = await searcher.buscarProdutoComPreco(idProduto);
    } finally {
      await searcher.close();
    }
    
    // Formatear resposta completa para n8n
    const resposta = {
      sucesso: true,
      encontrado: produto.titulo && produto.titulo.length > 0,
      autenticado: true,
      sessao_persistente: true,
      produto: {
        id: produto.idSite || idProduto,
        codigo_isbn: produto.codigoIsbn,
        titulo: produto.titulo,
        descricao: produto.descricao || "",
        preco: produto.preco,
        preco_autenticado: produto.preco_autenticado,
        status: produto.status || "unknown",
        url_produto: produto.urlProduto,
        fotos: produto.fotos || [],
        total_fotos: (produto.fotos || []).length,
        informacoes: produto.informacoes || {},
        categoria_sugerida: produto.informacoes?.Editora?.toLowerCase().includes('assouline') ? 'Livros de Luxo' : 'Livros Importados',
        dropshipping: {
          adequado_dropshipping: true,
          margem_sugerida: produto.informacoes?.Editora?.toLowerCase().includes('assouline') ? '20-35%' : '15-25%',
          publico_alvo: produto.informacoes?.Editora?.toLowerCase().includes('assouline') ? 'Colecionadores de livros de luxo' : 'Leitores interessados em livros importados',
          nivel_concorrencia: 'medio',
          potencial_vendas: 'bom',
          preco_base: produto.preco
        }
      },
      timestamp: new Date().toISOString()
    };
    
    if (produto.erro) {
      resposta.sucesso = false;
      resposta.erro = produto.erro;
    }
    
    if (!produto.titulo || produto.titulo.length === 0) {
      resposta.encontrado = false;
      resposta.mensagem = 'Produto não encontrado ou sem dados válidos';
    }
    
    console.log('✅ Busca COM PREÇOS concluída, enviando resposta');
    res.json(resposta);
    
  } catch (error) {
    console.error('❌ Erro na busca com preços:', error.message);
    
    res.status(500).json({
      erro: true,
      mensagem: 'Erro interno do servidor na busca com preços',
      detalhes: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Fallback
app.use('*', (req, res) => {
  res.status(404).json({
    erro: true,
    mensagem: 'Endpoint não encontrado',
    endpoints_disponiveis: [
      'GET /health',
      'GET /status',
      'POST /buscar-produto',
      'POST /buscar-produto-com-preco'
    ],
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
const server = app.listen(port, '0.0.0.0', () => {
  console.log('🚀 SERVIDOR N8N SIMPLES INICIADO');
  console.log('=' .repeat(40));
  console.log(`📡 Porta: ${port}`);
  console.log(`🔗 URL Base: http://localhost:${port}`);
  console.log('');
  console.log('📋 ENDPOINTS DISPONÍVEIS:');
  console.log(`   GET  /health`);
  console.log(`   GET  /status`);
  console.log(`   POST /buscar-produto`);
  console.log('');
  console.log('💡 PARA N8N:');
  console.log(`   URL: http://192.168.15.6:${port}/buscar-produto`);
  console.log(`   Body: { "id": "177775811" }`);
  console.log('');
  console.log('✅ Servidor pronto!');
});

// Timeout longo
server.timeout = 120000; // 2 minutos
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Parando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Parando servidor...');
  process.exit(0);
});
