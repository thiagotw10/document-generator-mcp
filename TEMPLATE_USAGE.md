# 🎨 Como o Agente Identifica e Usa Templates

## 📋 Visão Geral

O agente identifica templates através da **descrição do parâmetro** no schema da tool. Veja como funciona:

---

## 🔍 Como o Agente Vê os Templates

### **1. Schema com Templates**

```typescript
{
  name: 'gerar_documento_word',
  description: 'Cria um arquivo Microsoft Word (.docx) com templates elegantes',
  inputSchema: {
    properties: {
      template: { 
        type: 'string', 
        enum: ['professional', 'minimalist', 'corporate', 'default'],
        description: 'Template do documento: professional (linha azul, formal), minimalist (margens grandes, clean), corporate (título em caixa alta, empresarial), default (padrão simples)'
      }
    }
  }
}
```

### **2. Como o Agente Interpreta**

Quando o usuário diz:
- **"Crie um relatório profissional"** → Agente identifica palavra "profissional" → Usa `template: 'professional'`
- **"Faça um documento minimalista"** → Identifica "minimalista" → Usa `template: 'minimalist'`
- **"Gere um documento corporativo"** → Identifica "corporativo" → Usa `template: 'corporate'`
- **"Crie um documento"** → Sem palavra-chave → Usa `template: 'default'`

---

## 💬 Exemplos de Conversas

### **Exemplo 1: Template Profissional**

```
USUÁRIO: "Crie um relatório profissional sobre vendas"

AGENTE (analisa):
- Palavra-chave: "profissional"
- Descrição do template: "linha azul, formal"
- Decisão: usar template 'professional'

AGENTE → MCP:
{
  "name": "gerar_documento_word",
  "arguments": {
    "nome_arquivo": "relatorio_vendas",
    "titulo_documento": "Relatório de Vendas",
    "template": "professional",  ← Agente escolheu automaticamente
    "conteudo_principal": "..."
  }
}
```

### **Exemplo 2: Template Minimalista**

```
USUÁRIO: "Faça um documento clean e minimalista sobre o projeto"

AGENTE (analisa):
- Palavras-chave: "clean", "minimalista"
- Descrição do template: "margens grandes, clean"
- Decisão: usar template 'minimalist'

AGENTE → MCP:
{
  "template": "minimalist"  ← Identificou pelas palavras-chave
}
```

### **Exemplo 3: Template Corporativo**

```
USUÁRIO: "Preciso de um documento formal para apresentar à diretoria"

AGENTE (analisa):
- Contexto: "apresentar à diretoria" = corporativo
- Descrição do template: "empresarial"
- Decisão: usar template 'corporate'

AGENTE → MCP:
{
  "template": "corporate"  ← Inferiu pelo contexto
}
```

### **Exemplo 4: Sem Template Específico**

```
USUÁRIO: "Crie um documento sobre o projeto"

AGENTE (analisa):
- Sem palavra-chave específica
- Decisão: usar template padrão

AGENTE → MCP:
{
  "template": "default"  ← Usa padrão quando não especificado
}
```

---

## 🎯 Estratégias de Identificação do Agente

### **1. Palavras-Chave Diretas**
- "profissional" → `professional`
- "minimalista" → `minimalist`
- "corporativo" → `corporate`

### **2. Sinônimos e Contexto**
- "formal", "elegante" → `professional`
- "clean", "simples", "moderno" → `minimalist`
- "empresarial", "executivo", "diretoria" → `corporate`

### **3. Tipo de Documento**
- "relatório", "análise" → `professional`
- "portfólio", "currículo" → `minimalist`
- "proposta comercial", "apresentação executiva" → `corporate`

---

## 🔧 Implementação no Código

### **Schema Atualizado**

```typescript
const GerarDocumentInputSchema = z.object({
    nome_arquivo: z.string().min(1),
    titulo_documento: z.string().min(1),
    conteudo_principal: z.string().min(1),
    autor: z.string().optional().default("Agente MCP"),
    formato: z.enum(['word', 'pdf', 'ambos']).optional().default('word'),
    template: z.enum(['professional', 'minimalist', 'corporate', 'default']).optional().default('default')
});
```

### **Descrição na Tool**

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [{
            name: 'gerar_documento_word',
            description: 'Cria documentos Word com templates elegantes',
            inputSchema: {
                properties: {
                    template: { 
                        type: 'string', 
                        enum: ['professional', 'minimalist', 'corporate', 'default'],
                        description: `Template do documento:
                        - professional: Linha azul no cabeçalho, formal e elegante
                        - minimalist: Margens grandes, design clean e moderno
                        - corporate: Título em caixa alta, estilo empresarial
                        - default: Template padrão simples`
                    }
                }
            }
        }]
    };
});
```

### **Uso no Handler**

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = GerarDocumentInputSchema.parse(request.params.arguments);
    
    // Importa templates
    const { templates } = await import('./templates/wordTemplates.js');
    
    // Seleciona template baseado no parâmetro
    const templateFunc = templates[args.template || 'default'];
    
    // Gera cabeçalho com template escolhido
    const headerElements = templateFunc({
        titulo: args.titulo_documento,
        autor: args.autor
    });
    
    // Cria documento com template
    const doc = new Document({
        sections: [{
            children: [
                ...headerElements,  // ← Template aplicado aqui
                ...contentElements
            ]
        }]
    });
});
```

---

## 📊 Fluxo Completo

```
1. USUÁRIO
   "Crie um relatório profissional sobre vendas"
   
2. AGENTE (LLM)
   - Analisa: "profissional" = formal, elegante
   - Consulta schema: vê opção 'professional'
   - Lê descrição: "linha azul, formal e elegante"
   - Decisão: Perfeito! Vou usar 'professional'
   
3. AGENTE → MCP
   {
     "template": "professional",
     "titulo_documento": "Relatório de Vendas",
     ...
   }
   
4. MCP SERVER
   - Recebe: template = 'professional'
   - Carrega: templates.professional()
   - Aplica: Cabeçalho com linha azul
   - Gera: Documento formatado
   
5. RESULTADO
   📄 Documento Word com:
   - Título centralizado
   - Linha azul decorativa
   - Metadados coloridos
   - Formatação profissional
```

---

## 🎨 Dicas para Criar Boas Descrições

### ✅ Boas Descrições (Agente entende facilmente)

```typescript
description: 'professional: Linha azul no cabeçalho, formal e elegante para relatórios'
description: 'minimalist: Margens grandes, design clean para portfólios modernos'
description: 'corporate: Título em caixa alta, estilo empresarial para apresentações'
```

### ❌ Descrições Ruins (Agente não entende)

```typescript
description: 'professional: Template 1'  // Muito vago
description: 'minimalist: Tipo A'        // Sem contexto
description: 'corporate: Opção 3'        // Não descritivo
```

---

## 🚀 Melhorias Futuras

### **1. Detecção Automática por Conteúdo**
```typescript
// Agente analisa o conteúdo e sugere template
if (conteudo.includes('diretoria') || conteudo.includes('executivo')) {
    template = 'corporate';
}
```

### **2. Templates Contextuais**
```typescript
// Diferentes templates para diferentes tipos
templates: {
    'relatorio-vendas': 'professional',
    'portfolio': 'minimalist',
    'proposta-comercial': 'corporate'
}
```

### **3. Preview de Templates**
```typescript
// Agente pode mostrar preview antes de gerar
"Vou usar o template 'professional' (linha azul, formal). Deseja continuar?"
```

---

## 💡 Resumo

**O agente identifica templates através de:**
1. ✅ **Palavras-chave** no prompt do usuário
2. ✅ **Descrições detalhadas** no schema
3. ✅ **Contexto** da conversa
4. ✅ **Tipo de documento** solicitado

**Quanto melhor a descrição, mais precisa a escolha do agente!** 🎯
