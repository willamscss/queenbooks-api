# 📚 QueenBooks Scraper & n8n Integration

Sistema completo de extração de dad## 📡 API Endpoints

### POST /buscar-produto ⚡
Busca básica por ID do QueenBooks (RÁPIDA - sem preços)
```json
{
  "id": "177776664"
}
```
**Resposta em ~1-2s** - Dados completos exceto preços
**✅ TESTADO E FUNCIONANDO NO N8N**

### POST /buscar-apenas-preco 💰
Busca APENAS preço (otimizada para velocidade)
```json
{
  "id": "177776664"
}
```
**Resposta em ~60s** - Apenas preço com autenticação
**✅ TESTADO E FUNCIONANDO NO N8N**m integração p## 📊 Resposta da API

### Endpoint básico: `/buscar-produto` ⚡ (1-2s)
```json
{
  "sucesso": true,
  "encontrado": true,
  "produto": {
    "id": "177775811",
    "codigo_isbn": "9781614287568",
    "titulo": "Dior By Gianfranco Ferre", 
    "preco": null,
    "categoria_sugerida": "Livros de Luxo",
    "informacoes": {
      "Editora": "Assouline",
      "Origem": "Importado",
      "Páginas": "317"
    }
  }
}
```

### Endpoint de preço: `/buscar-apenas-preco` 💰 (60s)
```json
{
  "sucesso": true,
  "encontrado": true,
  "autenticado": true,
  "produto": {
    "id": "177776664",
    "preco": 629.30,
    "preco_autenticado": 629.30
  }
}
```
**✅ TESTADO E FUNCIONANDO NO N8N**

### Endpoint de imagens: `/extrair-imagens` 🎠 (15s)
```json
{
  "sucesso": true,
  "produto_id": "177776045",
  "titulo": "Aspen Style",
  "total_imagens": 5,
  "imagens": [
    {
      "indice": 1,
      "url": "https://thumbnails.meuspedidos.com.br/PB2Wwl9C0N5oEafqg-33l2SOMqg=/fit-in/470x470/filters:fill(white)/https://arquivos.mercos.com/media/imagem_produto/370607/95a4976e-bc6d-11ee-9149-52262c5e7d3d.jpg",
      "alt": "Imagem do produto",
      "width": 400,
      "height": 400
    }
  ],
  "metodo": "carrossel_com_indicadores",
  "tempo_execucao": "15.95s"
}
```
**✅ NOVO ENDPOINT - TESTADO E FUNCIONANDO NO N8N** 🎠

### 🔐 Endpoint completo: `/buscar-produto-com-preco` (45-60s) n8n workflows.

## 🚀 Características

✅ **Busca Direta por ID** - Extração otimizada de produtos
✅ **API REST para n8n** - Integração completa com workflows
✅ **Análise de Dropshipping** - Recomendações automáticas de margem
✅ **Template Automation** - Geração automática de templates
✅ **Batch Processing** - Busca múltiplos produtos simultaneamente

## 🔧 Instalação e Uso

### 1. Instalação
```bash
cd projetos/queenbooks-scraper
npm install
```

### 2. Busca Manual
```bash
# Buscar produto por ID (recomendado)
node busca-real.js

# Processar templates
node assistente-manual.js
```

### 3. Servidor n8n (Produção)
```bash
# Iniciar em produção (recomendado)
./start-production.sh

# Ou manualmente
npm run n8n

# Ou desenvolvimento
node server-simple.js
```

## 📡 API Endpoints

### POST /buscar-produto ⚡
Busca básica por ID do QueenBooks (RÁPIDA - sem preços)
```json
{
  "id": "177775811"
}
```
**Resposta em ~1s** - Dados completos exceto preços

### POST /buscar-apenas-preco �
Busca APENAS preço (otimizada para velocidade)
```json
{
  "id": "177775811"
}
```
**Resposta em ~15-30s** - Apenas preço com autenticação

### POST /buscar-produto-com-preco 🔐
Busca completa com preços e informações (mais lenta)
```json
{
  "id": "177775811"
}
```
**Resposta em ~45-60s** - Dados completos com preços

### POST /buscar-produtos-batch  
Busca múltiplos produtos (máx 10)
```json
{
  "ids": ["177775811", "123456789"],
  "usar_autenticacao": true
}
```

### POST /extrair-imagens 🎠
Extrai todas as imagens do carrossel do produto (otimizada)
```json
{
  "id": "177776045"
}
```
**Resposta em ~15s** - Todas as imagens do carrossel
**✅ TESTADO E FUNCIONANDO NO N8N** 🎠

### GET /health
Health check do servidor

### GET /status
Status e documentação da API

## � Sistema de Autenticação

### Como funciona:
1. **UI Automation**: Sistema clica no botão "ACESSE PARA COMPRAR"
2. **Auto-login**: Redirecionamento automático para `/entrar` e preenchimento de credenciais
3. **Price Extraction**: Retorno à página do produto com usuário logado para extrair preços
4. **Headless Mode**: Funciona sem interface gráfica para deploy em servidores

### Configuração de Credenciais:
```bash
# Via variáveis de ambiente (recomendado para produção)
export QUEENBOOKS_USERNAME="seu_email"
export QUEENBOOKS_PASSWORD="sua_senha"

# Via código (apenas desenvolvimento)
const searcher = new QueenBooksBotaoLoginSearcher({
  username: "seu_email",
  password: "sua_senha",
  headless: true // true para produção, false para debug
});
```

### Modos de Operação:
- **Debug Mode**: `headless: false` - Mostra navegador para desenvolvimento
- **Production Mode**: `headless: true` - Sem interface gráfica para servidores

## �📊 Resposta da API

### Endpoint sem autenticação: `/buscar-produto`
```json
{
  "sucesso": true,
  "encontrado": true,
  "produto": {
    "id": "177775811",
    "codigo_isbn": "9781614287568",
    "titulo": "Dior By Gianfranco Ferre",
    "preco": null,
    "categoria_sugerida": "Livros de Luxo",
    "informacoes": {
      "Editora": "Assouline",
      "Origem": "Importado",
      "Páginas": "317"
    }
  }
}
```

### 🔐 Endpoint com preços: `/buscar-produto-com-preco`
```json
{
  "sucesso": true,
  "encontrado": true,
  "autenticado": true,
  "sessao_persistente": true,
  "produto": {
    "id": "177776045",
    "codigo_isbn": "9781614286226", 
    "titulo": "Aspen Style",
    "preco": 629.30,
    "preco_autenticado": 629.30,
    "categoria_sugerida": "Livros de Luxo",
    "dropshipping": {
      "adequado_dropshipping": true,
      "margem_sugerida": "20-35%",
      "publico_alvo": "Colecionadores de livros de luxo",
      "preco_base": 629.30
    },
    "informacoes": {
      "ISBN": "9781614286226",
      "Editora": "Assouline",
      "Autor": "Aerin Lauder",
      "Origem": "Importado"
    }
  },
  "tempo_execucao": "45.28s"
}
```

## 🔗 Integração n8n

1. **Webhook Node** - Receber solicitações
2. **HTTP Request Node** - Chamar API QueenBooks
3. **IF Node** - Verificar sucesso
4. **Set Node** - Processar dados
5. **Response Node** - Retornar resultado

Ver: `n8n-workflow-example.json` para template completo

## 📝 Documentação

- `N8N-INTEGRATION.md` - Documentação completa da API
- `GUIA-RAPIDO-N8N.md` - Guia rápido de integração
- `n8n-workflow-example.json` - Workflow de exemplo

## 🎯 Casos de Uso

- **E-commerce Automation** - Importação automática de produtos
- **Price Monitoring** - Monitoramento de preços
- **Inventory Management** - Gestão de estoque
- **Dropshipping Analysis** - Análise de viabilidade

## ✅ Status

- ✅ Sistema de busca funcionando
- ✅ API REST integrada e testada
- ✅ **Integração n8n operacional e TESTADA** ✅
- ✅ Deploy permanente no Railway
- ✅ **Sessão persistente com preços implementada** 🔐
- ✅ URL pública e permanente: https://meu-codex-production.up.railway.app
- ✅ **Endpoint básico: /buscar-produto (1-2s)** ⚡
- ✅ **Endpoint de preços: /buscar-apenas-preco (60s)** 💰
- ✅ **Endpoint de imagens: /extrair-imagens (15s)** 🎠 **TESTADO NO N8N**
- ✅ **Sistema de botão "ACESSE PARA COMPRAR" funcionando** 🎯
- ✅ **Extração de preços via UI automatizada** 🤖
- ✅ **Testado com múltiplos produtos (629,30 e 350,00)** ✅
- ✅ **Modo headless para produção (sem interface gráfica)** 🖥️
- ✅ **TESTADO E FUNCIONANDO NO N8N** 🔄
- ✅ **Sistema pronto para deploy em servidores** 🚀
- ✅ Documentação completa
- ✅ **PRONTO PARA PRODUÇÃO** 🚀

## 🚀 Produção

### API Railway (Recomendado)
```bash
# URL Permanente da API
https://meu-codex-production.up.railway.app/buscar-produto

# Endpoints disponíveis:
GET  /health                         # Health check
GET  /status                         # Documentação  
POST /buscar-produto                 # Busca individual (sem preços) ⚡
POST /buscar-apenas-preco            # Busca APENAS preços 💰  
POST /extrair-imagens                # Extrai imagens do carrossel 🎠
POST /buscar-produto-com-preco       # Busca completa (legado) 🔐
POST /buscar-produtos-batch          # Busca múltipla
```

**🎉 SISTEMA COMPLETO TESTADO E OPERACIONAL NO N8N!**
**🆕 NOVO ENDPOINT DE IMAGENS TAMBÉM VALIDADO!**

### Desenvolvimento Local
```bash
# Script automatizado
./start-production.sh

# Comandos PM2 úteis
pm2 status              # Ver status
pm2 logs queenbooks-api # Ver logs  
pm2 restart queenbooks-api # Reiniciar
pm2 stop queenbooks-api    # Parar
```