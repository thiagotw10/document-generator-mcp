#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import PDFDocument from 'pdfkit';

const DOC_OUTPUT_DIR = path.join(process.cwd(), 'generated_documents');

const GerarDocumentInputSchema = z.object({
    nome_arquivo: z.string().min(1),
    titulo_documento: z.string().min(1),
    conteudo_principal: z.string().min(1),
    autor: z.string().optional().default("Agente MCP"),
    formato: z.enum(['word', 'pdf', 'ambos']).optional().default('word'),
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
                    formato: { type: 'string', enum: ['word', 'pdf', 'ambos'], description: 'Formato do documento (word, pdf ou ambos)' }
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

// Função para gerar PDF
const generatePDF = async (args: z.infer<typeof GerarDocumentInputSchema>): Promise<string> => {
    const nomeArquivoFinal = `${args.nome_arquivo.replace(/\.(docx|pdf)$/i, "")}_${Date.now()}.pdf`;
    const caminhoCompleto = path.join(DOC_OUTPUT_DIR, nomeArquivoFinal);
    
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const stream = require('fs').createWriteStream(caminhoCompleto);
        doc.pipe(stream);
        
        // Título
        doc.fontSize(20).font('Helvetica-Bold').text(args.titulo_documento, { align: 'center' });
        doc.moveDown(2);
        
        // Metadados
        doc.fontSize(12).font('Helvetica-Bold').text(`Autor: ${args.autor}`);
        doc.font('Helvetica').text(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
        doc.moveDown(2);
        
        // Conteúdo
        const lines = args.conteudo_principal.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                doc.moveDown(0.5);
            } else if (trimmed.startsWith('## ')) {
                doc.fontSize(16).font('Helvetica-Bold').text(trimmed.substring(3));
                doc.moveDown(0.5);
            } else if (trimmed.startsWith('### ')) {
                doc.fontSize(14).font('Helvetica-Bold').text(trimmed.substring(4));
                doc.moveDown(0.3);
            } else if (trimmed.startsWith('- ')) {
                doc.fontSize(12).font('Helvetica').text(`• ${trimmed.substring(2)}`);
            } else {
                doc.fontSize(12).font('Helvetica').text(trimmed);
                doc.moveDown(0.3);
            }
        }
        
        doc.end();
        stream.on('finish', () => resolve(caminhoCompleto));
        stream.on('error', reject);
    });
};

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
            
                // Processa o conteúdo markdown para Word
                const processContent = (content: string) => {
                    const lines = content.split('\n');
                    const elements: any[] = [];
                    
                    for (const line of lines) {
                        const trimmed = line.trim();
                        
                        if (!trimmed) {
                            elements.push(new Paragraph({ text: '' }));
                        } else if (trimmed.startsWith('## ')) {
                            elements.push(new Paragraph({
                                text: trimmed.substring(3),
                                heading: HeadingLevel.HEADING_2,
                                spacing: { before: 240, after: 120 }
                            }));
                        } else if (trimmed.startsWith('### ')) {
                            elements.push(new Paragraph({
                                text: trimmed.substring(4),
                                heading: HeadingLevel.HEADING_3,
                                spacing: { before: 200, after: 100 }
                            }));
                        } else if (trimmed.startsWith('- ')) {
                            elements.push(new Paragraph({
                                text: trimmed.substring(2),
                                bullet: { level: 0 },
                                spacing: { after: 60 }
                            }));
                        } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                            elements.push(new Paragraph({
                                children: [new TextRun({ text: trimmed.slice(2, -2), bold: true })],
                                spacing: { after: 120 }
                            }));
                        } else {
                            elements.push(new Paragraph({
                                text: trimmed,
                                spacing: { after: 120 }
                            }));
                        }
                    }
                    
                    return elements;
                };
                
                const contentElements = processContent(args.conteudo_principal);
                
                const docWord = new Document({
                    creator: args.autor,
                    title: args.titulo_documento,
                    sections: [{
                        children: [
                            new Paragraph({
                                text: args.titulo_documento,
                                heading: HeadingLevel.TITLE,
                                spacing: { after: 240 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `Autor: ${args.autor}`, bold: true }),
                                    new TextRun({ text: `\nData: ${new Date().toLocaleDateString('pt-BR')}` }),
                                ],
                                spacing: { after: 300 }
                            }),
                            ...contentElements
                        ],
                    }],
                });
                
                const buffer = await Packer.toBuffer(docWord);
                await fs.writeFile(caminhoWord, buffer);
                resultados.push(`Word: ${caminhoWord}`);
            }
            
            if (formato === 'pdf' || formato === 'ambos') {
                const caminhoPdf = await generatePDF(args);
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