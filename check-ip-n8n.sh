#!/bin/bash

# 🔍 DESCOBRIR IP PARA N8N - QueenBooks
# Este script ajuda a descobrir o IP correto para usar no n8n

echo "🔍 DESCOBRINDO IP PARA N8N - QUEENBOOKS"
echo "========================================"
echo ""

# Descobrir IP da rede local
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Não foi possível encontrar o IP da rede local"
    exit 1
fi

echo "✅ IP da rede local encontrado: $LOCAL_IP"
echo ""

# Testar se o servidor está rodando
echo "🔄 Testando servidor na porta 3000..."
if lsof -i :3000 > /dev/null; then
    echo "✅ Servidor está rodando na porta 3000"
    echo ""
    
    # Testar conectividade
    echo "🔄 Testando conectividade..."
    if curl -s -X GET "http://$LOCAL_IP:3000/health" > /dev/null; then
        echo "✅ Servidor responde no IP da rede local"
        echo ""
        
        # Mostrar configuração para n8n
        echo "📋 CONFIGURAÇÃO PARA N8N:"
        echo "========================"
        echo ""
        echo "URL para HTTP Request Node:"
        echo "http://$LOCAL_IP:3000/buscar-produto"
        echo ""
        echo "Copie e cole esta URL no seu n8n HTTP Request Node!"
        echo ""
        
        # Testar uma busca de exemplo
        echo "🧪 TESTE DE EXEMPLO:"
        echo "==================="
        echo ""
        echo "curl -X POST http://$LOCAL_IP:3000/buscar-produto \\"
        echo "  -H \"Content-Type: application/json\" \\"
        echo "  -d '{\"id\": \"177775811\"}'"
        echo ""
        
    else
        echo "❌ Servidor não responde no IP da rede local"
        echo "   Verifique se o servidor está configurado para escutar em 0.0.0.0"
    fi
    
else
    echo "❌ Servidor não está rodando na porta 3000"
    echo ""
    echo "💡 Para iniciar o servidor:"
    echo "   cd projetos/queenbooks-scraper"
    echo "   node server-n8n.js"
fi

echo ""
echo "🔧 TROUBLESHOOTING:"
echo "=================="
echo "1. Se n8n está em Docker, use o IP da rede local: $LOCAL_IP"
echo "2. Se n8n está na mesma máquina, pode usar: 127.0.0.1"
echo "3. Verifique firewall se não conseguir conectar"
echo ""
echo "📚 Mais ajuda: GUIA-RAPIDO-N8N.md"
