# 🚀 DEPLOY RAILWAY - SETUP RÁPIDO

## 📋 Pré-requisitos
- Conta no GitHub (já tem)
- Conta no Railway.app (criar grátis)

## 🔧 Passo a Passo

### 1. Preparar Projeto
```bash
# Já está pronto! Só precisa de um arquivo:
echo "web: node server-simple.js" > Procfile
echo "PORT=\$PORT" > .env
```

### 2. Criar Conta Railway
1. Acesse: https://railway.app
2. Login com GitHub
3. Autorizar acesso aos repos

### 3. Deploy
1. Click "New Project"
2. "Deploy from GitHub repo"
3. Selecionar: `meu-codex`
4. Subfolder: `projetos/queenbooks-scraper`
5. Deploy automático!

### 4. Configurar Variáveis (se necessário)
```bash
# No Railway dashboard:
PORT=3000
NODE_ENV=production
```

### 5. Obter URL
```
# Exemplo de URL gerada:
https://meu-codex-production.railway.app/buscar-produto
```

## ✅ Resultado
- ✅ URL fixa e permanente
- ✅ HTTPS automático
- ✅ Deploy automático a cada push
- ✅ Logs integrados
- ✅ Monitoramento incluído

## 💰 Custo
- Gratuito para 500h/mês
- ~$5/mês se exceder (muito difícil)

## 🔄 Atualização no n8n
Só trocar a URL do ngrok pela URL fixa do Railway!
