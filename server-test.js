#!/usr/bin/env node

/**
 * TESTE SIMPLES DO SERVIDOR - SEM PUPPETEER
 */

const express = require('express');
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

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'queenbooks-api-test',
    version: '1.0.0'
  });
});

// Status
app.get('/status', (req, res) => {
  res.json({
    service: 'QueenBooks API - TESTE SIMPLES',
    version: '1.0.0',
    endpoints: {
      'GET /health': 'Health check',
      'GET /status': 'Esta documentação',
      'POST /teste-estoque': 'Teste simulado de estoque'
    }
  });
});

// Endpoint de teste de estoque (simulado)
app.post('/teste-estoque', async (req, res) => {
  const { id, ids } = req.body;
  
  console.log('📦 Requisição de teste de estoque:', { id, ids });
  
  try {
    if (id) {
      // Simular resposta para um produto
      res.json({
        sucesso: true,
        teste: true,
        produto: {
          produtoId: id,
          titulo: 'Produto de Teste',
          preco: 'R$ 99,90',
          estoque: 5,
          disponivel: true,
          timestamp: new Date().toISOString()
        }
      });
    } else if (ids) {
      // Simular resposta para múltiplos produtos
      const produtos = ids.map(productId => ({
        produtoId: productId,
        titulo: `Produto ${productId}`,
        preco: 'R$ 99,90',
        estoque: Math.floor(Math.random() * 20) + 1,
        disponivel: true,
        timestamp: new Date().toISOString()
      }));
      
      res.json({
        sucesso: true,
        teste: true,
        total_verificados: produtos.length,
        produtos
      });
    } else {
      res.status(400).json({
        sucesso: false,
        erro: 'ID do produto ou array de IDs é obrigatório',
        exemplo: { id: '177776741' }
      });
    }
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log('🧪 SERVIDOR DE TESTE QUEENBOOKS');
  console.log('================================');
  console.log(`📡 Porta: ${port}`);
  console.log(`🔗 URL: http://localhost:${port}`);
  console.log('');
  console.log('📋 ENDPOINTS DE TESTE:');
  console.log('   GET  /health');
  console.log('   GET  /status');
  console.log('   POST /teste-estoque');
  console.log('');
  console.log('✅ Servidor de teste pronto!');
});
