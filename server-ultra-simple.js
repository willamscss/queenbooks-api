#!/usr/bin/env node

/**
 * SERVIDOR QUEENBOOKS ULTRA SIMPLES - SEM PUPPETEER
 */

const express = require('express');
const { QueenBooksRealSearcher } = require('./busca-real.js');
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

// Inicializar apenas searcher básico
const searcherBasico = new QueenBooksRealSearcher();
searcherBasico.init();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'queenbooks-api-ultra-simple',
    version: '1.0.0',
    features: {
      busca_basica: true,
      puppeteer: false
    }
  });
});

// Status
app.get('/status', (req, res) => {
  res.json({
    service: 'QueenBooks API Ultra Simple',
    version: '1.0.0',
    puppeteer_free: true,
    endpoints: {
      'GET /health': 'Health check',
      'GET /status': 'Esta documentação',
      'GET /teste': 'Teste simples',
      'POST /buscar-produto': 'Busca básica (sem preços)'
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
    message: 'Servidor está respondendo normalmente',
    railway_test: true
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    message: 'QueenBooks API Ultra Simple - Railway Test',
    status: 'online',
    endpoints: ['/health', '/status', '/teste', '/buscar-produto']
  });
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log('🚀 SERVIDOR QUEENBOOKS ULTRA SIMPLES');
  console.log('====================================');
  console.log(`📡 Porta: ${port}`);
  console.log(`🔗 URL Base: http://localhost:${port}`);
  console.log('');
  console.log('📋 ENDPOINTS:');
  console.log('   GET  / (root)');
  console.log('   GET  /health');
  console.log('   GET  /status');
  console.log('   GET  /teste');
  console.log('   POST /buscar-produto');
  console.log('');
  console.log('✅ Servidor pronto! (SEM PUPPETEER)');
});
