import { Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';

export interface TemplateHeader {
    titulo: string;
    autor: string;
}

// Template Profissional
export function professionalHeader(options: TemplateHeader): Paragraph[] {
    return [
        new Paragraph({
            text: options.titulo,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            border: {
                bottom: { color: "2E86AB", space: 1, style: BorderStyle.SINGLE, size: 24 }
            }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "Autor: ", bold: true, color: "2E86AB" }),
                new TextRun({ text: options.autor }),
                new TextRun({ text: " | ", color: "999999" }),
                new TextRun({ text: "Data: ", bold: true, color: "2E86AB" }),
                new TextRun({ text: new Date().toLocaleDateString('pt-BR') })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
        })
    ];
}

// Template Minimalista
export function minimalistHeader(options: TemplateHeader): Paragraph[] {
    return [
        new Paragraph({
            text: options.titulo,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.LEFT,
            spacing: { after: 200 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: options.autor, size: 20, color: "666666" })
            ],
            spacing: { after: 800 }
        })
    ];
}

// Template Corporativo
export function corporateHeader(options: TemplateHeader): Paragraph[] {
    return [
        new Paragraph({
            text: options.titulo.toUpperCase(),
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: `Documento preparado por ${options.autor}`, size: 20, italics: true }),
                new TextRun({ text: `\n${new Date().toLocaleDateString('pt-BR')}`, size: 18, color: "666666" })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
        })
    ];
}

export const templates = {
    professional: professionalHeader,
    minimalist: minimalistHeader,
    corporate: corporateHeader,
    default: professionalHeader
};
