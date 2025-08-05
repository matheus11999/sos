# WhatsApp Tech Support Bot

Sistema de atendimento automatizado para assistência técnica de celulares via WhatsApp, utilizando Open Router (GLM 4.5 Air) e Evolution API 2.

## 🚀 Características

- **Atendimento Automatizado**: IA responde consultas de preços automaticamente
- **Gestão de Administrador**: Comandos administrativos para gerenciar banco de dados
- **Solicitação de Atendente**: Clientes podem solicitar atendimento humano
- **Logs Detalhados**: Sistema completo de logs para monitoramento
- **Banco de Dados JSON**: Fácil gerenciamento de peças e preços

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- Conta no Open Router com acesso ao modelo GLM 4.5 Air
- Instância do Evolution API 2 configurada
- WhatsApp Business ou pessoal para conectar à instância

## 🛠️ Instalação

1. **Clone ou baixe o projeto**
```bash
git clone <repository-url>
cd whatsapp-tech-support
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:
```env
# API Configuration
OPEN_ROUTER_API_KEY=sua_chave_open_router_aqui
GLM_4_5_AIR_MODEL_URL=https://openrouter.ai/api/v1/chat/completions

# Evolution API Configuration
EVOLUTION_API_URL=https://sua-instancia.evolutionapi.com
EVOLUTION_API_KEY=sua_chave_evolution_aqui
EVOLUTION_INSTANCE_NAME=nome_da_sua_instancia

# Admin Configuration
ADMIN_PHONE_NUMBER=+5511999999999

# Server Configuration
PORT=3000

# Logging
LOG_LEVEL=info
```

4. **Inicie o servidor**
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## ⚙️ Configuração Inicial

### 1. Configurar Webhook no Evolution API 2

**Opção 1: Via Interface do Evolution API**
1. Acesse a interface web do seu Evolution API 2
2. Vá para a seção "Webhooks" da sua instância
3. Configure o webhook URL: `https://seu-dominio.com/webhook`
4. Selecione os eventos: `MESSAGES_UPSERT` e `CONNECTION_UPDATE`

**Opção 2: Via API diretamente**
```bash
curl -X POST "https://sua-instancia.evolutionapi.com/webhook/set/NOME_DA_INSTANCIA" \
  -H "Content-Type: application/json" \
  -H "apikey: SUA_API_KEY" \
  -d '{
    "url": "https://seu-dominio.com/webhook",
    "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
  }'
```

**Opção 3: Via Postman/Insomnia**
```
POST https://sua-instancia.evolutionapi.com/webhook/set/NOME_DA_INSTANCIA
Headers:
  Content-Type: application/json
  apikey: SUA_API_KEY

Body:
{
  "url": "https://seu-dominio.com/webhook",
  "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
}
```

### 2. Debug no Terminal

Para ver as requisições e respostas no terminal em tempo real, configure no `.env`:

```env
DEBUG_TERMINAL=true
```

Isso mostrará:
- 🔵 Requisições HTTP recebidas
- 🔔 Webhooks recebidos do WhatsApp
- 💬 Processamento de mensagens
- 📤 Mensagens enviadas
- 🌐 Chamadas para APIs externas

## 📱 Como Usar

### Para Clientes

**Consultar Preços:**
- "Qual o preço da frontal do A13?"
- "Quanto custa a bateria do J8?"
- "Preço do reparo da placa mãe"

**Solicitar Atendente:**
- "Quero falar com um atendente"
- "Preciso de ajuda humana"
- "Chamar atendente"

### Para Administradores

**Adicionar Item:**
```
Adicionar Frontal A13 R$250
```

**Editar Preço:**
```
Editar Frontal A13 R$300
```

**Remover Item:**
```
Remover Frontal A13
```

**Listar Todos os Itens:**
```
Listar itens
```

**Ver Comandos:**
```
Ajuda
```

## 🗂️ Estrutura do Projeto

```
whatsapp-tech-support/
├── src/
│   ├── controllers/
│   │   ├── messageHandler.js      # Controlador principal de mensagens
│   │   ├── adminProcessor.js      # Processador de comandos admin
│   │   └── customerProcessor.js   # Processador de mensagens de clientes
│   ├── services/
│   │   ├── database.js           # Serviço de banco de dados JSON
│   │   ├── evolution.js          # Integração Evolution API
│   │   └── openrouter.js         # Integração Open Router
│   ├── utils/
│   │   └── logger.js             # Sistema de logs
│   └── index.js                  # Servidor principal
├── logs/                         # Arquivos de log
├── database.json                 # Banco de dados de peças
├── .env.example                  # Exemplo de configuração
├── package.json
└── README.md
```

## 📊 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Status do servidor |
| POST | `/webhook` | Webhook para receber mensagens |
| POST | `/test/message` | Enviar mensagem de teste |
| GET | `/health` | Health check |

## 🗄️ Banco de Dados

O sistema utiliza um arquivo JSON (`database.json`) para armazenar peças e preços:

```json
[
  {
    "item": "Frontal A10s OLED",
    "price": 200
  },
  {
    "item": "Bateria J8",
    "price": 100
  }
]
```

## 📝 Logs

O sistema gera logs detalhados em:
- `logs/app.log` - Logs gerais
- `logs/error.log` - Apenas erros

Logs incluem:
- Mensagens recebidas e processadas
- Comandos administrativos executados
- Erros e exceções
- Chamadas de API

## 🔒 Segurança

- Apenas o número definido em `ADMIN_PHONE_NUMBER` pode executar comandos administrativos
- Logs não armazenam informações sensíveis
- Validação de entrada em todos os comandos

## 🚨 Troubleshooting

### Erro de Conexão com Evolution API
- Verifique se a URL e API Key estão corretas no `.env`
- Confirme se a instância está conectada e ativa no Evolution API
- Teste se a API está respondendo: `GET https://sua-instancia.evolutionapi.com/instance/fetchInstances`
- Verifique os logs em `logs/error.log`

### Bot não responde
- Verifique se o webhook está configurado corretamente no Evolution API
- Confirme se a URL do webhook está acessível publicamente
- Use `DEBUG_TERMINAL=true` para ver se as mensagens estão chegando
- Verifique se a API Key do Open Router está válida
- Teste enviando uma mensagem via endpoint `/test/message`

### Comandos admin não funcionam
- Confirme se o número do administrador está correto no `.env`
- Verifique se está usando o formato internacional (+5511999999999)

## 📞 Exemplos de Interação

### Cliente Consultando Preço
```
Cliente: Qual o preço da frontal do A13?
Bot: A frontal do A13 custa R$250. Posso ajudar com mais alguma coisa? 😊
```

### Cliente Solicitando Atendente
```
Cliente: Quero falar com um atendente
Bot: Entendi! 👨‍💼 Um de nossos atendentes foi notificado e entrará em contato com você em breve.
```

### Admin Adicionando Item
```
Admin: Adicionar Bateria A20 R$120
Bot: Item 'Bateria A20' adicionado com sucesso por R$120!
```

## 🔧 Desenvolvimento

Para contribuir com o projeto:

1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Faça suas alterações
4. Teste localmente
5. Envie um pull request

## 📄 Licença

Este projeto está sob a licença ISC. Veja o arquivo `package.json` para mais detalhes.

## 🆘 Suporte

Para suporte técnico:
- Verifique os logs em `logs/`
- Consulte a documentação da Evolution API 2
- Verifique a documentação do Open Router

---

**Desenvolvido para automatizar o atendimento de assistências técnicas via WhatsApp** 🔧📱