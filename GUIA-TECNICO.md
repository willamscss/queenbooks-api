# 📚 Guia Técnico Completo - QueenBooks Scraper & n8n Integration

## 🎯 Visão Geral do Projeto

Sistema completo de automação para extração de dados do site QueenBooks, com API REST integrada ao n8n para workflows automatizados de e-commerce e dropshipping.

## 🛠️ Stack Tecnológica

### 📋 **1. Node.js & JavaScript**

**O que é:** Runtime JavaScript server-side
**Função no projeto:** Base de toda aplicação
**Por que usar:** 
- Excelente para web scraping
- Ecosystem npm rico
- Async/await nativo para operações I/O

**Arquivos relacionados:**
- `busca-real.js` - Core do scraping
- `server-simple.js` - API REST
- `server-n8n.js` - Servidor completo
- `assistente-manual.js` - Processamento de templates
- `QueenBooksBotaoLoginSearcher.js` - Sistema de autenticação UI
- `testar-modo-producao.js` - Testes headless
- `testar-botao-login.js` - Testes com interface

---

### 🌐 **2. Express.js**

**O que é:** Framework web minimalista para Node.js
**Função no projeto:** Criar API REST para integração com n8n
**Características principais:**
- Roteamento HTTP (GET, POST)
- Middleware para CORS, JSON parsing, logging
- Endpoints `/buscar-produto`, `/extrair-imagens`, `/health`, `/status`

**Código exemplo:**
```javascript
const express = require('express');
const app = express();

app.post('/buscar-produto', async (req, res) => {
  const { id } = req.body;
  const produto = await searcher.buscarPorIdSite(id);
  res.json(produto);
});
```

---

### 🕷️ **3. Axios**

**O que é:** Cliente HTTP para Node.js e browsers
**Função no projeto:** Fazer requisições para o site QueenBooks
**Vantagens:**
- Promise-based
- Interceptors para request/response
- Timeout configurável
- Headers customizáveis

**Uso no projeto:**
```javascript
const response = await axios.get(url, {
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0...'
  }
});
```

---

### 📁 **4. fs-extra**

**O que é:** Extensão do módulo `fs` nativo com funcionalidades extras
**Função no projeto:** Manipulação de arquivos JSON
**Funcionalidades usadas:**
- `ensureDir()` - Criar diretórios se não existirem
- `writeJSON()` - Salvar dados em JSON
- `readJSON()` - Ler arquivos JSON
- Operações síncronas e assíncronas

---

### ⚙️ **5. PM2 (Process Manager)**

**O que é:** Production process manager para aplicações Node.js
**Função no projeto:** Manter API rodando em produção
**Características:**
- Auto-restart em caso de crash
- Load balancing
- Monitoramento de CPU/Memory
- Logs centralizados
- Zero-downtime deployment

**Comandos usados:**
```bash
pm2 start server-simple.js --name "queenbooks-api"
pm2 status
pm2 logs queenbooks-api
pm2 restart queenbooks-api
```

---

### 🔗 **6. n8n (Workflow Automation)**

**O que é:** Ferramenta de automação de workflows visual
**Função no projeto:** Criar automações usando dados do QueenBooks
**Integrações possíveis:**
- HTTP Request Nodes para chamar nossa API
- Webhook Nodes para receber dados
- Conditional Nodes para lógica de negócio
- Database Nodes para persistência
- Email/Slack Nodes para notificações

**Workflow típico:**
```
Webhook → HTTP Request (QueenBooks) → IF (produto encontrado?) → Database/Email
```

---

### 🌐 **7. ngrok**

**O que é:** Ferramenta para criar túneis públicos para localhost
**Função no projeto:** Permitir que n8n na VPS acesse API local
**Por que necessário:** 
- n8n rodando na Hostinger VPS
- API rodando localmente no Mac
- VPS não consegue acessar localhost diretamente

**Uso:**
```bash
ngrok http 3000
# Gera: https://abc123.ngrok-free.app → localhost:3000
```

---

### 🤖 **8. Puppeteer (Browser Automation)**

**O que é:** Biblioteca Node.js para controlar navegadores Chrome/Chromium
**Função no projeto:** Automação completa da UI para autenticação e extração de preços
**Características:**
- Headless e visual modes
- Manipulação de DOM real
- Execução de JavaScript no browser
- Screenshot e PDF generation

**Uso no projeto:**
```javascript
const puppeteer = require('puppeteer');

const browser = await puppeteer.launch({
  headless: "new", // Modo produção
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

// Automação do botão "ACESSE PARA COMPRAR"
await page.click('.b2b-button');
await page.waitForNavigation();
```

**Configurações por ambiente:**
- **Debug**: `headless: false` - Interface visual para desenvolvimento
- **Produção**: `headless: "new"` - Sem interface para servidores

---

### 🎠 **9. Carousel Image Extraction (Novo)**

**O que é:** Sistema avançado de extração de imagens de carrosséis interativos
**Função no projeto:** Capturar todas as imagens de produtos automaticamente
**Endpoint:** `POST /extrair-imagens`

**Tecnologias envolvidas:**
- **Puppeteer**: Navegação e cliques nos indicadores
- **DOM Manipulation**: Detecção de elementos do carrossel
- **Image Processing**: Extração de URLs e metadados

**Fluxo técnico:**
```javascript
// 1. Detectar indicadores do carrossel
const indicadores = await page.$$('[data-testid="indicator-item"]');

// 2. Iterar por cada indicador
for (let i = 0; i < indicadores.length; i++) {
  await indicadores[i].click();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 3. Extrair imagem atual
  const imagemInfo = await page.evaluate(() => {
    const img = document.querySelector('.Carrousel__imageContainer___9tur5 img');
    return {
      src: img.src,
      alt: img.alt,
      width: img.width,
      height: img.height
    };
  });
}
```

**Características técnicas:**
- **Detecção automática**: Identifica carrosséis por múltiplos seletores
- **Filtro de duplicatas**: Remove imagens repetidas automaticamente  
- **Fallback robusto**: Busca direta se não houver carrossel
- **Performance otimizada**: 15-19 segundos para 4-5 imagens
- **Metadados completos**: URLs, dimensões, alt text, índices

**Resposta estruturada:**
```json
{
  "sucesso": true,
  "produto_id": "177776045",
  "titulo": "Aspen Style",
  "total_imagens": 5,
  "imagens": [
    {
      "indice": 1,
      "url": "https://thumbnails.meuspedidos.com.br/...",
      "alt": "Imagem do produto",
      "width": 400,
      "height": 400
    }
  ],
  "metodo": "carrossel_com_indicadores",
  "tempo_execucao": "15.95s"
}
```

---

### 🕸️ **9. Web Scraping Techniques**

**Técnicas utilizadas:**

#### **9.1 Browser Automation com Puppeteer**
```javascript
// Clique automatizado em botões
await page.click('button:contains("ACESSE PARA COMPRAR")');

// Preenchimento de formulários
await page.type('input[type="email"]', credentials.username);
await page.type('input[type="password"]', credentials.password);

// Navegação e aguardo
await page.goto(url, { waitUntil: 'networkidle0' });
await page.waitForSelector('.price-selector');
```

#### **9.2 Direct URL Construction**
```javascript
const url = `https://www.queenbooks.com.br/produtos/${idSite}`;
```

#### **9.3 HTML Parsing com RegEx**
```javascript
const tituloMatch = html.match(/<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>(.*?)<\/h1>/i);
const titulo = tituloMatch ? tituloMatch[1].trim() : '';
```

#### **9.4 Data Extraction Patterns**
- Títulos via `<h1>` tags
- Preços via classes específicas  
- Imagens via `<img>` src attributes
- Metadados via patterns estruturados

#### **9.5 Error Handling & Timeouts**
```javascript
try {
  const response = await axios.get(url, { timeout: 15000 });
} catch (error) {
  if (error.code === 'ECONNABORTED') {
    // Handle timeout
  }
}
```

---

### 📊 **10. Data Processing & Analysis**

#### **10.1 Dropshipping Analysis Engine**
```javascript
analisarDropshipping(produto) {
  const editora = produto.informacoes.Editora?.toLowerCase();
  
  if (editora.includes('assouline')) {
    return {
      adequado: true,
      margem_sugerida: '20-35%',
      publico_alvo: 'Colecionadores de livros de luxo'
    };
  }
}
```

#### **10.2 Category Classification**
```javascript
determinarCategoria(produto) {
  const titulo = produto.titulo.toLowerCase();
  if (titulo.includes('fashion')) return 'Moda & Estilo';
  if (titulo.includes('art')) return 'Arte';
  return 'Livros Importados';
}
```

---

### 🐳 **11. Containerization & Deployment**

**Docker (preparado para):**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server-simple.js"]
```

**VPS Deployment:**
- Hostinger VPS (onde roda o n8n)
- EasyPanel para container management
- Docker networking para isolamento

---

### 🔒 **12. CORS & Security**

**CORS Configuration:**
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

**Security Headers:**
- User-Agent spoofing para evitar bloqueios
- Rate limiting via delays
- Error handling sem exposição de dados internos

---

### 📝 **13. Logging & Monitoring**

**Structured Logging:**
```javascript
console.log(`🔄 ${timestamp} - ${req.method} ${req.path} from ${clientIP}`);
console.log(`📦 Body: ${JSON.stringify(req.body, null, 2)}`);
```

**Health Checks:**
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'queenbooks-n8n-simple'
  });
});
```

---

### 🔄 **14. JSON Data Management**

**Data Structures:**

#### **Produto Real:**
```json
{
  "idSite": "177775811",
  "titulo": "Dior By Gianfranco Ferre",
  "codigoIsbn": "9781614287568",
  "informacoes": {
    "Editora": "Assouline",
    "Origem": "Importado"
  },
  "encontradoEm": "2025-07-13T18:00:00.000Z"
}
```

#### **Template Processado:**
```json
{
  "codigo": "9781614287568",
  "categoria": "Livros de Luxo",
  "dropshipping": {
    "adequado": true,
    "margem_sugerida": "20-35%"
  }
}
```

---

### 🧠 **15. Business Logic & Algorithms**

#### **16.1 Product Matching Algorithm**
1. Extract product ID from URL or input
2. Construct direct product URL
3. Fetch HTML content
4. Parse title, price, metadata
5. Apply business rules (category, dropshipping viability)
6. Generate structured response

#### **16.2 Category Intelligence**
```javascript
// Publishers mapping to categories
const publisherCategories = {
  'assouline': 'Livros de Luxo',
  'taschen': 'Arte & Design',
  'phaidon': 'Arte Contemporânea'
};
```

#### **16.3 Price Analysis**
- Currency detection (R$, USD)
- Price range classification
- Margin calculation for dropshipping
- Competition level assessment

---

### 🚀 **16. DevOps & Operations**

#### **16.1 Process Management**
- PM2 para production deployment
- Auto-restart em caso de falhas
- Graceful shutdown handling
- Memory leak monitoring

#### **16.2 Environment Management**
```bash
# Development
node server-simple.js

# Production
./start-production.sh

# Testing
npm test
```

#### **16.3 Git Workflow**
```bash
# Feature development
git checkout -b feature/n8n-integration

# Clean commits
git commit -m "feat: Add n8n integration endpoints"

# Production deployment
git push origin main
```

---

## 🎓 **Conhecimentos Técnicos Aplicados**

### **Backend Development:**
- RESTful API design
- Asynchronous programming (async/await)
- Error handling patterns
- Middleware architecture

### **Web Scraping:**
- HTTP request optimization
- HTML parsing techniques
- Anti-bot evasion strategies
- Rate limiting implementation

### **System Architecture:**
- Microservices separation (scraper vs API)
- Process management
- Container readiness
- Monitoring & observability

### **Integration Patterns:**
- Webhook handling
- JSON API responses
- Cross-platform compatibility
- VPS networking solutions

### **Production Operations:**
- Zero-downtime deployment
- Health monitoring
- Log management
- Backup strategies

---

## 📈 **Escalabilidade e Futuro**

### **Possíveis Melhorias:**
1. **Database Integration:** PostgreSQL/MongoDB para persistência
2. **Cache Layer:** Redis para responses frequentes
3. **Queue System:** Bull/Bee-Queue para processamento batch
4. **Authentication:** JWT para API security
5. **Metrics:** Prometheus + Grafana para monitoring
6. **CI/CD:** GitHub Actions para deployment automático

### **Arquitetura Avançada:**
```
Load Balancer → API Gateway → Microservices → Database
     ↓              ↓           ↓              ↓
   nginx         Express    Scraper/n8n    PostgreSQL
```

---

## ✅ **Conclusão**

Este projeto demonstra uma stack moderna e escalável para automação de e-commerce, combinando:

- **Backend robusto** (Node.js + Express)
- **Web scraping eficiente** (Axios + parsing patterns)
- **Automação workflows** (n8n integration)
- **Deployment production-ready** (PM2 + VPS)
- **Networking solutions** (ngrok tunneling)

O resultado é um sistema que pode processar milhares de produtos, integrar-se com qualquer workflow n8n, e escalar conforme necessário para operações comerciais reais.
