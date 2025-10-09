import { Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, AlignmentType, WidthType } from 'docx';

export function processMarkdownToWord(content: string): any[] {
    const lines = content.split('\n');
    const elements: any[] = [];
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        
        if (!trimmed) {
            elements.push(new Paragraph({ text: '' }));
            i++;
            continue;
        }
        
        // Tabelas
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            const tableResult = processTable(lines, i);
            elements.push(tableResult.table);
            i = tableResult.nextIndex;
            continue;
        }
        
        // Código em bloco
        if (trimmed.startsWith('```')) {
            const codeResult = processCodeBlock(lines, i);
            elements.push(...codeResult.paragraphs);
            i = codeResult.nextIndex;
            continue;
        }
        
        // Detectar JSON/objeto solto
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            const jsonResult = detectAndProcessJSON(lines, i);
            if (jsonResult) {
                elements.push(...jsonResult.paragraphs);
                i = jsonResult.nextIndex;
                continue;
            }
        }
        
        // Headings
        if (trimmed.startsWith('#### ')) {
            elements.push(new Paragraph({
                text: trimmed.substring(5),
                heading: HeadingLevel.HEADING_4,
                spacing: { before: 200, after: 100 }
            }));
            i++;
            continue;
        }
        
        if (trimmed.startsWith('### ')) {
            elements.push(new Paragraph({
                text: trimmed.substring(4),
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 240, after: 120 }
            }));
            i++;
            continue;
        }
        
        if (trimmed.startsWith('## ')) {
            elements.push(new Paragraph({
                text: trimmed.substring(3),
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 150 }
            }));
            i++;
            continue;
        }
        
        if (trimmed.startsWith('# ')) {
            elements.push(new Paragraph({
                text: trimmed.substring(2),
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
            }));
            i++;
            continue;
        }
        
        // Listas numeradas
        if (/^\d+\.\s/.test(trimmed)) {
            const listResult = processNumberedList(lines, i);
            elements.push(...listResult.paragraphs);
            i = listResult.nextIndex;
            continue;
        }
        
        // Listas com bullets
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) {
            elements.push(new Paragraph({
                children: processInlineFormatting(trimmed.substring(2)),
                bullet: { level: 0 },
                spacing: { after: 60 }
            }));
            i++;
            continue;
        }
        
        // Blockquote
        if (trimmed.startsWith('> ')) {
            const runs = processInlineFormatting(trimmed.substring(2));
            runs.forEach(run => (run as any).italics = true);
            elements.push(new Paragraph({
                children: runs,
                indent: { left: 720 },
                spacing: { after: 120 }
            }));
            i++;
            continue;
        }
        
        // Linha horizontal
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            elements.push(new Paragraph({
                text: '',
                border: { bottom: { color: 'CCCCCC', space: 1, style: 'single', size: 6 } },
                spacing: { before: 120, after: 120 }
            }));
            i++;
            continue;
        }
        
        // Parágrafo normal
        elements.push(new Paragraph({
            children: processInlineFormatting(trimmed),
            spacing: { after: 120 }
        }));
        i++;
    }
    
    return elements;
}

function processInlineFormatting(text: string): TextRun[] {
    const runs: TextRun[] = [];
    let remaining = text;
    
    while (remaining.length > 0) {
        // Negrito e itálico ***texto***
        let match = remaining.match(/^(.*?)\*\*\*(.+?)\*\*\*(.*)/);
        if (match) {
            if (match[1]) runs.push(new TextRun({ text: match[1] }));
            runs.push(new TextRun({ text: match[2], bold: true, italics: true }));
            remaining = match[3];
            continue;
        }
        
        // Negrito **texto**
        match = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/);
        if (match) {
            if (match[1]) runs.push(new TextRun({ text: match[1] }));
            runs.push(new TextRun({ text: match[2], bold: true }));
            remaining = match[3];
            continue;
        }
        
        // Itálico *texto*
        match = remaining.match(/^(.*?)\*(.+?)\*(.*)/);
        if (match) {
            if (match[1]) runs.push(new TextRun({ text: match[1] }));
            runs.push(new TextRun({ text: match[2], italics: true }));
            remaining = match[3];
            continue;
        }
        
        // Código `texto`
        match = remaining.match(/^(.*?)`(.+?)`(.*)/);
        if (match) {
            if (match[1]) runs.push(new TextRun({ text: match[1] }));
            runs.push(new TextRun({ text: match[2], font: 'Courier New', shading: { fill: 'F5F5F5' } }));
            remaining = match[3];
            continue;
        }
        
        // Tachado ~~texto~~
        match = remaining.match(/^(.*?)~~(.+?)~~(.*)/);
        if (match) {
            if (match[1]) runs.push(new TextRun({ text: match[1] }));
            runs.push(new TextRun({ text: match[2], strike: true }));
            remaining = match[3];
            continue;
        }
        
        // Sem formatação
        runs.push(new TextRun({ text: remaining }));
        break;
    }
    
    return runs.length > 0 ? runs : [new TextRun({ text: text })];
}

function processTable(lines: string[], startIndex: number): { table: Table, nextIndex: number } {
    const tableLines: string[] = [];
    let i = startIndex;
    
    while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
    }
    
    const rows = tableLines.map(line => 
        line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0)
    );
    
    const dataRows = rows.filter((row, index) => 
        !(index === 1 && row.every(cell => /^-+$/.test(cell)))
    );
    
    const tableRows = dataRows.map((row, rowIndex) => {
        return new TableRow({
            children: row.map(cellText => {
                return new TableCell({
                    children: [new Paragraph({
                        children: processInlineFormatting(cellText),
                        alignment: AlignmentType.LEFT
                    })],
                    shading: rowIndex === 0 ? { fill: 'E8E8E8' } : undefined
                });
            })
        });
    });
    
    return { table: new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }), nextIndex: i };
}

function processCodeBlock(lines: string[], startIndex: number): { paragraphs: Paragraph[], nextIndex: number } {
    let i = startIndex + 1;
    const codeLines: string[] = [];
    const firstLine = lines[startIndex].trim();
    const language = firstLine.replace('```', '').trim() || 'code';
    
    while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
    }
    
    const paragraphs: Paragraph[] = [];
    
    // Cabeçalho do bloco de código (tema dark)
    paragraphs.push(new Paragraph({
        children: [new TextRun({ 
            text: `▶ ${language.toUpperCase()}`,
            font: 'Consolas',
            size: 18,
            bold: true,
            color: '4EC9B0'
        })],
        shading: { fill: '1E1E1E' },
        spacing: { before: 240, after: 0 },
        border: {
            top: { color: '3E3E42', space: 1, style: 'single', size: 6 },
            left: { color: '3E3E42', space: 1, style: 'single', size: 6 },
            right: { color: '3E3E42', space: 1, style: 'single', size: 6 }
        },
        keepNext: true
    }));
    
    // Conteúdo do código com syntax highlighting
    codeLines.forEach((line, index) => {
        paragraphs.push(new Paragraph({
            children: applySyntaxHighlighting(line, language),
            shading: { fill: '1E1E1E' },
            spacing: { before: 0, after: 0, line: 276 },
            indent: { left: 360, right: 360 },
            border: {
                left: { color: '3E3E42', space: 1, style: 'single', size: 6 },
                right: { color: '3E3E42', space: 1, style: 'single', size: 6 }
            },
            keepNext: index < codeLines.length - 1,
            keepLines: true
        }));
    });
    
    // Rodapé do bloco de código
    paragraphs.push(new Paragraph({
        text: '',
        shading: { fill: '1E1E1E' },
        spacing: { before: 0, after: 240 },
        border: {
            bottom: { color: '3E3E42', space: 1, style: 'single', size: 6 },
            left: { color: '3E3E42', space: 1, style: 'single', size: 6 },
            right: { color: '3E3E42', space: 1, style: 'single', size: 6 }
        }
    }));
    
    return { paragraphs, nextIndex: i + 1 };
}

function applySyntaxHighlighting(line: string, language: string): TextRun[] {
    if (!line.trim()) return [new TextRun({ text: ' ', font: 'Consolas', size: 20 })];
    
    const runs: TextRun[] = [];
    const keywords = /\b(function|const|let|var|if|else|return|import|export|class|interface|type|async|await|for|while|switch|case|break|continue|try|catch|throw|new|this|super|extends|implements|public|private|protected|static|void|null|undefined|true|false|from|as|default|enum|namespace)\b/g;
    const strings = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
    const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/g;
    const numbers = /\b(\d+\.?\d*|0x[0-9a-fA-F]+)\b/g;
    const functions = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g;
    const types = /\b([A-Z][a-zA-Z0-9_$]*)\b/g;
    
    const tokens: Array<{start: number, end: number, color: string, text: string}> = [];
    
    // Comentários (prioridade máxima)
    let match;
    while ((match = comments.exec(line)) !== null) {
        tokens.push({start: match.index, end: match.index + match[0].length, color: '6A9955', text: match[0]});
    }
    
    // Strings
    while ((match = strings.exec(line)) !== null) {
        if (!tokens.some(t => match!.index >= t.start && match!.index < t.end)) {
            tokens.push({start: match.index, end: match.index + match[0].length, color: 'CE9178', text: match[0]});
        }
    }
    
    // Keywords
    while ((match = keywords.exec(line)) !== null) {
        if (!tokens.some(t => match!.index >= t.start && match!.index < t.end)) {
            tokens.push({start: match.index, end: match.index + match[0].length, color: 'C586C0', text: match[0]});
        }
    }
    
    // Funções
    while ((match = functions.exec(line)) !== null) {
        if (!tokens.some(t => match!.index >= t.start && match!.index < t.end)) {
            tokens.push({start: match.index, end: match.index + match[1].length, color: 'DCDCAA', text: match[1]});
        }
    }
    
    // Números
    while ((match = numbers.exec(line)) !== null) {
        if (!tokens.some(t => match!.index >= t.start && match!.index < t.end)) {
            tokens.push({start: match.index, end: match.index + match[0].length, color: 'B5CEA8', text: match[0]});
        }
    }
    
    // Tipos (classes)
    while ((match = types.exec(line)) !== null) {
        if (!tokens.some(t => match!.index >= t.start && match!.index < t.end)) {
            tokens.push({start: match.index, end: match.index + match[0].length, color: '4EC9B0', text: match[0]});
        }
    }
    
    tokens.sort((a, b) => a.start - b.start);
    
    let pos = 0;
    for (const token of tokens) {
        if (token.start > pos) {
            runs.push(new TextRun({text: line.substring(pos, token.start), font: 'Consolas', size: 20, color: 'D4D4D4'}));
        }
        runs.push(new TextRun({text: token.text, font: 'Consolas', size: 20, color: token.color}));
        pos = token.end;
    }
    
    if (pos < line.length) {
        runs.push(new TextRun({text: line.substring(pos), font: 'Consolas', size: 20, color: 'D4D4D4'}));
    }
    
    return runs.length > 0 ? runs : [new TextRun({text: line, font: 'Consolas', size: 20, color: 'D4D4D4'})];
}

function processNumberedList(lines: string[], startIndex: number): { paragraphs: Paragraph[], nextIndex: number } {
    const paragraphs: Paragraph[] = [];
    let i = startIndex;
    
    while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const text = lines[i].trim().replace(/^\d+\.\s/, '');
        paragraphs.push(new Paragraph({
            children: processInlineFormatting(text),
            numbering: { reference: 'default-numbering', level: 0 },
            spacing: { after: 60 }
        }));
        i++;
    }
    
    return { paragraphs, nextIndex: i };
}

function detectAndProcessJSON(lines: string[], startIndex: number): { paragraphs: Paragraph[], nextIndex: number } | null {
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
        return null; // Não é JSON válido, não processar como código
    }
    
    // Processar como bloco de código JSON
    const paragraphs: Paragraph[] = [];
    
    // Cabeçalho
    paragraphs.push(new Paragraph({
        children: [new TextRun({ 
            text: `▶ JSON`,
            font: 'Consolas',
            size: 18,
            bold: true,
            color: '4EC9B0'
        })],
        shading: { fill: '1E1E1E' },
        spacing: { before: 240, after: 0 },
        border: {
            top: { color: '3E3E42', space: 1, style: 'single', size: 6 },
            left: { color: '3E3E42', space: 1, style: 'single', size: 6 },
            right: { color: '3E3E42', space: 1, style: 'single', size: 6 }
        },
        keepNext: true
    }));
    
    // Conteúdo
    jsonLines.forEach((line, index) => {
        paragraphs.push(new Paragraph({
            children: applySyntaxHighlighting(line, 'json'),
            shading: { fill: '1E1E1E' },
            spacing: { before: 0, after: 0, line: 276 },
            indent: { left: 360, right: 360 },
            border: {
                left: { color: '3E3E42', space: 1, style: 'single', size: 6 },
                right: { color: '3E3E42', space: 1, style: 'single', size: 6 }
            },
            keepNext: index < jsonLines.length - 1,
            keepLines: true
        }));
    });
    
    // Rodapé
    paragraphs.push(new Paragraph({
        text: '',
        shading: { fill: '1E1E1E' },
        spacing: { before: 0, after: 240 },
        border: {
            bottom: { color: '3E3E42', space: 1, style: 'single', size: 6 },
            left: { color: '3E3E42', space: 1, style: 'single', size: 6 },
            right: { color: '3E3E42', space: 1, style: 'single', size: 6 }
        }
    }));
    
    return { paragraphs, nextIndex: i };
}
