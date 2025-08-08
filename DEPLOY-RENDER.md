# 🆓 DEPLOY RENDER.COM - 100% GRATUITO

## 🚀 Deploy Automático no Render

### 1. Criar Conta (Gratuita)
1. Acesse: https://render.com
2. Signup com GitHub (grátis)
3. Autorizar acesso aos repos

### 2. Criar Web Service
1. Dashboard → **"New Web Service"**
2. **Connect Repository:** `meu-codex`
3. **Root Directory:** `projetos/queenbooks-scraper`
4. **Environment:** `Node`
5. **Build Command:** `npm install`
6. **Start Command:** `node server-simple.js`

### 3. Configurações Automáticas
- ✅ Build automático do GitHub
- ✅ HTTPS automático
- ✅ Deploy a cada push
- ✅ Logs integrados

### 4. URL Final
```
https://queenbooks-api.onrender.com/buscar-produto
```

## 📋 Configuração Manual (Alternativa)

Se preferir configuração manual:

```yaml
# Build Settings
Build Command: npm install
Start Command: node server-simple.js
Node Version: 18

# Environment Variables  
NODE_ENV=production
PORT=10000
```

## ⚡ Diferenças do Render vs Railway

| Feature | Render (FREE) | Railway ($5) |
|---------|---------------|--------------|
| Custo | 🟢 Gratuito | 🟡 $5/mês |
| Uptime | 🟡 Dorme 15min | 🟢 24/7 |
| Performance | 🟡 512MB RAM | 🟢 1GB+ RAM |
| Deploy | 🟢 Auto GitHub | 🟢 Auto GitHub |
| HTTPS | 🟢 Automático | 🟢 Automático |
| Logs | 🟢 Incluído | 🟢 Incluído |

## 🎯 Recomendação

**Para começar:** Use Render (gratuito)
**Para produção:** Upgrade Railway ($5) se necessário

## ✅ Próximos Passos

1. Criar conta no Render.com
2. Conectar repositório GitHub
3. Configurar root directory
4. Deploy automático!
5. Testar nova URL na API
6. Atualizar n8n com URL permanente
