#!/usr/bin/env node

/**
 * SERVIDOR QUEENBOOKS SEM ESTOQUE - PARA TESTE NO RAILWAY
 */

const express = require('express');
const { QueenBooksRealSearcher } = require('./busca-real.js');
const QueenBooksBotaoLoginSearcher = require('./QueenBooksBotaoLoginSearcher.js');
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
  searcherPersistente = new QueenBooksBotaoLoginSearcher();
  searcherPersistente.init();
} else {
  console.log('⚠️  Credenciais não encontradas - modo básico');
}

// Health check
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

// Status
app.get('/status', (req, res) => {
  res.json({
    service: 'QueenBooks API with UI Authentication',
    version: '4.0.0',
    features: {
      busca_basica: 'Busca produtos sem autenticação',
      busca_com_precos: searcherPersistente ? 'Busca com preços usando sessão persistente' : 'Indisponível',
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
      busca_completa: searcherPersistente ? {
        url: '/buscar-produto-com-preco',
        body: { id: '177775811' },
        observacao: 'Dados completos COM preços - mais lento'
      } : 'Configure QUEENBOOKS_USERNAME e QUEENBOOKS_PASSWORD'
    }
  });
});

// Busca básica
app.post('/buscar-produto', async (req, res) => {
  try {
    const { id } = req.body;
    console.log(`🔍 Buscando produto: ${id}`);
    
    const resultado = await searcherBasico.buscarProduto(id);
    res.json(resultado);
  } catch (error) {
    console.error('Erro na busca básica:', error);
    res.status(500).json({ erro: error.message });
  }
});

// Teste simples
app.get('/teste', (req, res) => {
  res.json({
    status: 'funcionando',
    timestamp: new Date().toISOString(),
    message: 'Servidor está respondendo normalmente'
  });
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log('🚀 SERVIDOR QUEENBOOKS SIMPLIFICADO');
  console.log('=====================================');
  console.log(`📡 Porta: ${port}`);
  console.log(`🔗 URL Base: http://localhost:${port}`);
  console.log('');
  console.log('📋 ENDPOINTS DISPONÍVEIS:');
  console.log('   GET  /health');
  console.log('   GET  /status');
  console.log('   GET  /teste');
  console.log('   POST /buscar-produto');
  console.log('');
  console.log('✅ Servidor pronto!');
});
