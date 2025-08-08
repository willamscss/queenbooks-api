const puppeteer = require('puppeteer');

async function explorarEstruturaPagina(produtoId) {
    console.log(`🔍 Explorando estrutura da página para produto ${produtoId}`);
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 720 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        
        const url = `https://www.queenbooks.com.br/produtos/${produtoId}`;
        console.log(`📡 Navegando para: ${url}`);
        
        await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });
        
        // Aguardar página carregar
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('🔍 Explorando elementos na página...');
        
        // Buscar todas as imagens
        const todasImagens = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs.map((img, index) => ({
                index: index + 1,
                src: img.src,
                alt: img.alt,
                className: img.className,
                parentClassName: img.parentElement?.className || '',
                width: img.width,
                height: img.height
            })).filter(img => img.src && !img.src.includes('data:'));
        });
        
        console.log(`📸 Encontradas ${todasImagens.length} imagens:`);
        todasImagens.forEach((img, i) => {
            console.log(`${i + 1}. ${img.src.substring(0, 60)}...`);
            console.log(`   Alt: "${img.alt}"`);
            console.log(`   Class: "${img.className}"`);
            console.log(`   Parent: "${img.parentClassName}"`);
            console.log(`   Dimensões: ${img.width}x${img.height}`);
            console.log('');
        });
        
        // Buscar elementos com classes relacionadas a carrossel
        const elementosCarrossel = await page.evaluate(() => {
            const seletores = [
                '[class*="Carrousel"]',
                '[class*="carousel"]',
                '[class*="slider"]',
                '[class*="gallery"]',
                '[class*="image"]',
                '[class*="Image"]',
                '[data-testid*="indicator"]',
                '[class*="indicator"]'
            ];
            
            const elementos = [];
            
            seletores.forEach(seletor => {
                const els = document.querySelectorAll(seletor);
                els.forEach(el => {
                    elementos.push({
                        seletor: seletor,
                        tagName: el.tagName,
                        className: el.className,
                        id: el.id,
                        textContent: el.textContent?.substring(0, 50) || '',
                        childrenCount: el.children.length
                    });
                });
            });
            
            return elementos;
        });
        
        console.log(`🎠 Elementos relacionados a carrossel:`);
        elementosCarrossel.forEach((el, i) => {
            console.log(`${i + 1}. ${el.tagName} (${el.seletor})`);
            console.log(`   Class: "${el.className}"`);
            console.log(`   ID: "${el.id}"`);
            console.log(`   Children: ${el.childrenCount}`);
            console.log('');
        });
        
        // Tentar extrair estrutura HTML da área de imagens
        const htmlEstrutura = await page.evaluate(() => {
            // Buscar containers que podem ter imagens
            const possiveisContainers = [
                document.querySelector('[class*="product"]'),
                document.querySelector('[class*="gallery"]'),
                document.querySelector('[class*="image"]'),
                document.querySelector('main'),
                document.querySelector('.container')
            ].filter(el => el);
            
            return possiveisContainers.map(container => ({
                className: container.className,
                tagName: container.tagName,
                innerHTML: container.innerHTML.substring(0, 1000) + '...'
            }));
        });
        
        console.log(`📄 Estrutura HTML relevante:`);
        htmlEstrutura.forEach((estrutura, i) => {
            console.log(`${i + 1}. ${estrutura.tagName}.${estrutura.className}`);
            console.log(`HTML: ${estrutura.innerHTML.substring(0, 200)}...`);
            console.log('');
        });
        
        // Aguardar para observar a página
        console.log('⏸️ Aguardando 10 segundos para observação manual...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        return {
            sucesso: true,
            total_imagens: todasImagens.length,
            imagens: todasImagens,
            elementos_carrossel: elementosCarrossel,
            estrutura_html: htmlEstrutura
        };
        
    } catch (error) {
        console.error('❌ Erro:', error);
        return { sucesso: false, erro: error.message };
    } finally {
        await browser.close();
    }
}

// Executar exploração
if (require.main === module) {
    console.log('🔍 EXPLORAÇÃO DA ESTRUTURA DA PÁGINA');
    console.log('='.repeat(50));
    
    explorarEstruturaPagina('177776045')
        .then(resultado => {
            console.log('\n🏁 EXPLORAÇÃO CONCLUÍDA');
            if (resultado.sucesso) {
                console.log(`✅ ${resultado.total_imagens} imagens encontradas`);
                console.log(`✅ ${resultado.elementos_carrossel.length} elementos de carrossel encontrados`);
            }
        })
        .catch(error => {
            console.error('❌ Erro na exploração:', error);
        });
}

module.exports = { explorarEstruturaPagina };
