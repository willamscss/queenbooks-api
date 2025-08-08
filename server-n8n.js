#!/usr/bin/env node

/**
 * SERVIDOR N8N INTEGRATION - QUEENBOOKS
 * 
 * API REST para integração com n8n:
 * - POST /buscar-produto - Busca produto por ID do site
 * - GET /status - Status do servidor
 * - GET /health - Health check
 */

const express = require('express');
const { QueenBooksRealSearcher } = require('./busca-real.js');
const fs = require('fs-extra');
const path = require('path');

class QueenBooksN8nServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.searcher = new QueenBooksRealSearcher();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Parse JSON bodies
    this.app.use(express.json({ limit: '10mb' }));
    
    // CORS para n8n - mais permissivo
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Logging middleware mais detalhado
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
      console.log(`🔄 ${timestamp} - ${req.method} ${req.path} from ${clientIP}`);
      if (req.body && Object.keys(req.body).length > 0) {
        console.log(`📦 Body: ${JSON.stringify(req.body, null, 2)}`);
      }
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'queenbooks-n8n-api',
        version: '1.0.0'
      });
    });

    // Status do servidor
    this.app.get('/status', (req, res) => {
      res.json({
        status: 'active',
        timestamp: new Date().toISOString(),
        service: 'QueenBooks API for n8n',
        endpoints: {
          health: 'GET /health',
          status: 'GET /status',
          buscarProduto: 'POST /buscar-produto'
        },
        usage: {
          buscarProduto: 'Envie { "id": "177775811" } para buscar produto por ID'
        }
      });
    });

    // Endpoint principal para busca de produtos
    this.app.post('/buscar-produto', async (req, res) => {
      try {
        console.log('📋 Nova solicitação de busca recebida');
        console.log('📦 Body:', JSON.stringify(req.body, null, 2));

        // Validar entrada
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
        const produto = await this.searcher.buscarPorIdSite(idProduto);
        
        // Formatear resposta para n8n
        const resposta = this.formatarRespostaN8n(produto);
        
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

    // Endpoint para busca por múltiplos IDs (batch)
    this.app.post('/buscar-produtos-batch', async (req, res) => {
      try {
        console.log('📋 Nova solicitação de busca em lote recebida');
        
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({
            erro: true,
            mensagem: 'Lista de IDs é obrigatória',
            exemplo: { ids: ["177775811", "123456789"] },
            timestamp: new Date().toISOString()
          });
        }

        if (ids.length > 10) {
          return res.status(400).json({
            erro: true,
            mensagem: 'Máximo de 10 produtos por lote',
            timestamp: new Date().toISOString()
          });
        }

        console.log(`🎯 Iniciando busca em lote para ${ids.length} produtos`);
        
        const resultados = [];
        
        for (const id of ids) {
          try {
            console.log(`🔍 Buscando produto ID: ${id}`);
            const produto = await this.searcher.buscarPorIdSite(id);
            const resposta = this.formatarRespostaN8n(produto);
            resultados.push(resposta);
            
            // Delay entre buscas para não sobrecarregar o servidor
            await this.delay(2000);
            
          } catch (error) {
            console.error(`❌ Erro ao buscar produto ${id}:`, error.message);
            resultados.push({
              erro: true,
              id: id,
              mensagem: error.message,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        console.log('✅ Busca em lote concluída');
        res.json({
          lote: true,
          total: ids.length,
          processados: resultados.length,
          resultados: resultados,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('❌ Erro na busca em lote:', error.message);
        
        res.status(500).json({
          erro: true,
          mensagem: 'Erro interno do servidor',
          detalhes: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Endpoint para listar produtos salvos
    this.app.get('/produtos-salvos', async (req, res) => {
      try {
        const dataDir = './data/produtos-reais';
        await fs.ensureDir(dataDir);
        
        const arquivos = await fs.readdir(dataDir);
        const produtosJson = arquivos.filter(arquivo => arquivo.endsWith('.json'));
        
        const produtos = [];
        
        for (const arquivo of produtosJson.slice(0, 20)) { // Limitar a 20 mais recentes
          try {
            const caminhoArquivo = path.join(dataDir, arquivo);
            const produto = await fs.readJSON(caminhoArquivo);
            produtos.push({
              arquivo: arquivo,
              titulo: produto.titulo,
              codigo: produto.codigoIsbn || produto.idSite,
              status: produto.status,
              encontradoEm: produto.encontradoEm
            });
          } catch (error) {
            // Ignorar arquivos corrompidos
          }
        }
        
        res.json({
          total: produtos.length,
          produtos: produtos,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        res.status(500).json({
          erro: true,
          mensagem: 'Erro ao listar produtos salvos',
          detalhes: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Fallback para rotas não encontradas
    this.app.use('*', (req, res) => {
      res.status(404).json({
        erro: true,
        mensagem: 'Endpoint não encontrado',
        endpoints_disponiveis: [
          'GET /health',
          'GET /status',
          'POST /buscar-produto',
          'POST /buscar-produtos-batch',
          'GET /produtos-salvos'
        ],
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Formatar resposta padronizada para n8n
   */
  formatarRespostaN8n(produto) {
    // Verificar se houve erro na busca
    if (produto.erro) {
      return {
        sucesso: false,
        erro: true,
        mensagem: produto.erro,
        id: produto.idSite || produto.codigo,
        timestamp: new Date().toISOString()
      };
    }

    // Verificar se produto foi encontrado
    if (!produto.titulo || produto.titulo.length === 0) {
      return {
        sucesso: false,
        encontrado: false,
        mensagem: 'Produto não encontrado ou sem dados válidos',
        id: produto.idSite || produto.codigo,
        url: produto.urlProduto,
        timestamp: new Date().toISOString()
      };
    }

    // Produto encontrado com sucesso
    return {
      sucesso: true,
      encontrado: true,
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
        categoria_sugerida: this.determinarCategoria(produto),
        dropshipping: this.analisarDropshippingN8n(produto)
      },
      metadados: {
        metodo_busca: produto.metodoBusca || 'busca_direta_id',
        encontrado_em: produto.encontradoEm,
        processado_em: new Date().toISOString()
      },
      integracao: {
        n8n_ready: true,
        formato: 'json_estruturado',
        versao_api: '1.0.0'
      }
    };
  }

  /**
   * Determinar categoria para n8n
   */
  determinarCategoria(produto) {
    if (!produto.informacoes || Object.keys(produto.informacoes).length === 0) {
      return 'Livros';
    }
    
    const editora = (produto.informacoes.Editora || '').toLowerCase();
    const titulo = (produto.titulo || '').toLowerCase();
    
    if (editora.includes('assouline')) return 'Livros de Luxo';
    if (titulo.includes('collection')) return 'Coleções';
    if (titulo.includes('fashion') || titulo.includes('style')) return 'Moda & Estilo';
    if (titulo.includes('art') || titulo.includes('arte')) return 'Arte';
    if (titulo.includes('design')) return 'Design';
    
    return 'Livros Importados';
  }

  /**
   * Análise de dropshipping específica para n8n
   */
  analisarDropshippingN8n(produto) {
    const editora = (produto.informacoes.Editora || '').toLowerCase();
    
    let analise = {
      adequado_dropshipping: true,
      margem_sugerida: '15-25%',
      publico_alvo: 'Leitores interessados em livros importados',
      nivel_concorrencia: 'medio',
      potencial_vendas: 'bom'
    };
    
    // Análise específica por editora
    if (editora.includes('assouline')) {
      analise.margem_sugerida = '20-35%';
      analise.publico_alvo = 'Colecionadores de livros de luxo';
      analise.nivel_concorrencia = 'baixo';
      analise.potencial_vendas = 'excelente';
    }
    
    return analise;
  }

  /**
   * Delay helper para busca em lote
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async start() {
    try {
      // Inicializar searcher
      await this.searcher.init();
      
      // Iniciar servidor em todas as interfaces (IPv4 e IPv6)
      const server = this.app.listen(this.port, '0.0.0.0', () => {
        console.log('🚀 SERVIDOR N8N QUEENBOOKS INICIADO');
        console.log('=' .repeat(50));
        console.log(`📡 Porta: ${this.port}`);
        console.log(`🔗 URL Base: http://localhost:${this.port}`);
        console.log('');
        console.log('📋 ENDPOINTS DISPONÍVEIS:');
        console.log(`   GET  /health - Health check`);
        console.log(`   GET  /status - Status do servidor`);
        console.log(`   POST /buscar-produto - Buscar produto por ID`);
        console.log(`   POST /buscar-produtos-batch - Buscar múltiplos produtos`);
        console.log(`   GET  /produtos-salvos - Listar produtos salvos`);
        console.log('');
        console.log('💡 EXEMPLO DE USO (n8n):');
        console.log(`   URL: http://localhost:${this.port}/buscar-produto`);
        console.log(`   Method: POST`);
        console.log(`   Body: { "id": "177775811" }`);
        console.log('');
        console.log('✅ Servidor pronto para receber solicitações do n8n!');
      });
      
      // Configurar timeout mais longo para o servidor
      server.timeout = 120000; // 2 minutos
      server.keepAliveTimeout = 65000; // 65 segundos
      server.headersTimeout = 66000; // 66 segundos
        console.log('🚀 SERVIDOR N8N QUEENBOOKS INICIADO');
        console.log('=' .repeat(50));
        console.log(`📡 Porta: ${this.port}`);
        console.log(`🔗 URL Base: http://localhost:${this.port}`);
        console.log('');
        console.log('📋 ENDPOINTS DISPONÍVEIS:');
        console.log(`   GET  /health - Health check`);
        console.log(`   GET  /status - Status do servidor`);
        console.log(`   POST /buscar-produto - Buscar produto por ID`);
        console.log(`   POST /buscar-produtos-batch - Buscar múltiplos produtos`);
        console.log(`   GET  /produtos-salvos - Listar produtos salvos`);
        console.log('');
        console.log('💡 EXEMPLO DE USO (n8n):');
        console.log(`   URL: http://localhost:${this.port}/buscar-produto`);
        console.log(`   Method: POST`);
        console.log(`   Body: { "id": "177775811" }`);
        console.log('');
        console.log('✅ Servidor pronto para receber solicitações do n8n!');
      });
      
      // Configurar timeout mais longo para o servidor
      server.timeout = 120000; // 2 minutos
      server.keepAliveTimeout = 65000; // 65 segundos
      server.headersTimeout = 66000; // 66 segundos
      
    } catch (error) {
      console.error('❌ Erro ao iniciar servidor:', error.message);
      process.exit(1);
    }
  }

  async stop() {
    console.log('⏹️  Parando servidor...');
    process.exit(0);
  }
}

// Inicialização automática se executado diretamente
if (require.main === module) {
  const server = new QueenBooksN8nServer();
  
  // Handlers para shutdown graceful
  process.on('SIGINT', () => server.stop());
  process.on('SIGTERM', () => server.stop());
  
  // Iniciar servidor
  server.start().catch(error => {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  });
}

module.exports = { QueenBooksN8nServer };
