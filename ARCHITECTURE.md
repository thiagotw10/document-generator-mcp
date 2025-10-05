# Arquitetura do Document Generator MCP

## 📋 Visão Geral

Este documento explica como o MCP funciona internamente e como os agentes de IA interagem com ele.

---

## 🏗️ Estrutura do Código

### 1. **Imports e Configuração Inicial**

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
```

**O que faz:**
- Importa o SDK do MCP para criar o servidor
- `Server`: Classe principal que gerencia o servidor MCP
- `StdioServerTransport`: Permite comunicação via stdin/stdout (padrão para MCPs)
- Schemas: Definem os tipos de requisições que o servidor pode receber

---

### 2. **Schema de Validação (Zod)**

```typescript
const GerarDocumentInputSchema = z.object({
    nome_arquivo: z.string().min(1),
    titulo_documento: z.string().min(1),
    conteudo_principal: z.string().min(1),
    autor: z.string().optional().default("Agente MCP"),
    formato: z.enum(['word', 'pdf', 'ambos']).optional().default('word'),
});
```

**O que faz:**
- Define e valida os parâmetros que o agente deve enviar
- Garante que dados obrigatórios estejam presentes
- Define valores padrão para campos opcionais
- Previne erros de tipo em runtime

**Por que é importante:**
- Protege contra dados inválidos
- Documenta automaticamente os parâmetros esperados
- Fornece mensagens de erro claras

---

### 3. **Criação do Servidor MCP**

```typescript
const server = new Server({
    name: 'gerador-documento-docx',
    version: '1.0.0'
}, {
    capabilities: {
        tools: {}
    }
});
```

**O que faz:**
- Cria uma instância do servidor MCP
- Define nome e versão do servidor
- Declara que o servidor oferece "tools" (ferramentas)

**Como o agente vê isso:**
- O agente detecta que existe um servidor chamado "gerador-documento-docx"
- Sabe que pode chamar ferramentas deste servidor

---

### 4. **Handler de Listagem de Tools**

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [{
            name: 'gerar_documento_word',
            description: 'Cria um arquivo Microsoft Word (.docx)',
            inputSchema: {
                type: 'object',
                properties: {
                    nome_arquivo: { type: 'string', description: 'Nome do arquivo sem extensão' },
                    titulo_documento: { type: 'string', description: 'Título do documento' },
                    conteudo_principal: { type: 'string', description: 'Conteúdo principal' },
                    autor: { type: 'string', description: 'Autor do documento' },
                    formato: { type: 'string', enum: ['word', 'pdf', 'ambos'] }
                },
                required: ['nome_arquivo', 'titulo_documento', 'conteudo_principal']
            }
        }, {
            name: 'gerar_documento_pdf',
            description: 'Cria um arquivo PDF',
            inputSchema: { /* ... */ }
        }]
    };
});
```

**O que faz:**
- Responde quando o agente pergunta: "Quais ferramentas você tem?"
- Lista todas as tools disponíveis com suas descrições
- Define o schema de entrada para cada tool

**Fluxo de comunicação:**
1. **Agente inicia** → Envia requisição `tools/list`
2. **Servidor responde** → Lista de tools disponíveis
3. **Agente analisa** → Entende quais ferramentas pode usar

**Exemplo de resposta JSON:**
```json
{
  "tools": [
    {
      "name": "gerar_documento_word",
      "description": "Cria um arquivo Microsoft Word (.docx)",
      "inputSchema": { /* schema */ }
    }
  ]
}
```

---

### 5. **Função de Geração de PDF**

```typescript
const generatePDF = async (args) => {
    const doc = new PDFDocument();
    const stream = require('fs').createWriteStream(caminhoCompleto);
    doc.pipe(stream);
    
    // Processa markdown
    const lines = args.conteudo_principal.split('\n');
    for (const line of lines) {
        if (line.startsWith('## ')) {
            doc.fontSize(16).font('Helvetica-Bold').text(line.substring(3));
        } else if (line.startsWith('### ')) {
            doc.fontSize(14).font('Helvetica-Bold').text(line.substring(4));
        }
        // ... mais formatações
    }
    
    doc.end();
    return caminhoCompleto;
};
```

**O que faz:**
- Cria um documento PDF usando a biblioteca `pdfkit`
- Processa markdown básico (títulos, listas, etc.)
- Aplica formatação (fontes, tamanhos, espaçamento)
- Salva o arquivo e retorna o caminho

**Processamento de Markdown:**
- `## Título` → Fonte 16pt, negrito
- `### Subtítulo` → Fonte 14pt, negrito
- `- Item` → Lista com bullet
- Texto normal → Fonte 12pt

---

### 6. **Handler de Chamada de Tools**

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'gerar_documento_word' || 
        request.params.name === 'gerar_documento_pdf') {
        
        // 1. Valida os argumentos
        const args = GerarDocumentInputSchema.parse(request.params.arguments);
        
        // 2. Cria diretório se não existir
        await fs.mkdir(DOC_OUTPUT_DIR, { recursive: true });
        
        // 3. Determina qual formato gerar
        const formato = request.params.name === 'gerar_documento_pdf' ? 'pdf' : args.formato;
        
        // 4. Gera Word se necessário
        if (formato === 'word' || formato === 'ambos') {
            // Processa markdown e cria documento Word
            const processContent = (content) => { /* ... */ };
            const docWord = new Document({ /* ... */ });
            await fs.writeFile(caminhoWord, buffer);
        }
        
        // 5. Gera PDF se necessário
        if (formato === 'pdf' || formato === 'ambos') {
            await generatePDF(args);
        }
        
        // 6. Retorna resultado para o agente
        return {
            content: [{
                type: 'text',
                text: `Documento "${args.titulo_documento}" gerado:\n${resultados.join('\n')}`
            }]
        };
    }
});
```

**O que faz:**
- Recebe chamadas de ferramentas do agente
- Valida os parâmetros recebidos
- Executa a lógica de geração de documentos
- Retorna o resultado para o agente

**Fluxo completo:**
1. **Agente decide** usar a tool `gerar_documento_word`
2. **Agente envia** requisição com parâmetros
3. **Servidor valida** os parâmetros
4. **Servidor executa** a geração do documento
5. **Servidor retorna** caminho do arquivo gerado
6. **Agente informa** o usuário sobre o sucesso

---

### 7. **Processamento de Markdown para Word**

```typescript
const processContent = (content: string) => {
    const lines = content.split('\n');
    const elements: any[] = [];
    
    for (const line of lines) {
        if (line.startsWith('## ')) {
            elements.push(new Paragraph({
                text: line.substring(3),
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 240, after: 120 }
            }));
        } else if (line.startsWith('- ')) {
            elements.push(new Paragraph({
                text: line.substring(2),
                bullet: { level: 0 }
            }));
        }
        // ... mais formatações
    }
    
    return elements;
};
```

**O que faz:**
- Converte markdown em elementos do Word
- Aplica estilos apropriados (headings, bullets, negrito)
- Adiciona espaçamento entre elementos
- Retorna array de parágrafos formatados

**Conversões suportadas:**
- `## Título` → Heading 2
- `### Subtítulo` → Heading 3
- `- Item` → Lista com bullet
- `**texto**` → Negrito
- Texto normal → Parágrafo

---

### 8. **Inicialização do Servidor**

```typescript
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(console.error);
```

**O que faz:**
- Cria transporte de comunicação via stdin/stdout
- Conecta o servidor ao transporte
- Inicia o servidor e aguarda requisições

**Como funciona:**
- O servidor fica "escutando" via stdin
- Quando recebe JSON-RPC, processa e responde via stdout
- Mantém conexão aberta até ser encerrado

---

## 🔄 Fluxo de Comunicação Completo

### Cenário: Usuário pede "Crie um relatório em Word sobre vendas"

```
1. USUÁRIO → AGENTE
   "Crie um relatório em Word sobre vendas"

2. AGENTE → MCP SERVER
   Requisição: tools/list
   {
     "jsonrpc": "2.0",
     "method": "tools/list",
     "params": {}
   }

3. MCP SERVER → AGENTE
   Resposta: Lista de tools
   {
     "result": {
       "tools": [
         {
           "name": "gerar_documento_word",
           "description": "Cria um arquivo Microsoft Word (.docx)",
           "inputSchema": { /* ... */ }
         }
       ]
     }
   }

4. AGENTE (analisa)
   - Identifica que existe tool "gerar_documento_word"
   - Verifica que precisa de: nome_arquivo, titulo_documento, conteudo_principal
   - Gera o conteúdo do relatório

5. AGENTE → MCP SERVER
   Requisição: tools/call
   {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {
       "name": "gerar_documento_word",
       "arguments": {
         "nome_arquivo": "relatorio_vendas",
         "titulo_documento": "Relatório de Vendas",
         "conteudo_principal": "## Resumo\n\nAnálise de vendas...",
         "autor": "Claude"
       }
     }
   }

6. MCP SERVER (processa)
   - Valida argumentos
   - Cria diretório
   - Processa markdown
   - Gera documento Word
   - Salva arquivo

7. MCP SERVER → AGENTE
   Resposta: Sucesso
   {
     "result": {
       "content": [{
         "type": "text",
         "text": "Documento 'Relatório de Vendas' gerado:\nWord: /path/relatorio_vendas_123456.docx"
       }]
     }
   }

8. AGENTE → USUÁRIO
   "Criei o relatório em Word! O arquivo foi salvo em: /path/relatorio_vendas_123456.docx"
```

---

## 🎯 Vantagens desta Arquitetura

### 1. **Separação de Responsabilidades**
- **Agente**: Entende linguagem natural, decide quando usar tools
- **MCP Server**: Executa tarefas específicas (gerar documentos)

### 2. **Reutilizável**
- Qualquer agente MCP pode usar este servidor
- Não precisa reimplementar lógica de geração

### 3. **Validação Robusta**
- Zod valida todos os inputs
- Previne erros em runtime
- Mensagens de erro claras

### 4. **Extensível**
- Fácil adicionar novos formatos (Excel, PowerPoint)
- Fácil adicionar novas formatações
- Fácil adicionar novos recursos (imagens, tabelas)

### 5. **Protocolo Padrão**
- Usa JSON-RPC 2.0
- Compatível com qualquer cliente MCP
- Comunicação via stdin/stdout (universal)

---

## 🔧 Como Adicionar uma Nova Tool

```typescript
// 1. Adicionar no ListToolsRequestSchema
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            // ... tools existentes
            {
                name: 'gerar_documento_excel',
                description: 'Cria uma planilha Excel',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nome_arquivo: { type: 'string' },
                        dados: { type: 'array' }
                    },
                    required: ['nome_arquivo', 'dados']
                }
            }
        ]
    };
});

// 2. Adicionar no CallToolRequestSchema
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'gerar_documento_excel') {
        // Implementar lógica de geração de Excel
        const args = request.params.arguments;
        // ... gerar Excel
        return {
            content: [{
                type: 'text',
                text: `Planilha gerada: ${caminho}`
            }]
        };
    }
    // ... outras tools
});
```

---

## 📚 Recursos Adicionais

- **MCP Specification**: https://modelcontextprotocol.io
- **SDK Documentation**: https://github.com/modelcontextprotocol/sdk
- **JSON-RPC 2.0**: https://www.jsonrpc.org/specification

---

## 🤔 Perguntas Frequentes

**Q: Por que usar stdin/stdout?**
A: É o padrão MCP, funciona em qualquer plataforma, não precisa de rede.

**Q: Como o agente sabe quando usar a tool?**
A: O agente analisa a descrição da tool e decide baseado no contexto da conversa.

**Q: Posso adicionar autenticação?**
A: Sim, você pode adicionar validação de tokens nos handlers.

**Q: Como debugar?**
A: Use `console.error()` para logs (não interfere com stdout) ou redirecione stderr para arquivo.
