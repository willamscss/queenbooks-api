#!/usr/bin/env node

/**
 * SERVIDOR MÍNIMO ABSOLUTO - APENAS EXPRESS
 */

const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// Middleware básico
app.use(express.json());

// Root
app.get('/', (req, res) => {
  res.json({
    message: 'Servidor Express mínimo funcionando!',
    status: 'online',
    timestamp: new Date().toISOString(),
    port: port,
    env: process.env.NODE_ENV || 'development'
  });
});

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'express-minimal',
    version: '1.0.0'
  });
});

// Teste
app.get('/teste', (req, res) => {
  res.json({
    teste: 'funcionando',
    railway: true,
    minimal: true
  });
});

// Start
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Express mínimo rodando na porta ${port}`);
  console.log(`📡 Acesse: http://localhost:${port}`);
});
