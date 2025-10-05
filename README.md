# Document Generator MCP

Um servidor MCP (Model Context Protocol) para gerar documentos Word (.docx) e PDF a partir de solicitações de qualquer agente de IA que suporte MCP, incluindo Claude Desktop, Amazon Q Developer, Cline, Continue e outros.

## 🚀 Funcionalidades

- ✅ Geração de documentos Word (.docx)
- ✅ Geração de documentos PDF
- ✅ Suporte a markdown (títulos, listas, negrito)
- ✅ Formatação automática e profissional
- ✅ Metadados (autor, data de criação)

## 📦 Instalação

### Via NPX (Recomendado)
```bash
npx document-generator-mcp
```

### Via NPM Global
```bash
npm install -g document-generator-mcp
```

## ⚙️ Configuração

### Claude Desktop

1. Localize o arquivo de configuração:
   - **Linux:** `~/.config/claude-desktop/claude_desktop_config.json`
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. Adicione esta configuração:

```json
{
  "mcpServers": {
    "document-generator": {
      "command": "npx",
      "args": ["--yes", "--cache", "/tmp/.npx-cache", "document-generator-mcp@latest"]
    }
  }
}
```

3. Reinicie o Claude Desktop

### Amazon Q Developer

1. Abra o VS Code com a extensão Amazon Q
2. Acesse as configurações do Amazon Q
3. Adicione o servidor MCP:

```json
{
  "mcpServers": {
    "document-generator": {
      "command": "npx",
      "args": ["--yes", "--cache", "/tmp/.npx-cache", "document-generator-mcp@latest"]
    }
  }
}
```

### Outros Agentes MCP (Cline, Continue, etc.)

Para outros agentes que suportam MCP, adicione a configuração do servidor:

```json
{
  "name": "document-generator",
  "command": "npx",
  "args": ["--yes", "--cache", "/tmp/.npx-cache", "document-generator-mcp@latest"]
}
```

Consulte a documentação específica do seu agente para detalhes de configuração.

## 🎯 Como Usar

Após configurar, você pode usar comandos naturais em qualquer agente MCP:

### Exemplos de Prompts
- *"Crie um documento Word sobre análise de vendas"*
- *"Gere um relatório em PDF sobre o projeto"*
- *"Faça um manual técnico em Word e PDF"*
- *"Crie documentação da API em formato Word"*

### Tools Disponíveis
- **`gerar_documento_word`**: Cria documentos Word, PDF ou ambos
- **`gerar_documento_pdf`**: Cria apenas documentos PDF

## 📝 Formatação Suportada

O MCP processa automaticamente:
- `## Título` → Heading 2
- `### Subtítulo` → Heading 3  
- `- Item` → Lista com bullets
- `**texto**` → Texto em negrito
- Parágrafos com quebras de linha automáticas

## 🧪 Teste

Para testar se está funcionando:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npx document-generator-mcp@latest
```

## 🔧 Troubleshooting

### Erro "use strict: not found"
Se você receber este erro, é porque o npm está usando uma versão antiga em cache. Soluções:

1. **Use esta configuração otimizada:**
```json
{
  "mcpServers": {
    "document-generator": {
      "command": "npx",
      "args": ["--yes", "--cache", "/tmp/.npx-cache", "document-generator-mcp@latest"]
    }
  }
}
```

2. **Ou limpe o cache:**
```bash
npm cache clean --force
rm -rf ~/.npm/_npx
```

## 📁 Arquivos Gerados

Os documentos são salvos em `./generated_documents/` com timestamp único.

## 🤖 Agentes Compatíveis

Este MCP funciona com qualquer agente que implemente o Model Context Protocol:

- ✅ **Claude Desktop** - Suporte nativo completo
- ✅ **Amazon Q Developer** - Suporte via VS Code
- ✅ **Cline (VS Code)** - Extensão para VS Code
- ✅ **Continue** - Assistente de código com MCP
- ✅ **Outros agentes MCP** - Qualquer implementação compatível

## 🤝 Contribuição

Contribuições são bem-vindas! Abra issues ou pull requests no GitHub.

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## ⚠️ Importante

- **Compatibilidade:** Funciona com qualquer agente que suporte MCP (Claude Desktop, Amazon Q Developer, Cline, Continue, etc.)
- **Requisitos:** Node.js 18+ para funcionamento
- **Plataformas:** Linux, macOS, Windows
- **Documentação Amazon Q:** [MCP no Amazon Q Developer](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/qdev-mcp.html)