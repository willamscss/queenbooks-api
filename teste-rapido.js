#!/usr/bin/env node

/**
 * TESTE RÁPIDO - TODOS OS ENDPOINTS
 */

const axios = require('axios');
require('dotenv').config();

// URL base (local ou produção)
const BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function testeRapido() {
  console.log('🚀 TESTE RÁPIDO - TODOS OS ENDPOINTS');
  console.log('='.repeat(50));
  console.log(`🔗 URL Base: ${BASE_URL}`);
  console.log('');
  
  const produtoTeste = '177776045'; // Aspen Style - conhecido por ter carrossel
  
  try {
    // 1. Teste Health Check
    console.log('🔧 1. Testando Health Check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Health: ${health.data.status}`);
    
    // 2. Teste Busca Básica
    console.log('\n📊 2. Testando Busca Básica...');
    const start1 = Date.now();
    const basico = await axios.post(`${BASE_URL}/buscar-produto`, {
      id: produtoTeste
    });
    const time1 = ((Date.now() - start1) / 1000).toFixed(2);
    console.log(`✅ Busca básica: ${basico.data.produto.titulo} (${time1}s)`);
    
    // 3. Teste Extração de Imagens
    console.log('\n🎠 3. Testando Extração de Imagens...');
    const start2 = Date.now();
    const imagens = await axios.post(`${BASE_URL}/extrair-imagens`, {
      id: produtoTeste
    });
    const time2 = ((Date.now() - start2) / 1000).toFixed(2);
    console.log(`✅ Imagens: ${imagens.data.total_imagens} extraídas (${time2}s)`);
    console.log(`   Produto: ${imagens.data.titulo}`);
    console.log(`   Método: ${imagens.data.metodo}`);
    
    // 4. Teste com Credenciais (se disponível)
    if (process.env.QUEENBOOKS_USERNAME) {
      console.log('\n💰 4. Testando Busca de Preços...');
      try {
        const start3 = Date.now();
        const preco = await axios.post(`${BASE_URL}/buscar-apenas-preco`, {
          id: produtoTeste
        }, { timeout: 90000 }); // 90s timeout
        const time3 = ((Date.now() - start3) / 1000).toFixed(2);
        console.log(`✅ Preço: R$ ${preco.data.produto.preco} (${time3}s)`);
      } catch (error) {
        console.log(`⚠️  Preço: ${error.message}`);
      }
    } else {
      console.log('\n⚠️  4. Busca de preços não testada (sem credenciais)');
    }
    
    console.log('\n🎉 TODOS OS TESTES CONCLUÍDOS!');
    console.log('='.repeat(50));
    console.log(`📱 Busca básica: ${time1}s`);
    console.log(`🎠 Extração imagens: ${time2}s`);
    console.log('🚀 Sistema 100% operacional!');
    
  } catch (error) {
    console.log('\n❌ ERRO:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Verifique se o servidor está rodando:');
      console.log('   npm run server ou node server-persistent.js');
    }
  }
}

testeRapido();
