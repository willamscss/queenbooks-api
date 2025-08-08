# 🔐 Sistema de Autenticação QueenBooks

## 📋 Visão Geral

Sistema completo de automação para autenticação no QueenBooks usando Puppeteer, permitindo extração de preços reais através de interface automatizada.

## 🚀 Como Funciona

### 1. **UI Automation Workflow**
```
Página do Produto → Botão "ACESSE PARA COMPRAR" → Página /entrar → Login → Volta ao Produto → Extrai Preços
```

### 2. **Processo Detalhado**
1. **Navegação**: Acessa página do produto via ID
2. **Detecção**: Localiza botão "ACESSE PARA COMPRAR"  
3. **Clique**: Executa clique automatizado no botão
4. **Redirecionamento**: Aguarda redirecionamento para `/entrar`
5. **Preenchimento**: Preenche email e senha automaticamente
6. **Submit**: Submete formulário de login
7. **Retorno**: Volta à página do produto com usuário logado
8. **Extração**: Busca preços com usuário autenticado

## ⚙️ Configuração

### **Variáveis de Ambiente (Recomendado)**
```bash
export QUEENBOOKS_USERNAME="seu_email@exemplo.com"
export QUEENBOOKS_PASSWORD="sua_senha_segura"
```

### **Configuração no Código**
```javascript
const QueenBooksBotaoLoginSearcher = require('./QueenBooksBotaoLoginSearcher');

const searcher = new QueenBooksBotaoLoginSearcher({
  username: "seu_email@exemplo.com",
  password: "sua_senha_segura",
  headless: true,  // true para produção, false para debug
  debug: false     // true para logs detalhados
});

await searcher.init();
const produto = await searcher.buscarProdutoComPreco("177776045");
await searcher.close();
```

## 🖥️ Modos de Operação

### **Debug Mode (Desenvolvimento)**
```javascript
const searcher = new QueenBooksBotaoLoginSearcher({
  headless: false,  // Mostra navegador
  debug: true       // Logs detalhados
});
```
- **Vantagens**: Visualização do processo, debugging fácil
- **Uso**: Desenvolvimento e testes locais

### **Production Mode (Servidor)**
```javascript
const searcher = new QueenBooksBotaoLoginSearcher({
  headless: true,   // Sem interface gráfica
  debug: false      // Logs essenciais
});
```
- **Vantagens**: Sem interface, menor consumo de recursos
- **Uso**: Deploy em servidores, Railway, VPS

## 📊 Exemplo de Uso Completo

```javascript
const QueenBooksBotaoLoginSearcher = require('./QueenBooksBotaoLoginSearcher');

async function exemploCompleto() {
  const searcher = new QueenBooksBotaoLoginSearcher({
    // Credenciais via env vars ou direto
    username: process.env.QUEENBOOKS_USERNAME,
    password: process.env.QUEENBOOKS_PASSWORD,
    
    // Configurações de execução
    headless: true,   // Produção
    debug: false      // Menos logs
  });

  try {
    // Inicializar browser
    await searcher.init();
    
    // Buscar produto com preços
    const produto = await searcher.buscarProdutoComPreco("177776045");
    
    console.log(`Título: ${produto.titulo}`);
    console.log(`Preço: R$ ${produto.preco}`);
    console.log(`Encontrado: ${produto.encontrado}`);
    
    return produto;
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    // Sempre fechar browser
    await searcher.close();
  }
}

exemploCompleto();
```

## 🔍 Seletores e Estratégias

### **Detecção do Botão**
```javascript
// Busca por múltiplos seletores
const seletores = [
  'button:contains("ACESSE PARA COMPRAR")',
  '.b2b-button:contains("ACESSE")',
  '.AddToCartContainer__buyButtonNotAuthenticated'
];

// Busca manual no DOM
const botoes = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('button')).map(btn => ({
    text: btn.textContent,
    className: btn.className
  }));
});
```

### **Preenchimento de Login**
```javascript
// Email
await page.waitForSelector('input[type="email"]', { timeout: 5000 });
await page.type('input[type="email"]', credentials.username);

// Senha  
await page.waitForSelector('input[type="password"]', { timeout: 5000 });
await page.type('input[type="password"]', credentials.password);

// Submit
await page.click('button[type="submit"]');
```

### **Extração de Preços**
```javascript
const dadosPreco = await page.evaluate(() => {
  const seletoresPreco = [
    '.price-value',
    '.product-price', 
    '[class*="price"]',
    '.valor',
    '.preco'
  ];
  
  for (const seletor of seletoresPreco) {
    const elemento = document.querySelector(seletor);
    if (elemento && elemento.textContent.includes('R$')) {
      return {
        preco: elemento.textContent,
        seletor_usado: seletor
      };
    }
  }
});
```

## 🎯 Casos de Uso

### **1. API Endpoint**
```javascript
app.post('/buscar-produto-com-preco', async (req, res) => {
  const { id } = req.body;
  const searcher = new QueenBooksBotaoLoginSearcher({ headless: true });
  
  try {
    await searcher.init();
    const produto = await searcher.buscarProdutoComPreco(id);
    res.json({ sucesso: true, produto });
  } finally {
    await searcher.close();
  }
});
```

### **2. Batch Processing**
```javascript
async function processarLista(ids) {
  const searcher = new QueenBooksBotaoLoginSearcher({ headless: true });
  await searcher.init();
  
  const resultados = [];
  for (const id of ids) {
    const produto = await searcher.buscarProdutoComPreco(id);
    resultados.push(produto);
    
    // Delay entre requisições
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  await searcher.close();
  return resultados;
}
```

### **3. Monitoramento de Preços**
```javascript
async function monitorarPreco(id, intervalMinutos = 60) {
  setInterval(async () => {
    const searcher = new QueenBooksBotaoLoginSearcher({ headless: true });
    
    try {
      await searcher.init();
      const produto = await searcher.buscarProdutoComPreco(id);
      
      console.log(`[${new Date().toISOString()}] ${produto.titulo}: R$ ${produto.preco}`);
      
    } finally {
      await searcher.close();
    }
  }, intervalMinutos * 60 * 1000);
}
```

## 🚨 Considerações Importantes

### **Performance**
- **Tempo médio**: 45-60 segundos por produto
- **Inicialização**: ~5 segundos (browser startup)
- **Login**: ~10-15 segundos (redirecionamento + auth)
- **Extração**: ~5-10 segundos (parsing + data)

### **Recursos do Sistema**
- **RAM**: ~100-200MB por instância do browser
- **CPU**: Médio uso durante execução
- **Rede**: ~5-10MB por busca (imagens + assets)

### **Limitações**
- **Rate Limiting**: Aguardar 2-5 segundos entre requisições
- **Sessão**: Não persiste entre instâncias (login a cada execução)
- **Concurrent**: Uma instância por vez (browser locking)

### **Segurança**
- **Credenciais**: Sempre usar variáveis de ambiente
- **Logs**: Não logar senhas nos outputs
- **Timeout**: Configurar timeouts para evitar hang

## ✅ Testes

### **Teste Local com Interface**
```bash
node testar-botao-login.js
```

### **Teste Produção (Headless)**
```bash
node testar-modo-producao.js
```

### **Teste Endpoint Local**
```bash
node testar-endpoint-local.js
```

## 🔗 Integração com APIs

### **n8n Workflow**
```json
{
  "nodes": [
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://meu-codex-production.up.railway.app/buscar-produto-com-preco",
        "method": "POST",
        "body": {
          "id": "{{ $json.produto_id }}"
        }
      }
    }
  ]
}
```

### **cURL Example**
```bash
curl -X POST https://meu-codex-production.up.railway.app/buscar-produto-com-preco \
  -H "Content-Type: application/json" \
  -d '{"id": "177776045"}'
```

## 📈 Roadmap

### **Próximas Melhorias**
- [ ] **Session Persistence**: Manter login entre chamadas
- [ ] **Parallel Processing**: Múltiplas instâncias simultâneas  
- [ ] **Cache System**: Cache de resultados por TTL
- [ ] **Retry Logic**: Retry automático em falhas
- [ ] **Metrics**: Monitoring de performance e sucesso
- [ ] **Database**: Persistência de resultados

### **Otimizações Futuras**
- [ ] **Stealth Mode**: Anti-detection techniques
- [ ] **Proxy Rotation**: IP rotation para scale
- [ ] **Headless Optimization**: Redução de footprint
- [ ] **Error Recovery**: Auto-recovery de estados inválidos

---

## 💡 **Conclusão**

O sistema de autenticação fornece uma solução robusta e automatizada para extração de preços do QueenBooks, combinando:

- **UI Automation** com Puppeteer
- **Dual Mode** (debug/production)
- **Error Handling** robusto
- **API Integration** pronta
- **Deployment Ready** para servidores

Resultado: **Acesso completo aos preços reais** de forma automatizada e escalável! 🚀
