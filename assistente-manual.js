#!/usr/bin/env node

/**
 * ASSISTENTE MANUAL QUEENBOOKS DROPSHIPPING
 * 
 * Sistema para processar templates de produtos e integrar ao dropshipping
 */

const fs = require('fs-extra');
const path = require('path');

class QueenBooksDropshippingAssistant {
  constructor() {
    this.dataDir = './data/assistente-manual';
    this.productsFile = './data/products/manual_products.json';
  }

  async init() {
    await fs.ensureDir(this.dataDir);
    await fs.ensureDir('./data/products');
  }

  async processarTemplates() {
    console.log('🔄 PROCESSANDO TEMPLATES AUTOMÁTICOS');
    console.log('=' .repeat(50));
    
    try {
      const arquivos = await fs.readdir(this.dataDir);
      const templatesAuto = arquivos.filter(arquivo => 
        arquivo.startsWith('template_auto_') && arquivo.endsWith('.json')
      );

      if (templatesAuto.length === 0) {
        console.log('📄 Nenhum template automático encontrado');
        console.log('💡 Execute busca-real.js primeiro para gerar templates');
        return;
      }

      console.log(`📦 ${templatesAuto.length} templates encontrados para processar`);
      console.log('');

      let processados = 0;
      for (const arquivo of templatesAuto) {
        const caminhoArquivo = path.join(this.dataDir, arquivo);
        
        try {
          const template = await fs.readJSON(caminhoArquivo);
          
          console.log(`📋 Processando: ${template.titulo || template.codigo}`);
          
          // Validar template
          if (!template.titulo || !template.codigo) {
            console.log(`⚠️  Template incompleto: ${arquivo}`);
            continue;
          }

          // Processar para dropshipping
          const produtoDropshipping = this.formatarParaDropshipping(template);
          
          // Adicionar ao sistema
          await this.adicionarProduto(produtoDropshipping);
          
          // Marcar como processado
          await this.marcarComoProcessado(caminhoArquivo, template);
          
          processados++;
          console.log(`✅ Processado com sucesso!`);
          console.log('');
          
        } catch (error) {
          console.error(`❌ Erro ao processar ${arquivo}:`, error.message);
        }
      }

      console.log(`🎉 PROCESSAMENTO CONCLUÍDO!`);
      console.log(`📊 ${processados} produtos adicionados ao sistema de dropshipping`);
      
    } catch (error) {
      console.error('❌ Erro no processamento:', error.message);
    }
  }

  formatarParaDropshipping(template) {
    return {
      code: template.codigo,
      title: template.titulo,
      category: template.categoria || 'Livros Importados',
      price: template.preco,
      status: template.status || 'available',
      description: template.descricao,
      photos: template.fotos || [],
      notes: template.notas || 'Produto extraído automaticamente',
      productInfo: template.informacoes || {},
      dropshippingAnalysis: template.dropshipping || {},
      extractedAt: new Date().toISOString(),
      source: 'queenbooks_auto_extraction'
    };
  }

  async adicionarProduto(produto) {
    try {
      // Carregar produtos existentes
      let produtos = {};
      if (await fs.pathExists(this.productsFile)) {
        produtos = await fs.readJSON(this.productsFile);
      }

      // Adicionar novo produto
      produtos[produto.code] = produto;

      // Salvar produtos atualizados
      await fs.writeJSON(this.productsFile, produtos, { spaces: 2 });
      
      console.log(`   💾 Adicionado ao sistema: ${produto.title}`);
      
    } catch (error) {
      console.error('❌ Erro ao adicionar produto:', error.message);
      throw error;
    }
  }

  async marcarComoProcessado(caminhoOriginal, template) {
    const nomeProcessado = path.basename(caminhoOriginal).replace('template_auto_', 'processado_auto_');
    const caminhoProcessado = path.join(this.dataDir, nomeProcessado);
    
    const templateProcessado = {
      ...template,
      processado: true,
      processadoEm: new Date().toISOString(),
      adicionadoAoSistema: true
    };
    
    await fs.writeJSON(caminhoProcessado, templateProcessado, { spaces: 2 });
    
    // Opcional: remover template original para evitar reprocessamento
    // await fs.remove(caminhoOriginal);
  }

  async gerarRelatorio() {
    console.log('📊 RELATÓRIO DROPSHIPPING QUEENBOOKS');
    console.log('=' .repeat(50));
    
    try {
      // Verificar produtos no sistema
      if (!await fs.pathExists(this.productsFile)) {
        console.log('📄 Nenhum produto encontrado no sistema');
        return;
      }

      const produtos = await fs.readJSON(this.productsFile);
      const produtosList = Object.values(produtos);
      
      console.log(`📦 Total de produtos: ${produtosList.length}`);
      console.log('');

      // Estatísticas por categoria
      const categorias = {};
      produtosList.forEach(produto => {
        const cat = produto.category || 'Sem categoria';
        categorias[cat] = (categorias[cat] || 0) + 1;
      });

      console.log('📂 POR CATEGORIA:');
      Object.entries(categorias).forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count} produtos`);
      });
      console.log('');

      // Estatísticas por status
      const status = {};
      produtosList.forEach(produto => {
        const st = produto.status || 'unknown';
        status[st] = (status[st] || 0) + 1;
      });

      console.log('📊 POR STATUS:');
      Object.entries(status).forEach(([st, count]) => {
        const emoji = st === 'available' ? '✅' : st === 'unavailable' ? '❌' : '❓';
        console.log(`   ${emoji} ${st}: ${count} produtos`);
      });
      console.log('');

      // Produtos recentes
      const recentes = produtosList
        .filter(p => p.extractedAt)
        .sort((a, b) => new Date(b.extractedAt) - new Date(a.extractedAt))
        .slice(0, 5);

      if (recentes.length > 0) {
        console.log('🕒 ÚLTIMOS PRODUTOS ADICIONADOS:');
        recentes.forEach((produto, index) => {
          const data = new Date(produto.extractedAt).toLocaleDateString('pt-BR');
          console.log(`   ${index + 1}. ${produto.title} (${data})`);
        });
      }

    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error.message);
    }
  }

  async listarProdutos() {
    try {
      if (!await fs.pathExists(this.productsFile)) {
        console.log('📄 Nenhum produto encontrado no sistema');
        return;
      }

      const produtos = await fs.readJSON(this.productsFile);
      const produtosList = Object.values(produtos);
      
      console.log('📋 PRODUTOS NO SISTEMA:');
      console.log('=' .repeat(40));
      
      produtosList.forEach((produto, index) => {
        const status = produto.status === 'available' ? '✅' : 
                      produto.status === 'unavailable' ? '❌' : '❓';
        console.log(`${index + 1}. ${status} ${produto.title}`);
        console.log(`   📋 Código: ${produto.code}`);
        console.log(`   📂 Categoria: ${produto.category}`);
        console.log(`   💰 Preço: ${produto.price || 'Não informado'}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ Erro ao listar produtos:', error.message);
    }
  }
}

async function main() {
  const comando = process.argv[2];

  const assistant = new QueenBooksDropshippingAssistant();
  await assistant.init();

  switch (comando) {
    case 'processar':
      await assistant.processarTemplates();
      break;

    case 'relatorio':
      await assistant.gerarRelatorio();
      break;

    case 'listar':
      await assistant.listarProdutos();
      break;

    default:
      console.log('🎯 ASSISTENTE QUEENBOOKS DROPSHIPPING');
      console.log('=' .repeat(40));
      console.log('');
      console.log('COMANDOS DISPONÍVEIS:');
      console.log('');
      console.log('📦 PROCESSAR TEMPLATES:');
      console.log('   node assistente-manual.js processar');
      console.log('   (Processa templates gerados automaticamente)');
      console.log('');
      console.log('📊 GERAR RELATÓRIO:');
      console.log('   node assistente-manual.js relatorio');
      console.log('');
      console.log('📋 LISTAR PRODUTOS:');
      console.log('   node assistente-manual.js listar');
      console.log('');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { QueenBooksDropshippingAssistant };
