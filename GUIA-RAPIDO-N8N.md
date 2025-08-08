# 🚀 Guia Rápido: QueenBooks + n8n

## 🚨 PROBLEMA REAL: n8n na VPS Remota (Hostinger)

### ❌ Situação Atual:
- n8n rodando na **Hostinger VPS** (não local)
- Servidor API rodando **localmente** no seu Mac
- VPS não consegue acessar `localhost` ou IP local da sua máquina

### ✅ SOLUÇÃO OBRIGATÓRIA: Ngrok (Túnel Público)

#### 1. Configurar ngrok (OBRIGATÓRIO):
```bash
# 1. Criar conta gratuita: https://dashboard.ngrok.com/signup
# 2. Pegar authtoken: https://dashboard.ngrok.com/get-started/your-authtoken  
# 3. Configurar:
ngrok config add-authtoken SEU_TOKEN_AQUI

# 4. Expor servidor:
ngrok http 3000
```

#### 2. URL para n8n (Dinâmica):
```
URL: https://XXXXX-XXX-XX-XX-XXX.ngrok-free.app/buscar-produto
Method: POST
Headers: Content-Type = application/json
Body: {"id": "{{ $json.id }}"}
```

### 🎯 Alternativas (Mais Complexas):

#### Opção A: Deploy na Hostinger
- Subir o servidor Node.js na mesma VPS do n8n
- Usar `http://localhost:3000` dentro da VPS

#### Opção B: Servidor Público
- Deploy em Heroku, Railway, ou Vercel
- URL fixa para o n8n

#### Opção C: VPN/Túnel SSH
- Configurar túnel SSH reverso
- Mais complexo

## 🎉 ✅ INTEGRAÇÃO CONCLUÍDA E FUNCIONANDO!

### 🚀 **STATUS: 100% OPERACIONAL**

**✅ TESTADO E CONFIRMADO:** n8n Hostinger → ngrok → API Local → QueenBooks

### 🔧 **CONFIGURAÇÃO FINAL (FUNCIONANDO):**

```
URL: https://f618a5c01747.ngrok-free.app/buscar-produto
Method: POST
Headers: Content-Type = application/json
Body: {"id": "{{ $json.id }}"}
Timeout: 120000
```

### ✅ **RESPOSTA CONFIRMADA:**
```json
{
  "sucesso": true,
  "encontrado": true,
  "produto": {
    "id": "177775811",
    "codigo_isbn": "9781614287568",
    "titulo": "Dior By Gianfranco Ferre",
    "categoria_sugerida": "Livros de Luxo",
    "dropshipping": {
      "adequado_dropshipping": true,
      "margem_sugerida": "20-35%",
      "publico_alvo": "Colecionadores de livros de luxo"
    }
  }
}
```

### 🔥 **SISTEMA ATIVO E PRONTO PARA PRODUÇÃO!**

## 🔧 Como Usar (FINAL)

### 1. Iniciar Servidor:
```bash
cd projetos/queenbooks-scraper
node server-simple.js
```

### 2. Teste Local:
```bash
curl -X POST http://localhost:3000/buscar-produto \
  -H "Content-Type: application/json" \
  -d '{"id": "177775811"}'
```

**✅ RESULTADO:** Servidor funcionando - problema é conectividade Docker→Host

## ✅ Sistema Funcionando!

### 1. Workflow Básico

1. **Adicionar Webhook Node**
   - Method: `POST`
   - Path: `/webhook/queenbooks`

2. **Adicionar HTTP Request Node**
   ```
   URL: http://192.168.15.6:3000/buscar-produto
   Method: POST
   Headers: Content-Type: application/json
   Body: {"id": "{{ $json.id }}"}
   ```

3. **Adicionar IF Node** para verificar sucesso
   - Condition: `{{ $json.sucesso }}` equals `true`

4. **Processar resposta** com Set Node

### 2. Testando a Integração

**Enviar requisição POST para seu webhook n8n:**
```json
{
  "id": "177775811"
}
```

**Resposta esperada:**
```json
{
  "sucesso": true,
  "encontrado": true,
  "produto": {
    "id": "177775811",
    "codigo_isbn": "9781614287568", 
    "titulo": "Dior By Gianfranco Ferre",
    "categoria_sugerida": "Livros de Luxo",
    "dropshipping": {
      "adequado_dropshipping": true,
      "margem_sugerida": "20-35%",
      "publico_alvo": "Colecionadores de livros de luxo"
    }
  }
}
```

## 📊 Dados Disponíveis

### 🆕 Novo Endpoint: Extração de Imagens

**Endpoint:** `POST /extrair-imagens`

**Uso no n8n:**
```
URL: http://192.168.15.6:3000/extrair-imagens
Method: POST
Headers: Content-Type: application/json
Body: {"id": "{{ $json.id }}"}
```

**Resposta:**
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

### 📋 Dados de Produtos

Cada produto retorna:

✅ **Básicos**
- `id` - ID do produto no site
- `codigo_isbn` - Código ISBN do livro  
- `titulo` - Título do livro
- `url_produto` - Link direto para o produto

✅ **Comerciais**
- `categoria_sugerida` - Categoria recomendada
- `dropshipping.adequado_dropshipping` - Se é adequado para dropshipping
- `dropshipping.margem_sugerida` - Margem de lucro sugerida
- `dropshipping.publico_alvo` - Público-alvo identificado

✅ **Detalhados**
- `informacoes.Editora` - Editora do livro
- `informacoes.Autor` - Autor
- `informacoes.Ano` - Ano de publicação
- `informacoes.Páginas` - Número de páginas
- `informacoes.Origem` - País/região de origem

## 🎯 Exemplos de Automação

### 1. Monitoramento de Produtos
```
Schedule → Database (buscar IDs) → HTTP QueenBooks → IF (mudou?) → Slack/Email
```

### 2. Análise de Catálogo
```
Spreadsheet → Split → HTTP QueenBooks → Database → Relatório
```

### 3. Pipeline de Dropshipping
```
Webhook → HTTP QueenBooks → IF (adequado?) → Calculate Markup → Shopify
```

## 🔄 Comandos Úteis

**Descobrir IP automaticamente:**
```bash
./check-ip-n8n.sh
```

**Iniciar servidor:**
```bash
cd projetos/queenbooks-scraper
node server-n8n.js
```

**Testar API:**
```bash
curl -X POST http://192.168.15.6:3000/buscar-produto \
  -H "Content-Type: application/json" \
  -d '{"id": "177775811"}'
```

**Verificar saúde:**
```bash
curl http://192.168.15.6:3000/health
```

## 🚨 Troubleshooting

**Erro "Cannot find module"**: Certifique-se de estar no diretório correto
**Timeout**: O QueenBooks pode estar lento, aumente o timeout
**Produto não encontrado**: Verifique se o ID existe no site

## 📝 Status Final

1. ✅ **Servidor funcionando** - ✅ Concluído
2. ✅ **Ngrok configurado** - ✅ Concluído  
3. ✅ **n8n integrado** - ✅ Concluído e Testado
4. ✅ **Sistema em produção** - ✅ Operacional

---

🎉 **INTEGRAÇÃO QUEENBOOKS + N8N CONCLUÍDA COM SUCESSO!** 

**Agora você pode criar workflows automáticos para:**
- 📊 Análise de catálogo de produtos
- 🛒 Pipeline de dropshipping
- 📈 Monitoramento de preços
- 📋 Relatórios automatizados
- 🔄 Sincronização com outras plataformas
