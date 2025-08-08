#!/bin/bash

# 🚀 INICIAR API QUEENBOOKS EM PRODUÇÃO
# Este script mantém a API rodando permanentemente

echo "🚀 INICIANDO API QUEENBOOKS EM PRODUÇÃO"
echo "======================================="
echo ""

# Verificar se PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2 (Process Manager)..."
    npm install -g pm2
fi

# Parar processos anteriores se existirem
pm2 stop queenbooks-api 2>/dev/null || true
pm2 delete queenbooks-api 2>/dev/null || true

# Iniciar servidor com PM2
echo "🔄 Iniciando servidor com PM2..."
pm2 start server-simple.js --name "queenbooks-api" --log-date-format="YYYY-MM-DD HH:mm:ss"

# Salvar configuração atual (sem auto-start)
echo "💾 Salvando configuração..."
pm2 save

echo ""
echo "✅ API QUEENBOOKS CONFIGURADA EM PRODUÇÃO!"
echo ""
echo "📋 COMANDOS ÚTEIS:"
echo "   pm2 status           - Ver status"
echo "   pm2 logs queenbooks-api  - Ver logs"
echo "   pm2 restart queenbooks-api - Reiniciar"
echo "   pm2 stop queenbooks-api    - Parar"
echo ""
echo "🔗 API funcionando em: http://localhost:3000"
echo "📊 Health check: curl http://localhost:3000/health"
echo ""
echo "🌐 Para ngrok (túnel público):"
echo "   ngrok http 3000"
echo ""
echo "ℹ️  NOTA: Para auto-start no boot do sistema, execute:"
echo "   sudo pm2 startup"
echo "   (Requer senha de administrador)"
