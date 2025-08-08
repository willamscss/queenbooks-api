# 🚀 Integração QueenBooks com n8n

API REST para integração do sistema QueenBooks com workflows do n8n.

## 📋 URL Produção (Railway)

**URL Base:** https://meu-codex-production.up.railway.app

## 📋 Início Rápido

### 1. Usar API em Produção (Recomendado)
```bash
# Testar health check
curl https://meu-codex-production.up.railway.app/health

# Buscar produto
curl -X POST https://meu-codex-production.up.railway.app/buscar-produto \
  -H "Content-Type: application/json" \
  -d '{"id": "177775811"}'
```

### 2. Desenvolvimento Local
```bash
# Opção 1: Script npm
npm run n8n

# Opção 2: Direto
node server-simple.js

# Opção 3: Com porta específica
PORT=8080 node server-simple.js
```

## 🔗 Endpoints Disponíveis

### 1. Health Check
- **URL**: `GET /health`
- **Descrição**: Verificar se o servidor está funcionando
- **Resposta**:
```json
{
  "status": "healthy",
  "timestamp": "2025-07-13T15:30:00.000Z",
  "service": "queenbooks-n8n-api",
  "version": "1.0.0"
}
```

### 2. Status do Servidor
- **URL**: `GET /status`
- **Descrição**: Informações detalhadas do servidor
- **Resposta**: Lista todos os endpoints e exemplos de uso

### 3. Buscar Produto (Principal)
- **URL**: `POST /buscar-produto`
- **Descrição**: Busca produto por ID do QueenBooks
- **Body**:
```json
{
  "id": "177775811"
}
```
- **Resposta de Sucesso**:
```json
{
  "sucesso": true,
  "encontrado": true,
  "produto": {
    "id": "177775811",
    "codigo_isbn": "123456789",
    "titulo": "Dior By Gianfranco Ferre",
    "descricao": "Origem: França • Editora: Assouline",
    "preco": "R$ 450,00",
    "status": "available",
    "url_produto": "https://www.queenbooks.com.br/produtos/177775811",
    "fotos": [
      "https://mercos.s3.amazonaws.com/fit-in/800x800/..."
    ],
    "total_fotos": 3,
    "informacoes": {
      "Origem": "França",
      "Editora": "Assouline",
      "Autor": "Gianfranco Ferre"
    },
    "categoria_sugerida": "Livros de Luxo",
    "dropshipping": {
      "adequado_dropshipping": true,
      "margem_sugerida": "20-35%",
      "publico_alvo": "Colecionadores de livros de luxo",
      "nivel_concorrencia": "baixo",
      "potencial_vendas": "excelente"
    }
  },
  "metadados": {
    "metodo_busca": "busca_direta_id",
    "encontrado_em": "2025-07-13T15:30:00.000Z",
    "processado_em": "2025-07-13T15:30:05.000Z"
  },
  "integracao": {
    "n8n_ready": true,
    "formato": "json_estruturado",
    "versao_api": "1.0.0"
  }
}
```

### 4. Buscar Múltiplos Produtos
- **URL**: `POST /buscar-produtos-batch`
- **Descrição**: Busca até 10 produtos em lote
- **Body**:
```json
{
  "ids": ["177775811", "123456789", "987654321"]
}
```

### 5. 🆕 Extrair Imagens do Carrossel
- **URL**: `POST /extrair-imagens`
- **Descrição**: Extrai todas as imagens do carrossel de um produto
- **Tempo**: ~15-17 segundos
- **Body**:
```json
{
  "id": "177776045"
}
```
- **Resposta**:
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

### 6. Produtos Salvos
- **URL**: `GET /produtos-salvos`
- **Descrição**: Lista os últimos 20 produtos processados
- **Resposta**: Lista de produtos com informações básicas

## 🔧 Configuração no n8n

### 1. Webhook Node (Trigger)
```
Método: POST
URL: /webhook/queenbooks
```

### 2. HTTP Request Node
```
URL: http://localhost:3000/buscar-produto
Método: POST
Headers:
  Content-Type: application/json
Body (JSON):
{
  "id": "{{ $json.id }}"
}
```

### 3. Processing Node (Set/Code)
```javascript
// Processar resposta da API
const produto = $json.produto;

return {
  id: produto.id,
  titulo: produto.titulo,
  preco: produto.preco,
  fotos: produto.fotos,
  dropshipping: produto.dropshipping,
  adequado: produto.dropshipping.adequado_dropshipping
};
```

## 📊 Exemplos de Workflow n8n

### Workflow 1: Busca Simples
1. **Webhook** - Receber ID do produto
2. **HTTP Request** - Buscar no QueenBooks  
3. **Set** - Formatar dados
4. **Response** - Retornar resultado

### Workflow 2: Processamento em Lote
1. **Schedule** - Executar diariamente
2. **Spreadsheet** - Ler lista de IDs
3. **HTTP Request** - Buscar produtos em lote
4. **Split** - Dividir resultados
5. **Database** - Salvar produtos encontrados

### Workflow 3: Monitoramento de Preços
1. **Schedule** - Executar a cada hora
2. **Database** - Buscar produtos salvos
3. **HTTP Request** - Verificar preços atuais
4. **IF** - Verificar mudanças
5. **Email/Slack** - Notificar alterações

## 🚨 Tratamento de Erros

### Produto Não Encontrado
```json
{
  "sucesso": false,
  "encontrado": false,
  "mensagem": "Produto não encontrado ou sem dados válidos",
  "id": "123456789",
  "timestamp": "2025-07-13T15:30:00.000Z"
}
```

### Erro de Servidor
```json
{
  "erro": true,
  "mensagem": "Erro interno do servidor",
  "detalhes": "Timeout na conexão",
  "timestamp": "2025-07-13T15:30:00.000Z"
}
```

### ID Inválido
```json
{
  "erro": true,
  "mensagem": "ID ou código do produto é obrigatório",
  "exemplo": { "id": "177775811" },
  "timestamp": "2025-07-13T15:30:00.000Z"
}
```

## ⚡ Performance e Limites

- **Timeout**: 15 segundos por busca
- **Rate Limit**: 2 segundos entre buscas em lote
- **Máximo Batch**: 10 produtos por vez
- **Porta Padrão**: 3000 (configurável via ENV)

## 🔒 Segurança

- CORS habilitado para n8n
- Validação de entrada em todos os endpoints
- Logs detalhados para debugging
- Graceful shutdown com SIGINT/SIGTERM

## 📝 Logs e Debugging

O servidor gera logs detalhados:
```
🔄 2025-07-13T15:30:00.000Z - POST /buscar-produto
📋 Nova solicitação de busca recebida
📦 Body: { "id": "177775811" }
🎯 Iniciando busca para ID: 177775811
✅ Busca concluída, enviando resposta
```

## 🚀 Deploy em Produção

### Docker (Recomendado)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server-n8n.js"]
```

### PM2
```bash
npm install -g pm2
pm2 start server-n8n.js --name queenbooks-api
pm2 startup
pm2 save
```

### Variáveis de Ambiente
```bash
PORT=3000               # Porta do servidor
NODE_ENV=production     # Ambiente
```

## 🆘 Troubleshooting

### Servidor não inicia
1. Verificar porta disponível: `lsof -i :3000`
2. Verificar dependências: `npm install`
3. Verificar logs: `tail -f logs/error.log`

### n8n não consegue conectar
1. Verificar firewall
2. Testar curl manual: `curl -X POST http://localhost:3000/buscar-produto -d '{"id":"177775811"}' -H "Content-Type: application/json"`
3. Verificar URL no n8n

### Produto não encontrado
1. Verificar se ID existe no QueenBooks
2. Testar busca manual: `node busca-real.js`
3. Verificar logs do servidor
