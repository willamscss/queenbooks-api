# 🔐 GUIA DE CONFIGURAÇÃO - AUTENTICAÇÃO COM PREÇOS

## 📋 Pré-requisitos

Você precisa ter uma conta no QueenBooks para acessar os preços dos produtos.

## ⚙️ Configuração Rápida

### 1. Configurar Credenciais

Crie um arquivo `.env` na pasta do projeto:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione suas credenciais:

```bash
# Credenciais QueenBooks
QUEENBOOKS_USERNAME=seu_email@exemplo.com
QUEENBOOKS_PASSWORD=sua_senha_secreta
```

### 2. Instalar Dependências

```bash
npm install dotenv
```

### 3. Testar Autenticação

```bash
npm run test-auth
```

Este comando irá:
- ✅ Solicitar suas credenciais
- ✅ Testar login no QueenBooks
- ✅ Buscar um produto com preços
- ✅ Mostrar os resultados

## 🚀 Usar Servidor com Preços

### Servidor Local (Desenvolvimento)

```bash
npm run enhanced
```

### Deploy no Railway (Produção)

1. **No Railway Dashboard**, vá em:
   - **Settings** → **Environment Variables**

2. **Adicione as variáveis:**
   ```
   QUEENBOOKS_USERNAME = seu_email@exemplo.com
   QUEENBOOKS_PASSWORD = sua_senha_secreta
   ```

3. **Deploy automático** será realizado

## 📡 Novos Endpoints

Com autenticação configurada, você terá acesso a:

### POST /buscar-produto-com-preco
Busca produto com preços reais (requer autenticação)

```json
{
  "id": "177775811"
}
```

**Resposta:**
```json
{
  "sucesso": true,
  "encontrado": true,
  "autenticado": true,
  "produto": {
    "id": "177775811",
    "titulo": "Dior By Gianfranco Ferre",
    "preco": 299.90,
    "preco_autenticado": 299.90,
    "dropshipping": {
      "adequado_dropshipping": true,
      "margem_sugerida": "15-30%"
    }
  }
}
```

### POST /buscar-produtos-batch
Busca múltiplos produtos com preços

```json
{
  "ids": ["177775811", "123456789"],
  "usar_autenticacao": true
}
```

## 🔍 Para n8n

### Endpoint sem preços (compatibilidade)
```
URL: https://meu-codex-production.up.railway.app/buscar-produto
```

### Endpoint com preços (novo)
```
URL: https://meu-codex-production.up.railway.app/buscar-produto-com-preco
```

## ⚠️ Troubleshooting

### "Busca autenticada não disponível"
- Verifique se as variáveis `QUEENBOOKS_USERNAME` e `QUEENBOOKS_PASSWORD` estão configuradas
- No Railway, adicione as variáveis em Environment Variables

### "Erro no login"
- Teste suas credenciais manualmente no site: https://www.queenbooks.com.br/entrar
- Verifique se não há CAPTCHA ou proteção anti-bot
- Execute `npm run test-auth` para debug

### "Produto encontrado mas preço não extraído"
- O padrão de extração pode precisar ser ajustado
- Abra uma issue com o ID do produto problemático

## 🎯 Benefícios

✅ **Preços reais** dos produtos  
✅ **Análise de margem** mais precisa  
✅ **Monitoramento de preços** automático  
✅ **Compatibilidade** mantida com versão básica  
✅ **Deploy fácil** no Railway
