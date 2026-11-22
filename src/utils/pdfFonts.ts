import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * The six logical font styles used by the PDF renderer.
 */
export interface PDFFontSet {
    regular: string;
    bold: string;
    oblique: string;
    boldOblique: string;
    mono: string;
    monoBold: string;
}

/**
 * pdfkit's built-in fonts (the PDF "base 14") only support WinAnsiEncoding,
 * i.e. a single byte per glyph. They cannot represent Polish, Czech, Turkish,
 * Vietnamese and many other characters at all. Text written with them is
 * silently mangled — UTF-8 sequences get emitted as separate latin-1 bytes.
 *
 * These names are used when no Unicode-capable font can be found, so the
 * renderer still produces output instead of crashing.
 */
const FALLBACK_FONTS: PDFFontSet = {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
    oblique: 'Helvetica-Oblique',
    boldOblique: 'Helvetica-BoldOblique',
    mono: 'Courier',
    monoBold: 'Courier-Bold',
};

/**
 * Names the Unicode fonts are registered under. They are deliberately distinct
 * from the base-14 names so a lookup can never accidentally resolve to a
 * single-byte font.
 */
const FONT_ALIASES: PDFFontSet = {
    regular: 'dgm-sans',
    bold: 'dgm-sans-bold',
    oblique: 'dgm-sans-oblique',
    boldOblique: 'dgm-sans-bold-oblique',
    mono: 'dgm-mono',
    monoBold: 'dgm-mono-bold',
};

/**
 * Candidate font files per style, best match first. DejaVu ships a full set of
 * weights and styles and covers every latin-1/latin-2/latin-7 character, which
 * makes it a good default on all platforms.
 *
 * Each entry is a list so alternative families can be added later without
 * touching the call sites.
 */
const FONT_FILE_CANDIDATES: Record<keyof PDFFontSet, string[]> = {
    regular: ['DejaVuSans.ttf'],
    bold: ['DejaVuSans-Bold.ttf'],
    oblique: ['DejaVuSans-Oblique.ttf'],
    boldOblique: ['DejaVuSans-BoldOblique.ttf'],
    mono: ['DejaVuSansMono.ttf'],
    monoBold: ['DejaVuSansMono-Bold.ttf'],
};

/**
 * Directories searched for font files, in order.
 *
 * The bundled directory comes first so a package can ship its own fonts and be
 * independent of the host system; the rest are the usual per-OS locations.
 */
function fontSearchDirs(): string[] {
    const home = os.homedir();
    return [
        // Fonts bundled with this package (optional).
        path.join(__dirname, '..', '..', 'fonts'),
        path.join(__dirname, '..', 'fonts'),
        path.join(__dirname, 'fonts'),
        // macOS
        path.join(home, 'Library', 'Fonts'),
        '/Library/Fonts',
        '/System/Library/Fonts/Supplemental',
        // Linux — DejaVu is present on most distributions
        '/usr/share/fonts/truetype/dejavu',
        '/usr/share/fonts/dejavu',
        '/usr/share/fonts/truetype',
        '/usr/local/share/fonts',
        path.join(home, '.local', 'share', 'fonts'),
        // Windows
        path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts'),
    ];
}

function findFontFile(fileName: string): string | null {
    for (const dir of fontSearchDirs()) {
        const candidate = path.join(dir, fileName);
        try {
            if (fs.statSync(candidate).isFile()) {
                return candidate;
            }
        } catch {
            // Directory or file does not exist — try the next candidate.
        }
    }
    return null;
}

/** Fonts currently in effect; starts as the single-byte fallback set. */
let activeFonts: PDFFontSet = { ...FALLBACK_FONTS };

/**
 * Returns the font names to pass to `doc.font()`.
 *
 * Only meaningful after {@link registerPDFFonts} has been called for the
 * document being rendered; before that it returns the built-in fallback names.
 */
export function getPDFFonts(): PDFFontSet {
    return activeFonts;
}

/**
 * Registers Unicode-capable fonts on the document and returns the names to use
 * for each logical style.
 *
 * Styles whose font file cannot be found fall back individually to the matching
 * built-in font, so a partial installation degrades gracefully instead of
 * throwing. Registration failures (unreadable or unsupported font files) are
 * treated the same way.
 *
 * Must be called once per document, before any text is drawn.
 */
export function registerPDFFonts(doc: PDFKit.PDFDocument): PDFFontSet {
    const fonts: PDFFontSet = { ...FALLBACK_FONTS };

    (Object.keys(FONT_FILE_CANDIDATES) as Array<keyof PDFFontSet>).forEach(style => {
        for (const fileName of FONT_FILE_CANDIDATES[style]) {
            const file = findFontFile(fileName);
            if (!file) {
                continue;
            }
            try {
                doc.registerFont(FONT_ALIASES[style], file);
                fonts[style] = FONT_ALIASES[style];
                break;
            } catch {
                // Font file is present but unusable — keep the fallback for
                // this style and try the next candidate.
            }
        }
    });

    activeFonts = fonts;
    return fonts;
}
