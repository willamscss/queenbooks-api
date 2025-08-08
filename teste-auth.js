#!/usr/bin/env node

/**
 * TESTE DE AUTENTICAÇÃO QUEENBOOKS
 * Script para testar login e busca com preços
 */

const QueenBooksAuthSearcher = require('./QueenBooksAuthSearcher.js');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function promptCredentials() {
  return new Promise((resolve) => {
    rl.question('👤 Digite seu usuário/email do QueenBooks: ', (username) => {
      rl.question('🔐 Digite sua senha: ', (password) => {
        rl.close();
        resolve({ username, password });
      });
    });
  });
}

async function testarAutenticacao() {
  console.log('🔐 TESTE DE AUTENTICAÇÃO QUEENBOOKS');
  console.log('=' .repeat(50));
  console.log('');

  try {
    // Solicitar credenciais
    const credentials = await promptCredentials();
    
    // Criar instância do searcher
    const searcher = new QueenBooksAuthSearcher(credentials);
    await searcher.init();
    
    console.log('');
    console.log('🚀 Testando login...');
    
    // Tentar fazer login
    await searcher.login();
    
    console.log('✅ Login realizado com sucesso!');
    console.log('');
    
    // Testar busca de produto com preço
    console.log('🔍 Testando busca de produto com preços...');
    const produtoTeste = '177775811'; // ID do produto de teste
    
    const resultado = await searcher.buscarProdutoComPreco(produtoTeste);
    
    console.log('');
    console.log('📊 RESULTADO:');
    console.log('=' .repeat(50));
    
    if (resultado.encontrado) {
      console.log(`✅ Produto encontrado: ${resultado.titulo}`);
      
      if (resultado.preco_autenticado) {
        console.log(`💰 Preço: R$ ${resultado.preco_autenticado.toFixed(2)}`);
        console.log('🎉 SUCESSO! Preços estão sendo extraídos corretamente!');
      } else {
        console.log('⚠️  Produto encontrado mas preço não foi extraído');
        console.log('💡 Isso pode indicar que o padrão de extração precisa ser ajustado');
      }
      
      console.log('');
      console.log('📋 Informações extraídas:');
      console.log(`   - ID: ${resultado.id}`);
      console.log(`   - Título: ${resultado.titulo}`);
      console.log(`   - URL: ${resultado.urlProduto}`);
      
      if (resultado.informacoes && Object.keys(resultado.informacoes).length > 0) {
        console.log('   - Informações adicionais:');
        Object.entries(resultado.informacoes).forEach(([key, value]) => {
          console.log(`     * ${key}: ${value}`);
        });
      }
      
    } else {
      console.log('❌ Produto não encontrado');
      if (resultado.erro) {
        console.log(`   Erro: ${resultado.erro}`);
      }
    }
    
  } catch (error) {
    console.log('');
    console.log('❌ ERRO NO TESTE:');
    console.log('=' .repeat(50));
    console.log(error.message);
    console.log('');
    console.log('💡 Possíveis soluções:');
    console.log('   1. Verifique se as credenciais estão corretas');
    console.log('   2. Verifique se você consegue fazer login manualmente no site');
    console.log('   3. O site pode ter proteção anti-bot (CAPTCHA, etc.)');
    console.log('   4. Os padrões de extração podem precisar ser ajustados');
  }
  
  console.log('');
  console.log('🏁 Teste finalizado!');
}

// Executar teste
testarAutenticacao();
