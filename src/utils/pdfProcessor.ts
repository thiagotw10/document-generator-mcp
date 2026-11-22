import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { registerPDFFonts, getPDFFonts } from './pdfFonts';

function checkPageSpace(doc: PDFKit.PDFDocument, requiredSpace: number): void {
    if (doc.y + requiredSpace > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
    }
}

export async function generateAdvancedPDF(
    outputPath: string,
    titulo: string,
    autor: string,
    conteudo: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Register Unicode-capable fonts before drawing anything. The built-in
        // fonts cannot represent characters outside latin-1.
        registerPDFFonts(doc);
        const F = getPDFFonts();

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

        // Título
        doc.fontSize(24).font(F.bold).text(titulo, { align: 'center', width: pageWidth });
        doc.moveDown(1);

        // Metadados
        doc.fontSize(10).font(F.regular).fillColor('#666666');
        doc.text(`Autor: ${autor} | Data: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center', width: pageWidth });
        doc.moveDown(2);
        doc.fillColor('#000000');

        // Processar conteúdo
        const lines = conteudo.split('\n');
        let i = 0;

        while (i < lines.length) {
            const line = lines[i].trim();

            if (!line) {
                doc.moveDown(0.5);
                i++;
                continue;
            }

            // Bloco de código
            if (line.startsWith('```')) {
                const result = processCodeBlock(doc, lines, i);
                i = result.nextIndex;
                continue;
            }
            
            // Detectar JSON/objeto solto
            if (line.startsWith('{') || line.startsWith('[')) {
                const jsonResult = detectAndProcessJSONPDF(doc, lines, i);
                if (jsonResult) {
                    i = jsonResult.nextIndex;
                    continue;
                }
            }

            // Headings
            if (line.startsWith('#### ')) {
                checkPageSpace(doc, 40);
                doc.fontSize(12).font(F.bold).text(line.substring(5), { width: pageWidth });
                doc.moveDown(0.3);
                i++;
                continue;
            }

            if (line.startsWith('### ')) {
                checkPageSpace(doc, 50);
                doc.fontSize(14).font(F.bold).text(line.substring(4), { width: pageWidth });
                doc.moveDown(0.4);
                i++;
                continue;
            }

            if (line.startsWith('## ')) {
                checkPageSpace(doc, 60);
                doc.fontSize(16).font(F.bold).fillColor('#2563EB').text(line.substring(3), { width: pageWidth });
                doc.fillColor('#000000');
                doc.moveDown(0.5);
                i++;
                continue;
            }

            if (line.startsWith('# ')) {
                checkPageSpace(doc, 70);
                doc.fontSize(20).font(F.bold).text(line.substring(2), { width: pageWidth });
                doc.moveDown(0.6);
                i++;
                continue;
            }

            // Lista com bullets
            if (line.startsWith('- ') || line.startsWith('* ')) {
                checkPageSpace(doc, 30);
                processInlineFormatting(doc, `• ${line.substring(2)}`, 11, pageWidth);
                doc.moveDown(0.2);
                i++;
                continue;
            }

            // Lista numerada
            if (/^\d+\.\s/.test(line)) {
                checkPageSpace(doc, 30);
                processInlineFormatting(doc, line, 11, pageWidth);
                doc.moveDown(0.2);
                i++;
                continue;
            }

            // Blockquote
            if (line.startsWith('> ')) {
                checkPageSpace(doc, 40);
                doc.fontSize(11).font(F.oblique).fillColor('#666666');
                const x = doc.x;
                doc.x = x + 20;
                processInlineFormatting(doc, line.substring(2), 11, pageWidth - 20);
                doc.x = x;
                doc.fillColor('#000000');
                doc.moveDown(0.4);
                i++;
                continue;
            }

            // Linha horizontal
            if (line === '---' || line === '***' || line === '___') {
                doc.moveDown(0.3);
                doc.strokeColor('#CCCCCC').lineWidth(1)
                   .moveTo(doc.x, doc.y)
                   .lineTo(doc.page.width - 100, doc.y)
                   .stroke();
                doc.moveDown(0.3);
                i++;
                continue;
            }

            // Tabela Markdown
            if (line.startsWith('|')) {
                const tableResult = processTablePDF(doc, lines, i, pageWidth);
                if (tableResult) {
                    i = tableResult.nextIndex;
                    continue;
                }
            }

            // Parágrafo normal
            checkPageSpace(doc, 30);
            processInlineFormatting(doc, line, 11, pageWidth);
            doc.moveDown(0.4);
            i++;
        }

        doc.end();
        stream.on('finish', () => resolve());
        stream.on('error', reject);
    });
}

function processCodeBlock(doc: PDFKit.PDFDocument, lines: string[], startIndex: number): { nextIndex: number } {
    const F = getPDFFonts();
    let i = startIndex + 1;
    const codeLines: string[] = [];
    const firstLine = lines[startIndex].trim();
    const language = firstLine.replace('```', '').trim() || 'code';

    while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
    }

    const codeBlockWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const codeBlockX = doc.page.margins.left;

    // Calcula altura total do bloco
    doc.fontSize(9).font(F.mono);
    let totalHeight = 30; // Cabeçalho + rodapé
    codeLines.forEach(line => {
        totalHeight += doc.heightOfString(line || ' ', { width: codeBlockWidth - 20 }) + 4;
    });

    // Verifica se há espaço suficiente, senão cria nova página
    if (doc.y + totalHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
    }

    doc.moveDown(0.5);

    // Cabeçalho do bloco
    doc.fontSize(9).font(F.monoBold).fillColor('#4EC9B0');
    doc.rect(codeBlockX, doc.y - 5, codeBlockWidth, 20).fill('#1E1E1E');
    doc.fillColor('#4EC9B0').text(`▶ ${language.toUpperCase()}`, codeBlockX + 10, doc.y - 2);
    doc.moveDown(0.3);

    // Código com syntax highlighting
    codeLines.forEach(line => {
        const startY = doc.y;
        
        // Calcula altura
        doc.fontSize(9).font(F.mono);
        const textHeight = doc.heightOfString(line || ' ', {
            width: codeBlockWidth - 20
        });
        
        // Desenha fundo com altura correta
        doc.rect(codeBlockX, startY - 2, codeBlockWidth, textHeight + 4).fill('#1E1E1E');
        
        // Renderiza com syntax highlighting
        doc.x = codeBlockX + 10;
        doc.y = startY;
        applySyntaxHighlightingPDF(doc, line || ' ', language, codeBlockWidth - 20);
    });

    // Rodapé
    doc.rect(codeBlockX, doc.y, codeBlockWidth, 8).fill('#1E1E1E');
    doc.moveDown(1.5);
    doc.fillColor('#000000');

    return { nextIndex: i + 1 };
}

function applySyntaxHighlightingPDF(doc: PDFKit.PDFDocument, line: string, language: string, maxWidth: number): void {
    const F = getPDFFonts();
    const keywords = /\b(function|const|let|var|if|else|return|import|export|class|interface|type|async|await|for|while|switch|case|break|continue|try|catch|throw|new|this|super|extends|implements|public|private|protected|static|void|null|undefined|true|false|from|as|default|enum|namespace)\b/g;
    const strings = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
    const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/g;
    const numbers = /\b(\d+\.?\d*|0x[0-9a-fA-F]+)\b/g;

    const tokens: Array<{ start: number; end: number; color: string; text: string }> = [];

    let match;
    while ((match = comments.exec(line)) !== null) {
        tokens.push({ start: match.index, end: match.index + match[0].length, color: '#6A9955', text: match[0] });
    }

    while ((match = strings.exec(line)) !== null) {
        if (!tokens.some(t => match!.index >= t.start && match!.index < t.end)) {
            tokens.push({ start: match.index, end: match.index + match[0].length, color: '#CE9178', text: match[0] });
        }
    }

    while ((match = keywords.exec(line)) !== null) {
        if (!tokens.some(t => match!.index >= t.start && match!.index < t.end)) {
            tokens.push({ start: match.index, end: match.index + match[0].length, color: '#C586C0', text: match[0] });
        }
    }

    while ((match = numbers.exec(line)) !== null) {
        if (!tokens.some(t => match!.index >= t.start && match!.index < t.end)) {
            tokens.push({ start: match.index, end: match.index + match[0].length, color: '#B5CEA8', text: match[0] });
        }
    }

    tokens.sort((a, b) => a.start - b.start);

    doc.fontSize(9).font(F.mono);

    // Build the list of chunks first, then emit them with an explicit
    // `continued` flag. An empty trailing text() call must never be used as a
    // line terminator: pdfkit keeps the continued state open across it and the
    // following line gets glued onto the previous one.
    const chunks: Array<{ text: string; color: string }> = [];
    let pos = 0;
    for (const token of tokens) {
        if (token.start > pos) {
            chunks.push({ text: line.substring(pos, token.start), color: '#D4D4D4' });
        }
        chunks.push({ text: token.text, color: token.color });
        pos = token.end;
    }
    if (pos < line.length) {
        chunks.push({ text: line.substring(pos), color: '#D4D4D4' });
    }
    if (chunks.length === 0) {
        chunks.push({ text: line, color: '#D4D4D4' });
    }

    chunks.forEach((chunk, index) => {
        doc.fillColor(chunk.color).font(F.mono)
           .text(chunk.text, { continued: index < chunks.length - 1, width: maxWidth });
    });
}

function detectAndProcessJSONPDF(doc: PDFKit.PDFDocument, lines: string[], startIndex: number): { nextIndex: number } | null {
    const F = getPDFFonts();
    const firstLine = lines[startIndex].trim();
    if (!firstLine.startsWith('{') && !firstLine.startsWith('[')) return null;
    
    const jsonLines: string[] = [];
    let i = startIndex;
    let braceCount = 0;
    let bracketCount = 0;
    
    // Contar chaves/colchetes para detectar fim do JSON
    while (i < lines.length) {
        const line = lines[i];
        jsonLines.push(line);
        
        for (const char of line) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            if (char === '[') bracketCount++;
            if (char === ']') bracketCount--;
        }
        
        i++;
        
        // Se fechou todas as chaves/colchetes, terminou o JSON
        if (braceCount === 0 && bracketCount === 0 && jsonLines.length > 0) {
            break;
        }
        
        // Limite de segurança
        if (i - startIndex > 100) break;
    }
    
    // Tentar validar se é JSON válido
    try {
        JSON.parse(jsonLines.join('\n'));
    } catch {
        return null; // Não é JSON válido
    }
    
    // Processar como bloco de código
    const codeBlockWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const codeBlockX = doc.page.margins.left;
    
    // Calcula altura total
    doc.fontSize(9).font(F.mono);
    let totalHeight = 30;
    jsonLines.forEach(line => {
        totalHeight += doc.heightOfString(line || ' ', { width: codeBlockWidth - 20 }) + 4;
    });
    
    // Verifica espaço
    if (doc.y + totalHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
    }
    
    doc.moveDown(0.5);
    
    // Cabeçalho
    doc.fontSize(9).font(F.monoBold).fillColor('#4EC9B0');
    doc.rect(codeBlockX, doc.y - 5, codeBlockWidth, 20).fill('#1E1E1E');
    doc.fillColor('#4EC9B0').text(`▶ JSON`, codeBlockX + 10, doc.y - 2);
    doc.moveDown(0.3);
    
    // Conteúdo
    jsonLines.forEach(line => {
        const startY = doc.y;
        doc.fontSize(9).font(F.mono);
        const textHeight = doc.heightOfString(line || ' ', { width: codeBlockWidth - 20 });
        doc.rect(codeBlockX, startY - 2, codeBlockWidth, textHeight + 4).fill('#1E1E1E');
        doc.x = codeBlockX + 10;
        doc.y = startY;
        applySyntaxHighlightingPDF(doc, line || ' ', 'json', codeBlockWidth - 20);
    });
    
    // Rodapé
    doc.rect(codeBlockX, doc.y, codeBlockWidth, 8).fill('#1E1E1E');
    doc.moveDown(1.5);
    doc.fillColor('#000000');
    
    return { nextIndex: i };
}

function processInlineFormatting(doc: PDFKit.PDFDocument, text: string, fontSize: number, maxWidth: number): void {
    const F = getPDFFonts();
    doc.fontSize(fontSize);

    // Collect styled chunks first and emit them afterwards with explicit
    // `continued` flags. Ending a paragraph with an empty text() call (which
    // happened whenever a line finished with an inline marker) left pdfkit's
    // continued state open and glued the next paragraph onto the same line.
    const chunks: Array<{ font: string; color: string; text: string }> = [];
    let remaining = text;

    while (remaining.length > 0) {
        // Negrito e itálico ***texto***
        let match = remaining.match(/^(.*?)\*\*\*(.+?)\*\*\*(.*)/);
        if (match) {
            if (match[1]) chunks.push({ font: F.regular, color: '#000000', text: match[1] });
            chunks.push({ font: F.boldOblique, color: '#000000', text: match[2] });
            remaining = match[3];
            continue;
        }

        // Negrito **texto**
        match = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/);
        if (match) {
            if (match[1]) chunks.push({ font: F.regular, color: '#000000', text: match[1] });
            chunks.push({ font: F.bold, color: '#000000', text: match[2] });
            remaining = match[3];
            continue;
        }

        // Itálico *texto*
        match = remaining.match(/^(.*?)\*(.+?)\*(.*)/);
        if (match) {
            if (match[1]) chunks.push({ font: F.regular, color: '#000000', text: match[1] });
            chunks.push({ font: F.oblique, color: '#000000', text: match[2] });
            remaining = match[3];
            continue;
        }

        // Código `texto`
        match = remaining.match(/^(.*?)`(.+?)`(.*)/);
        if (match) {
            if (match[1]) chunks.push({ font: F.regular, color: '#000000', text: match[1] });
            chunks.push({ font: F.mono, color: '#E01E5A', text: match[2] });
            remaining = match[3];
            continue;
        }

        // Sem formatação
        chunks.push({ font: F.regular, color: '#000000', text: remaining });
        break;
    }

    if (chunks.length === 0) {
        doc.font(F.regular).fillColor('#000000').text('', { width: maxWidth });
        return;
    }

    chunks.forEach((chunk, index) => {
        doc.font(chunk.font).fillColor(chunk.color)
           .text(chunk.text, { continued: index < chunks.length - 1, width: maxWidth });
    });
    doc.fillColor('#000000');
}

/**
 * Splits a Markdown table row into cells.
 *
 * Empty cells are preserved rather than filtered out, so columns keep their
 * alignment, and escaped pipes inside a cell are unescaped.
 */
function splitTableRow(line: string): string[] {
    let trimmed = line.trim();
    if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
    if (trimmed.endsWith('|') && !trimmed.endsWith('\\|')) trimmed = trimmed.slice(0, -1);
    return trimmed.split(/(?<!\\)\|/).map(cell => cell.replace(/\\\|/g, '|').trim());
}

function isTableSeparatorRow(cells: string[]): boolean {
    return cells.length > 0 && cells.every(cell => /^:?-+:?$/.test(cell));
}

/**
 * Table cells are rendered as plain text: inline markers are stripped instead of
 * styled, because a cell is placed at absolute coordinates and cannot use the
 * `continued` text flow that inline formatting depends on.
 */
function stripInlineMarkdown(text: string): string {
    return text
        .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/`(.+?)`/g, '$1');
}

/**
 * Renders a Markdown table as a real table: header row, borders, cell wrapping
 * and header repetition across page breaks.
 *
 * Returns null when the block is not a table (missing `|---|` separator row) so
 * the caller can fall back to plain paragraph rendering.
 */
function processTablePDF(
    doc: PDFKit.PDFDocument,
    lines: string[],
    startIndex: number,
    pageWidth: number
): { nextIndex: number } | null {
    const F = getPDFFonts();

    const tableLines: string[] = [];
    let i = startIndex;
    while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
    }
    if (tableLines.length < 2) return null;

    const rows = tableLines.map(line => splitTableRow(line).map(stripInlineMarkdown));
    if (!isTableSeparatorRow(rows[1])) return null;

    const header = rows[0];
    const body = rows.slice(2);
    const columnCount = header.length;
    if (columnCount === 0) return null;

    const fontSize = 9;
    const padX = 6;
    const padY = 4;
    const lineGap = 2;
    const minContent = 36;

    // Column widths are proportional to the widest cell in each column, so a
    // short table keeps its natural shape while a wide one wraps instead of
    // overflowing the page.
    doc.fontSize(fontSize);
    const natural: number[] = new Array(columnCount).fill(1);
    [header, ...body].forEach((row, rowIndex) => {
        doc.font(rowIndex === 0 ? F.bold : F.regular);
        for (let c = 0; c < columnCount; c++) {
            natural[c] = Math.max(natural[c], doc.widthOfString(row[c] ?? ''));
        }
    });

    const contentWidth = Math.max(pageWidth - columnCount * 2 * padX, columnCount * minContent);
    const totalNatural = natural.reduce((a, b) => a + b, 0);
    const colContent = natural.map(n => Math.max(minContent, Math.floor(contentWidth * (n / totalNatural))));
    // Absorb rounding drift in the last column so the table spans exactly the
    // available width.
    const drift = contentWidth - colContent.reduce((a, b) => a + b, 0);
    colContent[colContent.length - 1] = Math.max(minContent, colContent[colContent.length - 1] + drift);

    const columnWidth = (c: number) => colContent[c] + 2 * padX;

    const measureRow = (cells: string[], font: string): number => {
        doc.font(font).fontSize(fontSize);
        let tallest = 0;
        for (let c = 0; c < columnCount; c++) {
            tallest = Math.max(tallest, doc.heightOfString(cells[c] || ' ', { width: colContent[c], lineGap }));
        }
        return tallest + 2 * padY;
    };

    const left = doc.page.margins.left;
    const bottomLimit = doc.page.height - doc.page.margins.bottom;
    const headerHeight = measureRow(header, F.bold);

    const drawRow = (cells: string[], top: number, isHeader: boolean): void => {
        const height = isHeader ? headerHeight : measureRow(cells, F.regular);

        doc.rect(left, top, pageWidth, height).fill(isHeader ? '#EFF3FB' : '#FFFFFF');

        let x = left;
        for (let c = 0; c < columnCount; c++) {
            doc.font(isHeader ? F.bold : F.regular).fontSize(fontSize).fillColor('#111827');
            doc.text(cells[c] ?? '', x + padX, top + padY, { width: colContent[c], lineGap });
            x += columnWidth(c);
        }
        doc.fillColor('#000000');

        doc.strokeColor('#D1D5DB').lineWidth(0.5);
        let separatorX = left;
        for (let c = 0; c < columnCount - 1; c++) {
            separatorX += columnWidth(c);
            doc.moveTo(separatorX, top).lineTo(separatorX, top + height).stroke();
        }
        doc.moveTo(left, top + height).lineTo(left + pageWidth, top + height).stroke();
        doc.strokeColor('#000000');
    };

    checkPageSpace(doc, headerHeight + 30);

    let y = doc.y;
    drawRow(header, y, true);
    y += headerHeight;

    body.forEach(cells => {
        const height = measureRow(cells, F.regular);
        if (y + height > bottomLimit) {
            doc.addPage();
            y = doc.page.margins.top;
            // Repeat the header so a table split across pages stays readable.
            drawRow(header, y, true);
            y += headerHeight;
        }
        drawRow(cells, y, false);
        y += height;
    });

    doc.x = left;
    doc.y = y + 6;
    return { nextIndex: i };
}
