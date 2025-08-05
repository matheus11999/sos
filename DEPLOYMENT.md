# 🚀 Deployment para EasyPanel

## 📋 Pré-requisitos

1. **Conta no EasyPanel**
2. **Instância do Evolution API 2** já configurada e funcionando
3. **API Key do Open Router** com acesso ao GLM 4.5 Air

## ⚙️ Configuração no EasyPanel

### 1. Criar Nova Aplicação

1. Acesse seu painel do EasyPanel
2. Clique em "Create New Project"
3. Selecione "GitHub Repository"
4. Conecte o repositório: `https://github.com/matheus11999/sos`
5. Branch: `main`

### 2. Configurar Variáveis de Ambiente

No EasyPanel, vá para **Environment Variables** e adicione:

```bash
# API Configuration
OPEN_ROUTER_API_KEY=sk-or-v1-xxx... (sua chave do Open Router)
GLM_4_5_AIR_MODEL_URL=https://openrouter.ai/api/v1/chat/completions

# Evolution API Configuration  
EVOLUTION_API_URL=https://sua-instancia.evolutionapi.com
EVOLUTION_API_KEY=sua_chave_evolution_aqui
EVOLUTION_INSTANCE_NAME=nome_da_sua_instancia

# Admin Configuration
ADMIN_PHONE_NUMBER=+5511999999999 (seu número com código do país)

# Server Configuration
PORT=3000

# Logging
LOG_LEVEL=info
DEBUG_TERMINAL=true
```

### 3. Configurações de Deploy

**Build Command:** (deixe vazio - Node.js não precisa de build)
**Start Command:** `npm start`
**Port:** `3000`

### 4. Deploy

1. Clique em "Deploy"
2. Aguarde o build finalizar
3. Sua aplicação estará disponível em: `https://sua-app.easypanel.host`

## 🔗 Configurar Webhook no Evolution API 2

Após o deploy bem-sucedido, você precisa configurar o webhook:

### Opção 1: Via Interface Web do Evolution API

1. Acesse a interface do seu Evolution API 2
2. Vá para a seção "Webhooks" da sua instância
3. Configure:
   - **URL:** `https://sua-app.easypanel.host/webhook`
   - **Events:** `MESSAGES_UPSERT`, `CONNECTION_UPDATE`
4. Salve a configuração

### Opção 2: Via API (Recomendado)

Use este comando substituindo os valores:

```bash
curl -X POST "https://sua-instancia.evolutionapi.com/webhook/set/NOME_DA_INSTANCIA" \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_API_KEY" \
  -d '{
    "url": "https://sua-app.easypanel.host/webhook",
    "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
  }'
```

**Exemplo com seus dados:**
```bash
curl -X POST "https://evoapi-evolution-api.ttvjwi.easypanel.host/webhook/set/your_instance_name" \
  -H "Content-Type: application/json" \
  -H "apikey: 429683C4C977415CAAFCCE10F7D57E11" \
  -d '{
    "url": "https://sua-app.easypanel.host/webhook",
    "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
  }'
```

### Opção 3: Via Postman/Insomnia

```
POST https://sua-instancia.evolutionapi.com/webhook/set/NOME_DA_INSTANCIA
Headers:
  Content-Type: application/json
  apikey: SUA_API_KEY

Body:
{
  "url": "https://sua-app.easypanel.host/webhook",
  "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
}
```

## 🧪 Testar a Instalação

### 1. Verificar se o Servidor Está Rodando

```bash
curl https://sua-app.easypanel.host/
```

Deve retornar:
```json
{
  "message": "WhatsApp Tech Support Bot is running",
  "status": "active",
  "timestamp": "2025-08-05T19:30:00.000Z"
}
```

### 2. Verificar Health Check

```bash
curl https://sua-app.easypanel.host/health
```

### 3. Testar Webhook

Envie uma mensagem para o WhatsApp conectado à sua instância e verifique os logs no EasyPanel.

## 📱 Como Usar Após Deploy

### Para Clientes

**Consultar Preços:**
- "Qual o preço da frontal do A13?"
- "Quanto custa a bateria do J8?"

**Solicitar Atendente:**
- "Quero falar com um atendente"
- "Preciso de ajuda humana"

### Para Administradores

**Gerenciar Banco de Dados via WhatsApp:**

```
Adicionar Frontal A15 R$280
Editar Bateria J8 R$110  
Remover Frontal A10s
Listar itens
Ajuda
```

## 🐛 Troubleshooting

### Bot não responde às mensagens

1. **Verificar webhook:**
   ```bash
   curl "https://sua-instancia.evolutionapi.com/webhook/find/NOME_DA_INSTANCIA" \
     -H "apikey: SUA_API_KEY"
   ```

2. **Verificar logs no EasyPanel:**
   - Acesse a aba "Logs" no painel
   - Procure por erros ou mensagens de webhook

3. **Testar endpoint manualmente:**
   ```bash
   curl -X POST "https://sua-app.easypanel.host/test/message" \
     -H "Content-Type: application/json" \
     -d '{
       "phoneNumber": "+5511999999999",
       "message": "Teste do sistema"
     }'
   ```

### Erro de Conexão com APIs

1. **Verificar variáveis de ambiente** no EasyPanel
2. **Testar API Keys:**
   - Open Router: verifique se a chave está válida
   - Evolution API: teste se a instância está ativa

### Comandos Admin não funcionam

1. Verificar se `ADMIN_PHONE_NUMBER` está correto
2. Usar formato internacional: `+5511999999999`
3. Verificar nos logs se o número está sendo reconhecido como admin

## 🔄 Atualizar a Aplicação

1. Faça push das alterações para o GitHub
2. No EasyPanel, vá para "Deployments"
3. Clique em "Redeploy" ou configure auto-deploy

## 📊 Monitoramento

### Logs Importantes

```bash
# Ver logs em tempo real no EasyPanel
[Aba Logs] -> Enable live logs

# Logs que você deve procurar:
- "WhatsApp Tech Support Bot is running"
- "🔔 === WEBHOOK RECEIVED ==="
- "💬 === MESSAGE PROCESSING ==="
- "📤 === OUTGOING MESSAGE ==="
```

### Métricas de Performance

- **Uptime:** Monitore na dashboard do EasyPanel
- **Response Time:** Verificar logs de requisições
- **Memory Usage:** Acompanhar uso de RAM

## ⚡ Otimizações para Produção

1. **Auto-restart:** EasyPanel já configurado
2. **SSL/HTTPS:** Automático no EasyPanel
3. **Logs:** Rotação automática configurada
4. **Health checks:** Endpoint `/health` disponível

---

**✅ Aplicação pronta para produção!**

URL do seu bot: `https://sua-app.easypanel.host`
Webhook: `https://sua-app.easypanel.host/webhook`