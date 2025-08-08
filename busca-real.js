#!/usr/bin/env node

/**
 * BUSCADOR MELHORADO QUEENBOOKS
 * 
 * Sistema atualizado baseado na estrutura real do site:
 * 1. Busca: https://www.queenbooks.com.br/?busca=[CÓDIGO]
 * 2. Produto: https://www.queenbooks.com.br/produtos/[ID]
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class QueenBooksRealSearcher {
  constructor() {
    this.baseUrl = 'https://www.queenbooks.com.br';
    this.dataDir = './data/produtos-reais';
    this.timeout = 15000;
  }

  async init() {
    await fs.ensureDir(this.dataDir);
    await fs.ensureDir('./logs');
  }

  /**
   * Busca produto usando a estrutura real do site
   */
  async buscarProdutoReal(codigo) {
    console.log('🎯 BUSCA REAL QUEENBOOKS');
    console.log('=' .repeat(50));
    console.log(`📋 Código: ${codigo}`);
    console.log('');

    const produto = {
      codigo: codigo,
      titulo: '',
      descricao: '',
      informacoes: {},
      fotos: [],
      preco: null,
      status: 'unknown',
      urlBusca: `${this.baseUrl}/?busca=${codigo}`,
      urlProduto: '',
      encontradoEm: new Date().toISOString(),
      metodoBusca: 'estrutura_real'
    };

    try {
      // Passo 1: Buscar na página de busca real
      console.log('🔍 Passo 1: Buscando produto...');
      console.log(`📡 URL: ${produto.urlBusca}`);
      
      const resultadoBusca = await this.buscarNaPaginaReal(codigo);
      if (resultadoBusca) {
        produto.urlProduto = resultadoBusca.urlProduto;
        produto.idProduto = resultadoBusca.idProduto;
        
        console.log(`✅ Produto encontrado! ID: ${produto.idProduto}`);
        console.log(`🔗 URL: ${produto.urlProduto}`);

        // Passo 2: Extrair dados completos da página do produto
        console.log('\n🔍 Passo 2: Extraindo dados completos...');
        const dadosCompletos = await this.extrairDadosCompletos(produto.urlProduto);
        
        if (dadosCompletos) {
          Object.assign(produto, dadosCompletos);
          console.log('✅ Dados extraídos com sucesso!');
        }
      } else {
        console.log('❌ Produto não encontrado na busca');
      }

      // Salvar resultado
      await this.salvarProdutoReal(produto);
      await this.exibirResultado(produto);

      return produto;

    } catch (error) {
      console.error(`❌ Erro na busca: ${error.message}`);
      produto.erro = error.message;
      await this.salvarProdutoReal(produto);
      return produto;
    }
  }

  async buscarNaPaginaReal(codigo) {
    try {
      const urlBusca = `${this.baseUrl}/?busca=${codigo}`;
      
      const response = await axios.get(urlBusca, {
        timeout: this.timeout,
        headers: this.getHeaders(),
        maxRedirects: 5
      });

      if (response.status === 200) {
        return this.extrairLinkProduto(response.data, codigo);
      }
    } catch (error) {
      console.log(`⚠️  Erro na busca: ${error.message}`);
      return null;
    }
  }

  extrairLinkProduto(html, codigo) {
    try {
      console.log('🔍 Procurando produto específico com código:', codigo);
      
      // Primeiro, procurar pelo código específico na página
      const codigoRegex = new RegExp(`Cód\\.\\s*${codigo}`, 'gi');
      if (html.match(codigoRegex)) {
        console.log('✅ Código encontrado na página');
        
        // Procurar o contexto ao redor do código para encontrar o produto
        const contextRegex = new RegExp(
          `([\\s\\S]{0,2000})Cód\\.\\s*${codigo}[\\s\\S]{0,500}`, 
          'gi'
        );
        const contextMatch = html.match(contextRegex);
        
        if (contextMatch) {
          const context = contextMatch[0];
          
          // Procurar por título do produto no contexto
          const titleMatch = context.match(/title="([^"]+)"/i) || 
                           context.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</i);
          
          if (titleMatch) {
            const titulo = titleMatch[1] || titleMatch[2];
            console.log(`📚 Título encontrado: ${titulo}`);
          }
          
          // Extrair ID do produto do contexto (buscar padrões próximos ao código)
          const idPatterns = [
            /data-product-id="(\d+)"/gi,
            /product[^"]*(\d{8,})/gi,
            /\/produtos\/(\d+)/gi,
            /id[^"]*(\d{8,})/gi
          ];
          
          for (const pattern of idPatterns) {
            let match;
            pattern.lastIndex = 0;
            
            while ((match = pattern.exec(context)) !== null) {
              const potentialId = match[1];
              if (potentialId && potentialId.length >= 6) {
                const urlProduto = `${this.baseUrl}/produtos/${potentialId}`;
                console.log(`🎯 ID encontrado: ${potentialId}`);
                return {
                  urlProduto: urlProduto,
                  idProduto: potentialId,
                  titulo: titleMatch ? (titleMatch[1] || titleMatch[2]) : undefined
                };
              }
            }
          }
        }
      }

      // Fallback: buscar qualquer link de produto
      const padroes = [
        // Link direto para produtos com ID
        /href="\/produtos\/(\d+)"/g,
        /href="https:\/\/www\.queenbooks\.com\.br\/produtos\/(\d+)"/g,
        
        // Links relativos
        /href="(\/produtos\/[^"]+)"/g,
        
        // Padrões de produto
        /produto[^"]*href="([^"]+)"/g,
        /data-produto[^"]*="([^"]+)"/g
      ];

      for (const pattern of padroes) {
        let match;
        pattern.lastIndex = 0; // Reset regex
        
        while ((match = pattern.exec(html)) !== null) {
          let urlProduto = match[1];
          
          // Se é apenas o ID
          if (/^\d+$/.test(urlProduto)) {
            urlProduto = `/produtos/${urlProduto}`;
          }
          
          // Converter para URL completa
          if (!urlProduto.startsWith('http')) {
            urlProduto = this.baseUrl + urlProduto;
          }
          
          // Extrair ID do produto
          const idMatch = urlProduto.match(/\/produtos\/(\d+)/);
          if (idMatch) {
            return {
              urlProduto: urlProduto,
              idProduto: idMatch[1]
            };
          }
        }
      }

      // Se não encontrou, procurar por padrões alternativos
      return this.buscarPadroesAlternativos(html, codigo);
      
    } catch (error) {
      console.log(`Erro ao extrair link: ${error.message}`);
      return null;
    }
  }

  buscarPadroesAlternativos(html, codigo) {
    try {
      // Procurar pelo código na página
      if (html.includes(codigo)) {
        console.log('✅ Código encontrado na página');
        
        // Procurar por qualquer link que contenha "produto"
        const linkRegex = /href="([^"]*produto[^"]*)"/gi;
        let match;
        
        while ((match = linkRegex.exec(html)) !== null) {
          let url = match[1];
          if (!url.startsWith('http')) {
            url = this.baseUrl + url;
          }
          
          // Verificar se é um link válido de produto
          if (url.includes('/produtos/') || url.includes('produto')) {
            return {
              urlProduto: url,
              idProduto: this.extrairIdDaUrl(url)
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  extrairIdDaUrl(url) {
    const matches = url.match(/\/produtos\/(\d+)/) || url.match(/id=(\d+)/) || url.match(/produto\/(\d+)/);
    return matches ? matches[1] : 'unknown';
  }

  async extrairDadosCompletos(urlProduto) {
    try {
      console.log(`📡 Extraindo dados de: ${urlProduto}`);
      
      const response = await axios.get(urlProduto, {
        timeout: this.timeout,
        headers: this.getHeaders()
      });

      if (response.status === 200) {
        return this.processarPaginaProduto(response.data, urlProduto);
      }
    } catch (error) {
      console.log(`⚠️  Erro ao extrair dados: ${error.message}`);
      return null;
    }
  }

  processarPaginaProduto(html, url) {
    const dados = {
      titulo: '',
      descricao: '',
      informacoes: {},
      fotos: [],
      preco: null,
      status: 'unknown'
    };

    try {
      console.log('📊 Processando página do produto...');
      
      // 1. TÍTULO - estratégias melhoradas
      const tituloPatterns = [
        // Título principal da página
        /<h1[^>]*class="[^"]*ProductName[^"]*"[^>]*>([^<]+)<\/h1>/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
        // Meta tags
        /<meta\s+property="og:title"\s+content="([^"]+)"/i,
        /<title[^>]*>([^<]+)<\/title>/i,
        // Outros padrões específicos
        /<div[^>]*class="[^"]*product[^"]*title[^"]*"[^>]*>([^<]+)<\/div>/i,
        /<span[^>]*class="[^"]*ProductName[^"]*"[^>]*>([^<]+)<\/span>/i
      ];

      for (const pattern of tituloPatterns) {
        const match = html.match(pattern);
        if (match && match[1] && match[1].trim().length > 5) {
          let titulo = this.limparTexto(match[1]);
          // Filtrar títulos genéricos
          if (!titulo.toLowerCase().includes('queen books') && 
              !titulo.toLowerCase().includes('e-commerce') &&
              titulo.length > 10) {
            dados.titulo = titulo;
            console.log(`📚 Título extraído: ${titulo}`);
            break;
          }
        }
      }

      // 2. DESCRIÇÃO - buscar na seção específica de descrição
      const descricaoPatterns = [
        // Seção de descrição do produto
        /<div[^>]*id="descricao"[^>]*>(.*?)<\/div>/is,
        /<div[^>]*class="[^"]*ProductDescription[^"]*"[^>]*>(.*?)<\/div>/is,
        /<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/div>/is,
        // Meta description
        /<meta\s+name="description"\s+content="([^"]+)"/i,
        // Outros padrões
        /<p[^>]*class="[^"]*descri[^"]*"[^>]*>(.*?)<\/p>/is
      ];

      for (const pattern of descricaoPatterns) {
        const match = html.match(pattern);
        if (match && match[1] && match[1].trim().length > 20) {
          let descricao = this.limparTexto(match[1]);
          // Filtrar descrições genéricas
          if (!descricao.toLowerCase().includes('e-commerce b2b') &&
              !descricao.toLowerCase().includes('mercos') &&
              descricao.length > 30) {
            dados.descricao = descricao;
            console.log(`📋 Descrição extraída: ${descricao.substring(0, 100)}...`);
            break;
          }
        }
      }

      // 3. INFORMAÇÕES DETALHADAS - extração melhorada
      dados.informacoes = this.extrairInformacoesProdutoDetalhado(html);

      // 4. FOTOS - estratégias específicas para QueenBooks
      dados.fotos = this.extrairFotosQueenBooks(html);

      // 5. PREÇO - buscar em seções específicas
      dados.preco = this.extrairPrecoQueenBooks(html);

      // 6. STATUS (disponibilidade)
      dados.status = this.extrairStatusProduto(html);

      console.log(`✅ Dados extraídos - Título: ${dados.titulo ? '✓' : '✗'}, Fotos: ${dados.fotos.length}, Preço: ${dados.preco ? '✓' : '✗'}`);

      return dados;

    } catch (error) {
      console.log(`Erro ao processar página: ${error.message}`);
      return dados;
    }
  }

  extrairInformacoesProdutoDetalhado(html) {
    const info = {};
    
    try {
      console.log('📋 Extraindo informações detalhadas...');
      
      // 1. Buscar na seção de descrição estruturada
      const descricaoMatch = html.match(/<div[^>]*id="descricao"[^>]*>(.*?)<\/div>/is);
      if (descricaoMatch) {
        const descricaoHtml = descricaoMatch[1];
        
        // Extrair informações estruturadas
        const infoPatterns = [
          /Origem:\s*([^<\n]+)/gi,
          /Autor:\s*([^<\n]+)/gi,
          /Editora:\s*([^<\n]+)/gi,
          /ISBN:\s*([^<\n]+)/gi,
          /Ano:\s*([^<\n]+)/gi,
          /Edição:\s*([^<\n]+)/gi,
          /Páginas:\s*([^<\n]+)/gi,
          /Encadernação:\s*([^<\n]+)/gi,
          /Medidas\s*:\s*([^<\n]+)/gi,
          /Idioma:\s*([^<\n]+)/gi
        ];

        infoPatterns.forEach(pattern => {
          const match = descricaoHtml.match(pattern);
          if (match && match[1]) {
            const campo = pattern.source.split(':')[0].replace(/[^\w\s]/g, '');
            info[campo] = this.limparTexto(match[1]);
          }
        });
      }

      // 2. Buscar na tabela de dimensões
      const tabelaMatch = html.match(/<table[^>]*class="[^"]*ProductDimensions[^"]*"[^>]*>(.*?)<\/table>/is);
      if (tabelaMatch) {
        const tabelaHtml = tabelaMatch[1];
        
        // Extrair dados da tabela
        const linhasRegex = /<tr><td[^>]*>([^<]+)<\/td><td[^>]*>([^<]+)<\/td><\/tr>/gi;
        let match;
        
        while ((match = linhasRegex.exec(tabelaHtml)) !== null) {
          const campo = this.limparTexto(match[1]);
          const valor = this.limparTexto(match[2]);
          if (campo && valor) {
            info[campo] = valor;
          }
        }
      }

      // 3. Procurar por outros padrões de especificações
      const outrosPatterns = [
        /especificações[^:]*:(.*?)(?=<\/div>|<div|$)/gis,
        /detalhes[^:]*:(.*?)(?=<\/div>|<div|$)/gis,
        /características[^:]*:(.*?)(?=<\/div>|<div|$)/gis
      ];

      outrosPatterns.forEach(pattern => {
        const match = html.match(pattern);
        if (match && match[1]) {
          const conteudo = match[1];
          // Procurar por pares campo:valor no conteúdo
          const pares = conteudo.match(/([^:]+):\s*([^<\n]+)/g);
          if (pares) {
            pares.forEach(par => {
              const [campo, valor] = par.split(':').map(s => this.limparTexto(s));
              if (campo && valor && campo.length < 50) {
                info[campo] = valor;
              }
            });
          }
        }
      });

      console.log(`📋 Informações extraídas: ${Object.keys(info).length} campos`);
      return info;
      
    } catch (error) {
      console.log(`Erro ao extrair informações: ${error.message}`);
      return info;
    }
  }

  extrairFotosQueenBooks(html) {
    const fotos = [];
    
    try {
      console.log('🖼️  Extraindo fotos...');
      
      // 1. Buscar thumbnails do carrossel (formato específico do QueenBooks)
      const carrosselMatch = html.match(/<div[^>]*class="[^"]*Carrousel__thumbTrack[^"]*"[^>]*>(.*?)<\/div>/is);
      if (carrosselMatch) {
        const carrosselHtml = carrosselMatch[1];
        
        // Extrair URLs das imagens do carrossel
        const imgRegex = /src="([^"]*meuspedidos\.com\.br[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
        let match;
        
        while ((match = imgRegex.exec(carrosselHtml)) !== null) {
          let imgUrl = match[1];
          
          // Converter para versão maior (substituir 100x100 por dimensão maior)
          imgUrl = imgUrl.replace(/fit-in\/100x100/, 'fit-in/800x800');
          imgUrl = imgUrl.replace(/fit-in\/\d+x\d+/, 'fit-in/800x800');
          
          if (!fotos.includes(imgUrl)) {
            fotos.push(imgUrl);
          }
        }
      }

      // 2. Buscar outras imagens de produto
      const imgPatterns = [
        // Imagens principais do produto
        /src="([^"]*(?:produto|product|item)[^"]*mercos[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
        /data-src="([^"]*(?:produto|product|item)[^"]*mercos[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
        // Galeria de imagens
        /src="([^"]*gallery[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
        // Imagens grandes
        /src="([^"]*\/(?:large|big|original)[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi
      ];

      imgPatterns.forEach(pattern => {
        let match;
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(html)) !== null) {
          let imgUrl = match[1];
          
          if (imgUrl && imgUrl.length > 30) {
            // Garantir protocolo HTTPS
            if (imgUrl.startsWith('//')) {
              imgUrl = 'https:' + imgUrl;
            } else if (!imgUrl.startsWith('http')) {
              imgUrl = 'https://' + imgUrl;
            }
            
            // Filtrar e adicionar se válida
            if (this.isImagemProdutoValidaQueenBooks(imgUrl) && !fotos.includes(imgUrl)) {
              fotos.push(imgUrl);
            }
          }
        }
      });

      console.log(`🖼️  ${fotos.length} fotos encontradas`);
      return fotos;
      
    } catch (error) {
      console.log(`Erro ao extrair fotos: ${error.message}`);
      return fotos;
    }
  }

  extrairPrecoQueenBooks(html) {
    try {
      console.log('💰 Extraindo preço...');
      
      // Padrões específicos para QueenBooks
      const precoPatterns = [
        // Preço em elementos de preço
        /<div[^>]*class="[^"]*price[^"]*"[^>]*>.*?R\$\s*([\d.,]+)/gi,
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>.*?R\$\s*([\d.,]+)/gi,
        // Preço em dados estruturados
        /"price":\s*"?(\d+\.?\d*)"?/gi,
        // Padrões gerais de preço
        /R\$\s*([\d.,]+)/g,
        // Preço em meta tags
        /<meta[^>]*property="product:price:amount"[^>]*content="([^"]+)"/gi
      ];

      for (const pattern of precoPatterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          // Pegar o maior preço encontrado (assumindo que é o preço principal)
          const precos = matches.map(match => {
            const numero = match.match(/([\d.,]+)/);
            return numero ? parseFloat(numero[1].replace(',', '.')) : 0;
          }).filter(p => p > 0);
          
          if (precos.length > 0) {
            const precoMax = Math.max(...precos);
            const precoFormatado = `R$ ${precoMax.toFixed(2).replace('.', ',')}`;
            console.log(`💰 Preço encontrado: ${precoFormatado}`);
            return precoFormatado;
          }
        }
      }

      console.log('💰 Preço não encontrado');
      return null;
      
    } catch (error) {
      console.log(`Erro ao extrair preço: ${error.message}`);
      return null;
    }
  }

  extrairStatusProduto(html) {
    try {
      const htmlLower = html.toLowerCase();
      
      // Verificar botões de compra e disponibilidade
      if (htmlLower.includes('comprar') || htmlLower.includes('adicionar ao carrinho') || 
          htmlLower.includes('buy') || htmlLower.includes('add to cart')) {
        console.log('📦 Status: Disponível');
        return 'available';
      } else if (htmlLower.includes('esgotado') || htmlLower.includes('indisponível') || 
                 htmlLower.includes('sold out') || htmlLower.includes('out of stock')) {
        console.log('📦 Status: Indisponível');
        return 'unavailable';
      }
      
      console.log('📦 Status: Desconhecido');
      return 'unknown';
      
    } catch (error) {
      console.log(`Erro ao extrair status: ${error.message}`);
      return 'unknown';
    }
  }

  isImagemProdutoValidaQueenBooks(url) {
    const urlLower = url.toLowerCase();
    
    // Critérios específicos para QueenBooks
    const incluir = [
      'meuspedidos.com.br',
      'mercos.com',
      'produto', 'product', 
      'item', 'book', 'livro'
    ];
    
    const excluir = [
      'logo', 'banner', 'background', 
      'icon', 'button', 'social', 
      'header', 'footer', 'menu',
      'thumbnail_50x50', // thumbnails muito pequenos
      'fit-in/50x50'
    ];
    
    const temIncluir = incluir.some(term => urlLower.includes(term));
    const temExcluir = excluir.some(term => urlLower.includes(term));
    
    return temIncluir && !temExcluir && url.length > 50;
  }

  getHeaders() {
    return {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1'
    };
  }

  limparTexto(texto) {
    return texto
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[^;]+;/g, '')
      .trim();
  }

  async salvarProdutoReal(produto) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const nomeArquivo = `produto_real_${produto.codigo}_${timestamp}.json`;
      const caminhoArquivo = path.join(this.dataDir, nomeArquivo);
      
      await fs.writeJSON(caminhoArquivo, produto, { spaces: 2 });
      console.log(`💾 Produto salvo: ${caminhoArquivo}`);
      
      return caminhoArquivo;
    } catch (error) {
      console.error('Erro ao salvar produto:', error.message);
      return null;
    }
  }

  async exibirResultado(produto) {
    console.log('\n📦 RESULTADO DA BUSCA REAL:');
    console.log('=' .repeat(50));
    console.log(`🔢 Código: ${produto.codigo}`);
    console.log(`📚 Título: ${produto.titulo || '❌ Não encontrado'}`);
    console.log(`💰 Preço: ${produto.preco || '❌ Não informado'}`);
    console.log(`📊 Status: ${this.formatarStatus(produto.status)}`);
    console.log(`🖼️  Fotos: ${produto.fotos.length} encontradas`);
    console.log(`🔗 URL Busca: ${produto.urlBusca}`);
    console.log(`🔗 URL Produto: ${produto.urlProduto || '❌ Não encontrado'}`);
    
    if (produto.idProduto) {
      console.log(`🆔 ID Produto: ${produto.idProduto}`);
    }

    if (produto.fotos.length > 0) {
      console.log('\n🖼️  FOTOS ENCONTRADAS:');
      produto.fotos.slice(0, 5).forEach((foto, index) => {
        console.log(`   ${index + 1}. ${foto}`);
      });
      if (produto.fotos.length > 5) {
        console.log(`   ... e mais ${produto.fotos.length - 5} fotos`);
      }
    }

    if (produto.descricao) {
      console.log(`\n📋 Descrição: ${produto.descricao.substring(0, 200)}...`);
    }

    if (Object.keys(produto.informacoes).length > 0) {
      console.log('\n📋 INFORMAÇÕES ADICIONAIS:');
      Object.entries(produto.informacoes).forEach(([campo, valor]) => {
        console.log(`   ${campo}: ${valor}`);
      });
    }

    console.log('\n💡 INSTRUÇÕES MANUAIS:');
    console.log(`1. Acesse: ${produto.urlBusca}`);
    console.log('2. Procure pelo produto na página');
    console.log('3. Clique no produto para ver detalhes');
    console.log('4. Confirme dados e disponibilidade');
  }

  formatarStatus(status) {
    switch(status) {
      case 'available': return '✅ Disponível';
      case 'unavailable': return '❌ Indisponível';
      default: return '❓ Status desconhecido - verificar manualmente';
    }
  }

  /**
   * Busca produto usando diretamente o ID do site (mais eficiente)
   */
  async buscarPorIdSite(idSite) {
    console.log('🎯 BUSCA DIRETA POR ID DO SITE');
    console.log('=' .repeat(50));
    console.log(`🆔 ID do Site: ${idSite}`);
    console.log('');

    const urlProduto = `${this.baseUrl}/produtos/${idSite}`;
    
    const produto = {
      idSite: idSite,
      titulo: '',
      codigoIsbn: '',
      descricao: '',
      informacoes: {},
      fotos: [],
      preco: null,
      status: 'unknown',
      urlProduto: urlProduto,
      encontradoEm: new Date().toISOString(),
      metodoBusca: 'busca_direta_id'
    };

    try {
      console.log('🔍 Acessando página do produto...');
      console.log(`📡 URL: ${urlProduto}`);
      
      const response = await axios.get(urlProduto, {
        timeout: this.timeout,
        headers: this.getHeaders()
      });

      if (response.status === 200) {
        console.log('✅ Página carregada com sucesso!');
        
        // Extrair dados completos da página
        const dadosCompletos = this.processarPaginaProdutoCompleta(response.data, urlProduto);
        Object.assign(produto, dadosCompletos);
        
        console.log('✅ Dados extraídos com sucesso!');
      } else {
        console.log(`❌ Erro HTTP: ${response.status}`);
      }

      // Salvar resultado
      await this.salvarProdutoReal(produto);
      await this.exibirResultadoCompleto(produto);

      // Criar template automático se dados suficientes
      if (produto.titulo && produto.codigoIsbn) {
        await this.criarTemplateAutomatico(produto);
      }

      return produto;

    } catch (error) {
      console.error(`❌ Erro na busca: ${error.message}`);
      produto.erro = error.message;
      await this.salvarProdutoReal(produto);
      return produto;
    }
  }

  /**
   * Processamento completo e otimizado da página do produto
   */
  processarPaginaProdutoCompleta(html, url) {
    const dados = {
      titulo: '',
      codigoIsbn: '',
      descricao: '',
      informacoes: {},
      fotos: [],
      preco: null,
      status: 'unknown'
    };

    try {
      console.log('📊 Processando página completa do produto...');
      
      // 1. TÍTULO - buscar em H1 com mais flexibilidade
      const tituloPatterns = [
        /<h1[^>]*>([^<]+)<\/h1>/i,
        /<h1[^>]*style="[^"]*">([^<]+)<\/h1>/i,
        /<title>([^<]+)<\/title>/i
      ];
      
      for (const pattern of tituloPatterns) {
        const match = html.match(pattern);
        if (match && match[1] && match[1].trim().length > 5) {
          let titulo = this.limparTexto(match[1]);
          if (!titulo.toLowerCase().includes('queen books') && titulo.length > 10) {
            dados.titulo = titulo;
            console.log(`📚 Título: ${dados.titulo}`);
            break;
          }
        }
      }

      // 2. CÓDIGO ISBN - buscar com mais flexibilidade e limpeza
      const codigoPatterns = [
        /<span[^>]*>Cód\.\s*([^<\s]+)/i,
        /Cód\.\s*(\d+)/i,
        /código[^:]*:\s*(\d+)/gi,
        /isbn[^:]*:\s*(\d+)/gi,
        /ISBN:\s*([^<\n]+)/gi
      ];
      
      for (const pattern of codigoPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          let codigo = match[1].trim();
          // Limpar prefixos como "ISBN: "
          codigo = codigo.replace(/^ISBN:\s*/i, '').trim();
          dados.codigoIsbn = codigo;
          console.log(`🔢 Código ISBN: ${dados.codigoIsbn}`);
          break;
        }
      }

      // 3. DESCRIÇÃO E INFORMAÇÕES - buscar seções específicas e meta tags
      let infoExtraidas = {};
      
      // Primeiro tentar extrair das meta tags (HTML completo)
      const metaDescription = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
      if (metaDescription && metaDescription[1]) {
        console.log('📋 Extraindo informações das meta tags...');
        const metaContent = metaDescription[1];
        
        // Dividir por quebras de linha e processar cada linha
        const linhas = metaContent.split('\n');
        linhas.forEach(linha => {
          linha = linha.trim();
          if (linha.includes(':')) {
            const [campo, valor] = linha.split(':').map(s => s.trim());
            if (campo && valor && campo.length < 50 && valor.length > 0) {
              infoExtraidas[campo] = valor;
            }
          }
        });
        
        dados.informacoes = infoExtraidas;
        dados.descricao = this.criarDescricaoDosProdutos(infoExtraidas);
        console.log(`📋 ${Object.keys(infoExtraidas).length} informações extraídas das meta tags`);
      } else {
        // Fallback: buscar na seção de descrição
        const descricaoPatterns = [
          /<div[^>]*class="[^"]*ProductDescription__container[^"]*"[^>]*>(.*?)<\/div>/is,
          /<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/div>/is,
          /<div[^>]*id="descricao"[^>]*>(.*?)<\/div>/is
        ];
        
        for (const pattern of descricaoPatterns) {
          const match = html.match(pattern);
          if (match && match[1]) {
            const descricaoHtml = match[1];
            dados.informacoes = this.extrairInformacoesEstruturadas(descricaoHtml);
            dados.descricao = this.criarDescricaoDosProdutos(dados.informacoes);
            console.log(`📋 Informações extraídas: ${Object.keys(dados.informacoes).length} campos`);
            break;
          }
        }
      }

      // 4. TABELA DE DIMENSÕES - buscar especificamente
      const tabelaPatterns = [
        /<table[^>]*class="[^"]*ProductDimensions__table[^"]*"[^>]*>(.*?)<\/table>/is,
        /<table[^>]*class="[^"]*table[^"]*"[^>]*>(.*?)<\/table>/is,
        /<table[^>]*>(.*?)<\/table>/is
      ];
      
      for (const pattern of tabelaPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const dimensoes = this.extrairTabelaDimensoes(match[1]);
          if (Object.keys(dimensoes).length > 0) {
            Object.assign(dados.informacoes, dimensoes);
            console.log(`📏 Dimensões extraídas: ${Object.keys(dimensoes).length} campos`);
            break;
          }
        }
      }

      // 5. FOTOS - buscar carrossel e outras imagens
      dados.fotos = this.extrairFotosCarrossel(html);
      
      // Se não encontrou no carrossel, buscar outras imagens
      if (dados.fotos.length === 0) {
        dados.fotos = this.extrairFotosAlternativas(html);
      }

      // 6. PREÇO E STATUS - buscar elementos de compra
      const dadosCompra = this.extrairDadosCompra(html);
      dados.preco = dadosCompra.preco;
      dados.status = dadosCompra.status;

      console.log(`✅ Extração completa - Título: ${dados.titulo ? '✓' : '✗'}, ISBN: ${dados.codigoIsbn ? '✓' : '✗'}, Fotos: ${dados.fotos.length}, Status: ${dados.status}`);

      return dados;

    } catch (error) {
      console.log(`Erro ao processar página completa: ${error.message}`);
      return dados;
    }
  }

  /**
   * Extração estruturada das informações do produto
   */
  extrairInformacoesEstruturadas(descricaoHtml) {
    const info = {};
    
    try {
      console.log('📋 Extraindo informações estruturadas...');
      
      // 1. Primeiro tentar extrair das meta tags (mais confiável)
      const metaDescription = descricaoHtml.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
      if (metaDescription && metaDescription[1]) {
        console.log('📋 Extraindo de meta description...');
        const metaContent = metaDescription[1];
        
        // Dividir por quebras de linha e processar cada linha
        const linhas = metaContent.split('\n');
        linhas.forEach(linha => {
          linha = linha.trim();
          if (linha.includes(':')) {
            const [campo, valor] = linha.split(':').map(s => s.trim());
            if (campo && valor && campo.length < 50 && valor.length > 0) {
              info[campo] = valor;
            }
          }
        });
      }
      
      // 2. Se não encontrou nas meta tags, procurar por parágrafos
      if (Object.keys(info).length === 0) {
        const paragrafosRegex = /<p[^>]*data-testid="paragraph"[^>]*>([^<]+)<\/p>/gi;
        let match;
        
        while ((match = paragrafosRegex.exec(descricaoHtml)) !== null) {
          const textoLimpo = this.limparTexto(match[1]);
          
          if (textoLimpo.includes(':')) {
            const [campo, valor] = textoLimpo.split(':').map(s => s.trim());
            if (campo && valor && campo.length < 50 && valor.length > 0) {
              info[campo] = valor;
            }
          } else if (textoLimpo.length > 5) {
            if (textoLimpo.toLowerCase().includes('medidas')) {
              info['Medidas'] = textoLimpo.replace(/medidas\s*:?\s*/i, '').trim();
            } else if (textoLimpo.length > 10 && !info['Observações']) {
              info['Observações'] = textoLimpo;
            }
          }
        }
      }
      
      // 3. Se ainda não encontrou, usar busca geral
      if (Object.keys(info).length === 0) {
        console.log('📋 Tentando extração alternativa...');
        
        const infoPatterns = [
          /Origem:\s*([^<\n]+)/gi,
          /Autor:\s*([^<\n]+)/gi,
          /Editora:\s*([^<\n]+)/gi,
          /ISBN:\s*([^<\n]+)/gi,
          /Ano:\s*([^<\n]+)/gi,
          /Edição:\s*([^<\n]+)/gi,
          /Páginas:\s*([^<\n]+)/gi,
          /Encadernação:\s*([^<\n]+)/gi,
          /Medidas?\s*:?\s*([^<\n]+)/gi,
          /Idioma:\s*([^<\n]+)/gi
        ];

        infoPatterns.forEach(pattern => {
          const matchInfo = descricaoHtml.match(pattern);
          if (matchInfo && matchInfo[1]) {
            const campo = pattern.source.split(':')[0].replace(/[^\w\s]/g, '');
            const valor = this.limparTexto(matchInfo[1]);
            if (campo && valor && valor.length > 0) {
              info[campo] = valor;
            }
          }
        });
      }
      
      console.log(`📋 ${Object.keys(info).length} informações extraídas`);
      return info;
      
    } catch (error) {
      console.log(`Erro ao extrair informações estruturadas: ${error.message}`);
      return info;
    }
  }

  /**
   * Extração da tabela de dimensões
   */
  extrairTabelaDimensoes(tabelaHtml) {
    const dimensoes = {};
    
    try {
      // Extrair linhas da tabela
      const linhasRegex = /<tr><td[^>]*>([^<]+)<\/td><td[^>]*>([^<]+)<\/td><\/tr>/gi;
      let match;
      
      while ((match = linhasRegex.exec(tabelaHtml)) !== null) {
        const campo = this.limparTexto(match[1]);
        const valor = this.limparTexto(match[2]);
        if (campo && valor) {
          dimensoes[campo] = valor;
        }
      }
      
      return dimensoes;
    } catch (error) {
      console.log(`Erro ao extrair tabela: ${error.message}`);
      return dimensoes;
    }
  }

  /**
   * Criar descrição baseada nas informações extraídas
   */
  criarDescricaoDosProdutos(informacoes) {
    try {
      const partes = [];
      
      if (informacoes.Origem) partes.push(`Origem: ${informacoes.Origem}`);
      if (informacoes.Autor) partes.push(`Autor: ${informacoes.Autor}`);
      if (informacoes.Editora) partes.push(`Editora: ${informacoes.Editora}`);
      if (informacoes.Ano) partes.push(`Ano: ${informacoes.Ano}`);
      if (informacoes.Páginas) partes.push(`${informacoes.Páginas} páginas`);
      if (informacoes.Encadernação) partes.push(`${informacoes.Encadernação}`);
      
      return partes.join(' • ');
    } catch (error) {
      return 'Produto extraído automaticamente';
    }
  }

  /**
   * Extração otimizada das fotos do carrossel
   */
  extrairFotosCarrossel(html) {
    const fotos = [];
    
    try {
      console.log('🖼️  Extraindo fotos do carrossel...');
      
      // 1. Buscar seção do carrossel com padrões mais flexíveis
      const carrosselPatterns = [
        /<div[^>]*class="[^"]*Carrousel__thumbTrack[^"]*"[^>]*>(.*?)<\/div>/is,
        /<div[^>]*class="[^"]*carrousel[^"]*"[^>]*>(.*?)<\/div>/is,
        /<div[^>]*class="[^"]*thumb[^"]*"[^>]*>(.*?)<\/div>/is
      ];
      
      let carrosselHtml = '';
      for (const pattern of carrosselPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          carrosselHtml = match[1];
          console.log('🎯 Carrossel encontrado!');
          break;
        }
      }
      
      if (carrosselHtml) {
        // Extrair URLs das imagens do carrossel
        const imgPatterns = [
          /src="([^"]*meuspedidos\.com\.br[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
          /data-src="([^"]*meuspedidos\.com\.br[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
          /src="([^"]*mercos[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi
        ];
        
        imgPatterns.forEach(pattern => {
          let match;
          pattern.lastIndex = 0;
          
          while ((match = pattern.exec(carrosselHtml)) !== null) {
            let imgUrl = match[1];
            
            // Converter para versão maior
            imgUrl = imgUrl.replace(/fit-in\/100x100/, 'fit-in/800x800');
            imgUrl = imgUrl.replace(/fit-in\/\d+x\d+/, 'fit-in/800x800');
            
            if (!fotos.includes(imgUrl)) {
              fotos.push(imgUrl);
            }
          }
        });
      }

      console.log(`🖼️  ${fotos.length} fotos do carrossel extraídas`);
      return fotos;
      
    } catch (error) {
      console.log(`Erro ao extrair fotos do carrossel: ${error.message}`);
      return fotos;
    }
  }

  /**
   * Buscar fotos alternativas se o carrossel não funcionar
   */
  extrairFotosAlternativas(html) {
    const fotos = [];
    
    try {
      console.log('🖼️  Buscando fotos alternativas...');
      
      // Padrões alternativos para imagens
      const imgPatterns = [
        // Qualquer imagem do Mercos
        /src="([^"]*mercos[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
        /data-src="([^"]*mercos[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
        // Imagens do meuspedidos
        /src="([^"]*meuspedidos\.com\.br[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
        // Outras imagens de produto
        /src="([^"]*(?:produto|product|item)[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi
      ];

      imgPatterns.forEach(pattern => {
        let match;
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(html)) !== null) {
          let imgUrl = match[1];
          
          if (imgUrl && imgUrl.length > 30) {
            // Garantir protocolo HTTPS
            if (imgUrl.startsWith('//')) {
              imgUrl = 'https:' + imgUrl;
            } else if (!imgUrl.startsWith('http')) {
              imgUrl = 'https://' + imgUrl;
            }
            
            // Converter para alta resolução se possível
            if (imgUrl.includes('fit-in/')) {
              imgUrl = imgUrl.replace(/fit-in\/\d+x\d+/, 'fit-in/800x800');
            }
            
            // Filtrar e adicionar se válida
            if (this.isImagemProdutoValidaQueenBooks(imgUrl) && !fotos.includes(imgUrl)) {
              fotos.push(imgUrl);
            }
          }
        }
      });

      console.log(`🖼️  ${fotos.length} fotos alternativas encontradas`);
      return fotos;
      
    } catch (error) {
      console.log(`Erro ao extrair fotos alternativas: ${error.message}`);
      return fotos;
    }
  }

  /**
   * Extração preço e status de disponibilidade
   */
  extrairDadosCompra(html) {
    const dados = { preco: null, status: 'unknown' };
    
    try {
      console.log('💰 Extraindo dados de compra...');
      
      // 1. Buscar preço em diversos padrões
      const precoPatterns = [
        // Preços em elementos específicos
        /<div[^>]*class="[^"]*price[^"]*"[^>]*>.*?R\$\s*([\d.,]+)/gi,
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>.*?R\$\s*([\d.,]+)/gi,
        // JSON estruturado
        /"price":\s*"?([\d.,]+)"?/gi,
        // Padrão geral
        /R\$\s*([\d.,]+)/g
      ];

      for (const pattern of precoPatterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          // Extrair números e pegar o maior (assumindo ser o preço principal)
          const precos = matches.map(match => {
            const numero = match.match(/([\d.,]+)/);
            return numero ? parseFloat(numero[1].replace(',', '.')) : 0;
          }).filter(p => p > 0);
          
          if (precos.length > 0) {
            dados.preco = `R$ ${Math.max(...precos).toFixed(2).replace('.', ',')}`;
            console.log(`💰 Preço encontrado: ${dados.preco}`);
            break;
          }
        }
      }

      // 2. Verificar disponibilidade
      const htmlLower = html.toLowerCase();
      if (htmlLower.includes('comprar') || htmlLower.includes('adicionar')) {
        dados.status = 'available';
        console.log('📦 Status: Disponível');
      } else if (htmlLower.includes('esgotado') || htmlLower.includes('indisponível')) {
        dados.status = 'unavailable';
        console.log('📦 Status: Indisponível');
      } else {
        console.log('📦 Status: Desconhecido');
      }

      return dados;
      
    } catch (error) {
      console.log(`Erro ao extrair dados de compra: ${error.message}`);
      return dados;
    }
  }

  /**
   * Exibir resultado completo e otimizado
   */
  async exibirResultadoCompleto(produto) {
    console.log('\n📦 RESULTADO DA BUSCA DIRETA:');
    console.log('=' .repeat(50));
    console.log(`🆔 ID Site: ${produto.idSite}`);
    console.log(`📚 Título: ${produto.titulo || '❌ Não encontrado'}`);
    console.log(`🔢 ISBN: ${produto.codigoIsbn || '❌ Não encontrado'}`);
    console.log(`💰 Preço: ${produto.preco || '❌ Não informado'}`);
    console.log(`📊 Status: ${this.formatarStatus(produto.status)}`);
    console.log(`🖼️  Fotos: ${produto.fotos.length} encontradas`);
    console.log(`🔗 URL: ${produto.urlProduto}`);

    if (produto.fotos.length > 0) {
      console.log('\n🖼️  FOTOS ENCONTRADAS:');
      produto.fotos.slice(0, 3).forEach((foto, index) => {
        console.log(`   ${index + 1}. ${foto}`);
      });
      if (produto.fotos.length > 3) {
        console.log(`   ... e mais ${produto.fotos.length - 3} fotos`);
      }
    }

    if (produto.descricao) {
      console.log(`\n📋 Descrição: ${produto.descricao}`);
    }

    if (Object.keys(produto.informacoes).length > 0) {
      console.log('\n📋 INFORMAÇÕES DETALHADAS:');
      Object.entries(produto.informacoes).forEach(([campo, valor]) => {
        console.log(`   ${campo}: ${valor}`);
      });
    }

    console.log('\n✅ BUSCA DIRETA CONCLUÍDA COM SUCESSO!');
  }

  /**
   * Criar template automático para o assistente manual
   */
  async criarTemplateAutomatico(produto) {
    try {
      if (!produto.titulo || !produto.codigoIsbn) {
        console.log('❌ Dados insuficientes para criar template automático');
        return null;
      }

      console.log('🔄 Criando template automático...');
      
      const template = {
        codigo: produto.codigoIsbn,
        urlProduto: produto.urlProduto,
        idProduto: produto.idSite,
        titulo: produto.titulo,
        categoria: this.determinarCategoria(produto.informacoes),
        preco: produto.preco,
        status: produto.status === 'unknown' ? 'available' : produto.status, // assumir disponível se desconhecido
        descricao: produto.descricao,
        fotos: produto.fotos.length > 0 ? produto.fotos : ['[PREENCHER] - Adicione as URLs das fotos'],
        notas: this.criarNotasAutomaticas(produto),
        informacoes: produto.informacoes,
        dropshipping: this.analisarDropshipping(produto)
      };

      // Salvar template
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const nomeArquivo = `template_auto_${produto.codigoIsbn}_${timestamp}.json`;
      const caminhoTemplate = path.join('./data/assistente-manual', nomeArquivo);
      
      await fs.ensureDir('./data/assistente-manual');
      await fs.writeJSON(caminhoTemplate, template, { spaces: 2 });
      
      console.log(`✅ Template automático criado: ${caminhoTemplate}`);
      console.log('');
      console.log('📝 PRÓXIMOS PASSOS:');
      console.log(`1. Revisar template: ${caminhoTemplate}`);
      console.log(`2. Ajustar preço se necessário`);
      console.log(`3. Adicionar fotos se não foram extraídas`);
      console.log(`4. Processar: node assistente-manual.js processar ${caminhoTemplate}`);
      
      return caminhoTemplate;
      
    } catch (error) {
      console.error('Erro ao criar template automático:', error.message);
      return null;
    }
  }

  /**
   * Determinar categoria baseada nas informações
   */
  determinarCategoria(informacoes) {
    if (!informacoes || Object.keys(informacoes).length === 0) {
      return 'Livros';
    }
    
    const editora = (informacoes.Editora || '').toLowerCase();
    const titulo = (informacoes.titulo || '').toLowerCase();
    
    if (editora.includes('assouline')) return 'Livros de Luxo';
    if (titulo.includes('collection')) return 'Coleções';
    if (titulo.includes('fashion') || titulo.includes('style')) return 'Moda & Estilo';
    if (titulo.includes('art') || titulo.includes('arte')) return 'Arte';
    if (titulo.includes('design')) return 'Design';
    
    return 'Livros Importados';
  }

  /**
   * Criar notas automáticas baseadas nas informações
   */
  criarNotasAutomaticas(produto) {
    const partes = [];
    
    if (produto.informacoes.Editora) {
      partes.push(`Publicado pela ${produto.informacoes.Editora}`);
    }
    
    if (produto.informacoes.Autor) {
      partes.push(`de ${produto.informacoes.Autor}`);
    }
    
    if (produto.informacoes.Ano) {
      partes.push(`(${produto.informacoes.Ano})`);
    }
    
    if (produto.informacoes.Páginas) {
      partes.push(`${produto.informacoes.Páginas} páginas`);
    }
    
    if (produto.informacoes.Encadernação) {
      partes.push(produto.informacoes.Encadernação.toLowerCase());
    }
    
    if (produto.informacoes.Origem) {
      partes.push(`Origem: ${produto.informacoes.Origem}`);
    }
    
    let nota = partes.join(', ');
    if (nota.length > 200) {
      nota = nota.substring(0, 200) + '...';
    }
    
    return nota || 'Produto extraído automaticamente do QueenBooks';
  }

  /**
   * Análise automática para dropshipping
   */
  analisarDropshipping(produto) {
    const editora = (produto.informacoes.Editora || '').toLowerCase();
    const preco = produto.preco;
    
    let analise = {
      adequado: true,
      margem_sugerida: '15-25%',
      publico_alvo: 'Leitores interessados em livros importados',
      concorrencia: 'Média',
      observacoes: 'Produto importado com boa demanda'
    };
    
    // Análise específica por editora
    if (editora.includes('assouline')) {
      analise.margem_sugerida = '20-35%';
      analise.publico_alvo = 'Colecionadores de livros de luxo, entusiastas de arte e design, profissionais criativos';
      analise.concorrencia = 'Baixa';
      analise.observacoes = 'Editora premium especializada em livros de arte e luxo. Alto valor agregado e público específico.';
    }
    
    return analise;
  }

  // ...existing code...
}

/**
 * Busca produto usando diretamente o ID do site (mais eficiente)
 */
async function buscarPorIdSite(idSite) {
  const searcher = new QueenBooksRealSearcher();
  await searcher.init();
  return searcher.buscarPorIdSite(idSite);
}

/**
 * Busca produto usando a estrutura real do site
 */
async function buscarProdutoReal(codigo) {
  const searcher = new QueenBooksRealSearcher();
  await searcher.init();
  return searcher.buscarProdutoReal(codigo);
}

module.exports = { QueenBooksRealSearcher, buscarPorIdSite, buscarProdutoReal };
