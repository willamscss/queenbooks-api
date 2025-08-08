const puppeteer = require('puppeteer');

async function extrairImagensCarrossel(produtoId) {
    console.log(`🎠 Iniciando extração de imagens do carrossel para produto ${produtoId}`);
    
    const browser = await puppeteer.launch({
        headless: false, // Vamos ver o que está acontecendo
        defaultViewport: { width: 1280, height: 720 },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    });
    
    try {
        const page = await browser.newPage();
        
        // Configurar user agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        const url = `https://www.queenbooks.com.br/produtos/${produtoId}`;
        
        console.log(`📡 Navegando para: ${url}`);
        await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });
        
        // Aguardar a página carregar completamente
        console.log('⏳ Aguardando página carregar...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verificar se o carrossel existe
        const carrosselExiste = await page.$('.Carrousel__imageContainer___9tur5');
        if (!carrosselExiste) {
            console.log('❌ Carrossel não encontrado, tentando seletores alternativos...');
            
            // Tentar outros seletores possíveis
            const seletoresAlternativos = [
                'img[alt*="Imagem do produto"]',
                '.product-image img',
                '.gallery img',
                '[class*="image"] img',
                '[class*="Image"] img'
            ];
            
            for (const seletor of seletoresAlternativos) {
                const elemento = await page.$(seletor);
                if (elemento) {
                    console.log(`✅ Encontrado com seletor: ${seletor}`);
                    const src = await elemento.evaluate(el => el.src);
                    return {
                        sucesso: true,
                        produto_id: produtoId,
                        url: url,
                        total_imagens: 1,
                        imagens: [{
                            indice: 1,
                            url: src,
                            alt: await elemento.evaluate(el => el.alt || '')
                        }],
                        metodo: 'seletor_alternativo'
                    };
                }
            }
            
            throw new Error('Nenhuma imagem encontrada');
        }
        
        console.log('✅ Carrossel encontrado');
        
        // Encontrar quantos indicadores existem
        await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar indicadores carregarem
        const indicadores = await page.$$('[data-testid="indicator-item"]');
        console.log(`📊 Encontrados ${indicadores.length} indicadores (${indicadores.length} imagens)`);
        
        const imagens = [];
        
        // Se não houver indicadores, extrair apenas a imagem atual
        if (indicadores.length === 0) {
            console.log('ℹ️ Sem indicadores, extraindo imagem atual...');
            const imagemSrc = await page.evaluate(() => {
                const img = document.querySelector('.Carrousel__imageContainer___9tur5 img');
                return img ? img.src : null;
            });
            
            if (imagemSrc) {
                imagens.push({
                    indice: 1,
                    url: imagemSrc,
                    alt: 'Imagem do produto'
                });
            }
        } else {
            // Iterar por cada indicador para extrair as imagens
            for (let i = 0; i < indicadores.length; i++) {
                console.log(`🖼️ Extraindo imagem ${i + 1}/${indicadores.length}`);
                
                try {
                    // Clicar no indicador
                    await indicadores[i].click();
                    
                    // Aguardar um pouco para a imagem carregar
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Extrair a imagem atual
                    const imagemInfo = await page.evaluate(() => {
                        const img = document.querySelector('.Carrousel__imageContainer___9tur5 img');
                        return img ? {
                            src: img.src,
                            alt: img.alt || 'Imagem do produto'
                        } : null;
                    });
                    
                    if (imagemInfo) {
                        imagens.push({
                            indice: i + 1,
                            url: imagemInfo.src,
                            alt: imagemInfo.alt
                        });
                        console.log(`  ✅ Imagem ${i + 1}: ${imagemInfo.src.substring(0, 80)}...`);
                    } else {
                        console.log(`  ❌ Não foi possível extrair imagem ${i + 1}`);
                    }
                } catch (error) {
                    console.log(`  ⚠️ Erro ao clicar no indicador ${i + 1}:`, error.message);
                }
            }
        }
        
        // Extrair informações extras do produto
        const infoProduto = await page.evaluate(() => {
            const titulo = document.querySelector('h1, .product-title, [class*="title"]')?.textContent?.trim();
            const preco = document.querySelector('.price, [class*="price"], [class*="Price"]')?.textContent?.trim();
            return { titulo, preco };
        });
        
        const resultado = {
            sucesso: true,
            produto_id: produtoId,
            url: url,
            titulo: infoProduto.titulo,
            preco: infoProduto.preco,
            total_imagens: imagens.length,
            imagens: imagens,
            timestamp: new Date().toISOString()
        };
        
        console.log('\n📋 RESULTADO:');
        console.log(JSON.stringify(resultado, null, 2));
        
        return resultado;
        
    } catch (error) {
        console.error('❌ Erro ao extrair imagens:', error);
        return {
            sucesso: false,
            erro: error.message,
            produto_id: produtoId
        };
    } finally {
        await browser.close();
    }
}

// Função para testar com múltiplos produtos
async function testeMultiplosProdutos() {
    const produtos = [
        '177776045', // Produto que você mencionou
        '177776664'  // Outro produto que testamos antes
    ];
    
    for (const produtoId of produtos) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🧪 TESTANDO PRODUTO: ${produtoId}`);
        console.log(`${'='.repeat(60)}`);
        
        const resultado = await extrairImagensCarrossel(produtoId);
        
        if (resultado.sucesso) {
            console.log(`✅ Sucesso! ${resultado.total_imagens} imagens extraídas`);
        } else {
            console.log(`❌ Falha: ${resultado.erro}`);
        }
        
        // Pausa entre produtos
        console.log('⏸️ Aguardando 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
}

// Executar teste
if (require.main === module) {
    console.log('🎠 TESTE DE EXTRAÇÃO DE IMAGENS DO CARROSSEL');
    console.log('='.repeat(50));
    
    // Testar com o produto específico
    extrairImagensCarrossel('177776045')
        .then(resultado => {
            console.log('\n🏁 TESTE CONCLUÍDO');
            
            if (resultado.sucesso) {
                console.log(`✅ ${resultado.total_imagens} imagens extraídas com sucesso!`);
                
                console.log('\n📋 URLS DAS IMAGENS:');
                resultado.imagens.forEach((img, index) => {
                    console.log(`${index + 1}. ${img.url}`);
                });
            }
        })
        .catch(error => {
            console.error('❌ Erro no teste:', error);
        });
}

module.exports = { extrairImagensCarrossel, testeMultiplosProdutos };
