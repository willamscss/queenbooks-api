#!/bin/bash

echo "🔧 CONFIGURAÇÃO NGROK PARA N8N HOSTINGER"
echo "========================================"
echo ""

# Verificar se ngrok está instalado
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok não encontrado. Instalando..."
    brew install ngrok
fi

echo "📋 PASSOS PARA CONFIGURAR:"
echo ""
echo "1. 🌐 Criar conta gratuita:"
echo "   https://dashboard.ngrok.com/signup"
echo ""
echo "2. 🔑 Pegar seu authtoken:"
echo "   https://dashboard.ngrok.com/get-started/your-authtoken"
echo ""
echo "3. ⚙️  Configurar authtoken:"
echo "   ngrok config add-authtoken SEU_TOKEN_AQUI"
echo ""
echo "4. 🚀 Expor servidor (execute este script novamente após config):"

# Verificar se authtoken está configurado
if ngrok config check &> /dev/null; then
    echo "   ✅ Authtoken configurado!"
    echo ""
    echo "🔥 INICIANDO TÚNEL NGROK..."
    echo ""
    
    # Verificar se servidor está rodando
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "✅ Servidor local detectado na porta 3000"
        echo "🌐 Criando túnel público..."
        echo ""
        echo "📝 INSTRUÇÕES PARA N8N:"
        echo "- Copie a URL https://XXXXX.ngrok-free.app"
        echo "- Use: https://XXXXX.ngrok-free.app/buscar-produto"
        echo ""
        ngrok http 3000
    else
        echo "❌ Servidor não encontrado na porta 3000"
        echo "   Execute primeiro: node server-simple.js"
    fi
else
    echo "   ❌ Configure o authtoken primeiro!"
    echo ""
    echo "💡 DICA: Após configurar, execute este script novamente"
fi
