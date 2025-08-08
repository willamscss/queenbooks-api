const QueenBooksBotaoLoginSearcher = require('./QueenBooksBotaoLoginSearcher');

async function testarExtracao() {
    console.log('🎠 TESTE DE EXTRAÇÃO DE IMAGENS');
    console.log('='.repeat(50));
    
    const searcher = new QueenBooksBotaoLoginSearcher({
        headless: false, // Vamos ver o que acontece
        debug: true
    });
    
    try {
        const resultado = await searcher.extrairImagensCarrossel('177776045');
        
        console.log('\n📋 RESULTADO FINAL:');
        console.log(JSON.stringify(resultado, null, 2));
        
        if (resultado.sucesso) {
            console.log(`\n✅ Sucesso! ${resultado.total_imagens} imagens extraídas`);
            console.log(`📖 Produto: ${resultado.titulo}`);
            console.log(`💰 Preço: ${resultado.preco || 'N/A'}`);
            console.log(`🔧 Método: ${resultado.metodo}`);
            
            console.log('\n🖼️ IMAGENS ENCONTRADAS:');
            resultado.imagens.forEach((img, index) => {
                console.log(`${index + 1}. ${img.url}`);
                console.log(`   Alt: "${img.alt}"`);
                console.log(`   Dimensões: ${img.width}x${img.height}`);
                console.log('');
            });
        } else {
            console.log(`❌ Falha: ${resultado.erro}`);
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

// Executar teste
testarExtracao();
