import PDFDocument from 'pdfkit';
import * as fs from 'fs';

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

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

        // Título
        doc.fontSize(24).font('Helvetica-Bold').text(titulo, { align: 'center', width: pageWidth });
        doc.moveDown(1);

        // Metadados
        doc.fontSize(10).font('Helvetica').fillColor('#666666');
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

            // Headings
            if (line.startsWith('#### ')) {
                checkPageSpace(doc, 40);
                doc.fontSize(12).font('Helvetica-Bold').text(line.substring(5), { width: pageWidth });
                doc.moveDown(0.3);
                i++;
                continue;
            }

            if (line.startsWith('### ')) {
                checkPageSpace(doc, 50);
                doc.fontSize(14).font('Helvetica-Bold').text(line.substring(4), { width: pageWidth });
                doc.moveDown(0.4);
                i++;
                continue;
            }

            if (line.startsWith('## ')) {
                checkPageSpace(doc, 60);
                doc.fontSize(16).font('Helvetica-Bold').fillColor('#2563EB').text(line.substring(3), { width: pageWidth });
                doc.fillColor('#000000');
                doc.moveDown(0.5);
                i++;
                continue;
            }

            if (line.startsWith('# ')) {
                checkPageSpace(doc, 70);
                doc.fontSize(20).font('Helvetica-Bold').text(line.substring(2), { width: pageWidth });
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
                doc.fontSize(11).font('Helvetica-Oblique').fillColor('#666666');
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
    doc.fontSize(9).font('Courier');
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
    doc.fontSize(9).font('Courier-Bold').fillColor('#4EC9B0');
    doc.rect(codeBlockX, doc.y - 5, codeBlockWidth, 20).fill('#1E1E1E');
    doc.fillColor('#4EC9B0').text(`▶ ${language.toUpperCase()}`, codeBlockX + 10, doc.y - 2);
    doc.moveDown(0.3);

    // Código com syntax highlighting
    codeLines.forEach(line => {
        const startY = doc.y;
        
        // Calcula altura
        doc.fontSize(9).font('Courier');
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

    doc.fontSize(9).font('Courier');

    // Se não há tokens, apenas imprime o texto simples
    if (tokens.length === 0) {
        doc.fillColor('#D4D4D4').text(line, { width: maxWidth });
        return;
    }

    let pos = 0;
    for (const token of tokens) {
        if (token.start > pos) {
            doc.fillColor('#D4D4D4').text(line.substring(pos, token.start), { continued: true, width: maxWidth });
        }
        doc.fillColor(token.color).text(token.text, { continued: true, width: maxWidth });
        pos = token.end;
    }

    if (pos < line.length) {
        doc.fillColor('#D4D4D4').text(line.substring(pos), { width: maxWidth });
    } else {
        doc.text('', { width: maxWidth });
    }
}

function processInlineFormatting(doc: PDFKit.PDFDocument, text: string, fontSize: number, maxWidth: number): void {
    doc.fontSize(fontSize);
    let remaining = text;

    while (remaining.length > 0) {
        // Negrito e itálico ***texto***
        let match = remaining.match(/^(.*?)\*\*\*(.+?)\*\*\*(.*)/);
        if (match) {
            if (match[1]) {
                doc.font('Helvetica').text(match[1], { continued: true, width: maxWidth });
            }
            doc.font('Helvetica-BoldOblique').text(match[2], { continued: true, width: maxWidth });
            remaining = match[3];
            continue;
        }

        // Negrito **texto**
        match = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/);
        if (match) {
            if (match[1]) {
                doc.font('Helvetica').text(match[1], { continued: true, width: maxWidth });
            }
            doc.font('Helvetica-Bold').text(match[2], { continued: true, width: maxWidth });
            remaining = match[3];
            continue;
        }

        // Itálico *texto*
        match = remaining.match(/^(.*?)\*(.+?)\*(.*)/);
        if (match) {
            if (match[1]) {
                doc.font('Helvetica').text(match[1], { continued: true, width: maxWidth });
            }
            doc.font('Helvetica-Oblique').text(match[2], { continued: true, width: maxWidth });
            remaining = match[3];
            continue;
        }

        // Código `texto`
        match = remaining.match(/^(.*?)`(.+?)`(.*)/);
        if (match) {
            if (match[1]) {
                doc.font('Helvetica').text(match[1], { continued: true, width: maxWidth });
            }
            doc.font('Courier').fillColor('#E01E5A').text(match[2], { continued: true, width: maxWidth });
            doc.fillColor('#000000');
            remaining = match[3];
            continue;
        }

        // Sem formatação
        doc.font('Helvetica').text(remaining, { width: maxWidth });
        break;
    }
}
