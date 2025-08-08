# 🚀 GUIA: RECRIAR PROJETO RAILWAY - QUEENBOOKS API

## ✅ CÓDIGO PRONTO
Todos os endpoints estão funcionais e testados localmente. O código está no GitHub atualizado.

## 📋 PASSO A PASSO

### 1. DELETAR PROJETO ATUAL (se necessário)
- Acesse Railway Dashboard
- Delete o projeto `meu-codex` atual que está com problemas

### 2. CRIAR NOVO PROJETO
- Acesse: https://railway.app/dashboard
- Clique em "New Project"
- Selecione "Deploy from GitHub repo"
- Escolha: `willamscss/meu-codex`

### 3. CONFIGURAR DIRETÓRIO (CRÍTICO!)
**MUITO IMPORTANTE**: Configure o diretório de trabalho corretamente:

- No Railway, vá em **Settings → Environment**
- Adicione a variável: `RAILWAY_RUN_UID` = `projetos/queenbooks-scraper`
- OU vá em **Settings → Build** e configure:
  - **Root Directory**: `projetos/queenbooks-scraper`
  - **Build Command**: `npm ci`
  - **Start Command**: `node server-persistent.js`

### 4. CONFIGURAR VARIÁVEIS DE AMBIENTE
**IMPORTANTE**: Configure estas variáveis exatamente:

```
NODE_ENV=production
PORT=3000
QUEENBOOKS_USERNAME=willamscss@outlook.com  
QUEENBOOKS_PASSWORD=618536
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

### 5. CONFIGURAR BUILD/START (CRÍTICO!)
**MUITO IMPORTANTE**: Configure corretamente no Railway:

- Vá em **Settings → Build**
- **Root Directory**: `projetos/queenbooks-scraper`
- **Build Command**: `npm ci`
- **Start Command**: `node server-persistent.js`

**OU** se não tiver opção Root Directory:
- **Settings → Environment**
- Adicione: `RAILWAY_RUN_UID` = `projetos/queenbooks-scraper`

### 6. DEPLOY
- O Railway fará deploy automático
- Aguarde finalizar (~3-5 minutos)

## 🛠️ SOLUÇÃO DEFINITIVA - REPOSITÓRIO SEPARADO

**RECOMENDAÇÃO**: Devido aos problemas com subdiretório, vamos criar um repositório específico:

### CRIAR REPOSITÓRIO NOVO (RECOMENDADO)
1. Crie repositório: `queenbooks-api` no GitHub
2. Copie APENAS o conteúdo de `projetos/queenbooks-scraper` 
3. Faça deploy desse repositório limpo no Railway

### COMANDO PARA CRIAR REPOSITÓRIO SEPARADO:
```bash
# Criar novo repositório local
git clone https://github.com/willamscss/meu-codex.git temp-repo
cd temp-repo/projetos/queenbooks-scraper

# Criar novo repositório apenas com nossa API
git init
git add .
git commit -m "🚀 QueenBooks API - Deploy Railway"

# Conectar ao novo repositório (crie no GitHub primeiro)
git remote add origin https://github.com/willamscss/queenbooks-api.git
git push -u origin main
```

Depois faça deploy no Railway usando `queenbooks-api` (sem subdiretórios).

## 🎯 ENDPOINTS PARA N8N

Após deploy bem-sucedido, use estes endpoints no n8n:

### 🔍 BUSCA BÁSICA (RÁPIDA)
```
POST https://[URL-RAILWAY]/buscar-produto
Content-Type: application/json

{
  "id": "177775811"
}
```

### 💰 BUSCA COM PREÇOS  
```
POST https://[URL-RAILWAY]/buscar-produto-com-preco
Content-Type: application/json

{
  "id": "177775811"
}
```

### 📦 VERIFICAR ESTOQUE (NOVO)
```
POST https://[URL-RAILWAY]/verificar-estoque
Content-Type: application/json

{
  "id": "177776741"
}
```

### 📦 ESTOQUE MÚLTIPLO
```
POST https://[URL-RAILWAY]/verificar-estoque
Content-Type: application/json

{
  "ids": ["177776741", "177776553", "207737053"]
}
```

### 🚀 ESTOQUE RÁPIDO (GET)
```
GET https://[URL-RAILWAY]/estoque/177776741
```

## 🧪 TESTE APÓS DEPLOY

1. Health Check:
```bash
curl https://[URL-RAILWAY]/health
```

2. Teste estoque:
```bash
curl -X POST https://[URL-RAILWAY]/verificar-estoque \
  -H "Content-Type: application/json" \
  -d '{"id": "177776741"}'
```

## ✅ RESPOSTA ESPERADA ESTOQUE

```json
{
  "sucesso": true,
  "tempo_execucao": "45.23s",
  "produto": {
    "id": "177776741",
    "titulo": "Título do produto",
    "preco": "R$ XX,XX",
    "estoque_disponivel": 12,
    "unidades_disponiveis": "12 unidades em estoque",
    "pode_comprar": true
  }
}
```

## 🔧 TROUBLESHOOTING

**❌ ERRO "OpenAI API Key missing":**
- Indica que o Railway está executando `index.js` da raiz
- **SOLUÇÃO**: Configure Root Directory como `projetos/queenbooks-scraper`

**❌ ERRO 502 Bad Gateway:**
1. Verifique se as variáveis de ambiente estão corretas
2. Vá em Settings → Logs para ver erros
3. Confirme que Root Directory está configurado como `projetos/queenbooks-scraper`
4. Verifique se Start Command é `node server-persistent.js`

**❌ ERRO "Cannot find module":**
- Indica diretório errado
- Configure Root Directory: `projetos/queenbooks-scraper`

## 📱 NOTIFICAÇÃO
Depois do deploy, me avise a URL do Railway para testarmos juntos!
