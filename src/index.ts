#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { templates } from './templates/wordTemplates.js';
import { processMarkdownToWord } from './utils/markdownProcessor.js';
import { generateAdvancedPDF } from './utils/pdfProcessor.js';

const DOC_OUTPUT_DIR = path.join(process.cwd(), 'generated_documents');

const GerarDocumentInputSchema = z.object({
    nome_arquivo: z.string().min(1),
    titulo_documento: z.string().min(1),
    conteudo_principal: z.string().min(1),
    autor: z.string().optional().default("Agente MCP"),
    formato: z.enum(['word', 'pdf', 'ambos']).optional().default('word'),
    template: z.enum(['professional', 'minimalist', 'corporate', 'default']).optional().default('default'),
});

const server = new Server({
    name: 'gerador-documento-docx',
    version: '1.0.0'
}, {
    capabilities: {
        tools: {}
    }
});

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
                    formato: { type: 'string', enum: ['word', 'pdf', 'ambos'], description: 'Formato do documento (word, pdf ou ambos)' },
                    template: { type: 'string', enum: ['professional', 'minimalist', 'corporate', 'default'], description: 'Template do documento: professional (linha azul, formal e elegante), minimalist (margens grandes, design clean), corporate (título em caixa alta, empresarial), default (padrão simples)' }
                },
                required: ['nome_arquivo', 'titulo_documento', 'conteudo_principal']
            }
        }, {
            name: 'gerar_documento_pdf',
            description: 'Cria um arquivo PDF',
            inputSchema: {
                type: 'object',
                properties: {
                    nome_arquivo: { type: 'string', description: 'Nome do arquivo sem extensão' },
                    titulo_documento: { type: 'string', description: 'Título do documento' },
                    conteudo_principal: { type: 'string', description: 'Conteúdo principal' },
                    autor: { type: 'string', description: 'Autor do documento' }
                },
                required: ['nome_arquivo', 'titulo_documento', 'conteudo_principal']
            }
        }]
    };
});



server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'gerar_documento_word' || request.params.name === 'gerar_documento_pdf') {
        const args = GerarDocumentInputSchema.parse(request.params.arguments);
        
        try {
            await fs.mkdir(DOC_OUTPUT_DIR, { recursive: true });
            
            const resultados: string[] = [];
            
            // Determina qual formato gerar
            const formato = request.params.name === 'gerar_documento_pdf' ? 'pdf' : (args.formato || 'word');
            
            if (formato === 'word' || formato === 'ambos') {
                const nomeArquivoWord = `${args.nome_arquivo.replace(/\.(docx|pdf)$/i, "")}_${Date.now()}.docx`;
                const caminhoWord = path.join(DOC_OUTPUT_DIR, nomeArquivoWord);
            
                // Processa o conteúdo markdown com processador avançado
                const contentElements = processMarkdownToWord(args.conteudo_principal);
                
                // Seleciona template
                const templateFunc = templates[args.template || 'default'];
                const headerElements = templateFunc({
                    titulo: args.titulo_documento,
                    autor: args.autor
                });
                
                const docWord = new Document({
                    creator: args.autor,
                    title: args.titulo_documento,
                    sections: [{
                        children: [
                            ...headerElements,
                            ...contentElements
                        ],
                    }],
                });
                
                const buffer = await Packer.toBuffer(docWord);
                await fs.writeFile(caminhoWord, buffer);
                resultados.push(`Word: ${caminhoWord}`);
            }
            
            if (formato === 'pdf' || formato === 'ambos') {
                const nomeArquivoPdf = `${args.nome_arquivo.replace(/\.(docx|pdf)$/i, "")}_${Date.now()}.pdf`;
                const caminhoPdf = path.join(DOC_OUTPUT_DIR, nomeArquivoPdf);
                await generateAdvancedPDF(caminhoPdf, args.titulo_documento, args.autor, args.conteudo_principal);
                resultados.push(`PDF: ${caminhoPdf}`);
            }
            
            return {
                content: [{
                    type: 'text',
                    text: `Documento "${args.titulo_documento}" gerado:\n${resultados.join('\n')}`
                }]
            };
        } catch (error) {
            return {
                content: [{
                    type: 'text',
                    text: `Erro: ${(error as Error).message}`
                }],
                isError: true
            };
        }
    }
    
    throw new Error('Tool não encontrada');
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(console.error);