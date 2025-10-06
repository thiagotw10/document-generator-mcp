# Document Generator MCP

An MCP (Model Context Protocol) server to generate professional Word (.docx) and PDF documents from any AI agent that supports MCP, including Claude Desktop, Amazon Q Developer, Cline, Continue, and others.

## 🚀 Features

- ✅ Generate Word documents (.docx)
- ✅ Generate PDF documents
- ✅ Professional syntax highlighting (VS Code Dark theme)
- ✅ Smart pagination (no content cuts between pages)
- ✅ 100% responsive formatting (respects A4 margins)
- ✅ Markdown support (headings, lists, bold, italic, code blocks)
- ✅ Automatic professional formatting
- ✅ Metadata (author, creation date)

## 📦 Installation

### Via NPX (Recommended)
```bash
npx document-generator-mcp@latest
```

### Via NPM Global
```bash
npm install -g document-generator-mcp
```

## ⚙️ Configuration

### Claude Desktop

1. Locate the configuration file:
   - **Linux:** `~/.config/claude-desktop/claude_desktop_config.json`
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. Add this configuration:

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

3. Restart Claude Desktop

### Amazon Q Developer

1. Open VS Code with Amazon Q extension
2. Access Amazon Q settings
3. Add the MCP server:

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

### Other MCP Agents (Cline, Continue, etc.)

For other agents that support MCP, add the server configuration:

```json
{
  "name": "document-generator",
  "command": "npx",
  "args": ["--yes", "--cache", "/tmp/.npx-cache", "document-generator-mcp@latest"]
}
```

Check your agent's specific documentation for configuration details.

## 🎯 How to Use

After configuration, you can use natural commands in any MCP agent:

### Example Prompts
- *"Create a Word document about sales analysis"*
- *"Generate a PDF report about the project"*
- *"Make a technical manual in Word and PDF"*
- *"Create API documentation in Word format"*
- *"Document this JavaScript code with examples"*

### Available Tools
- **`gerar_documento_word`**: Creates Word documents, PDF, or both
- **`gerar_documento_pdf`**: Creates PDF documents only

## 📝 Supported Formatting

The MCP automatically processes:

### Markdown
- `# Heading 1` → Heading 1 (20pt)
- `## Heading 2` → Heading 2 (16pt, blue)
- `### Heading 3` → Heading 3 (14pt)
- `#### Heading 4` → Heading 4 (12pt)
- `- Item` → Bulleted list
- `1. Item` → Numbered list
- `**text**` → Bold text
- `*text*` → Italic text
- `***text***` → Bold + Italic
- `` `code` `` → Inline code
- `> quote` → Blockquote
- `---` → Horizontal line

### Code Blocks
````markdown
```javascript
async function example() {
  const data = await fetch('api.com');
  return data.json();
}
```
````

**Syntax Highlighting Colors (VS Code Dark theme):**
- 🟣 Keywords: `async`, `function`, `const`, `await`, etc. (#C586C0)
- 🟠 Strings: `"text"`, `'text'` (#CE9178)
- 🟢 Comments: `// comment`, `/* block */` (#6A9955)
- 🟢 Numbers: `42`, `3.14`, `0xFF` (#B5CEA8)
- 🟡 Functions: `fetch`, `console.log` (#DCDCAA)
- 🔵 Types/Classes: `Promise`, `Array` (#4EC9B0)

## 🎨 Features Highlights

### Professional Syntax Highlighting
- Dark background (#1E1E1E) for code blocks
- VS Code Dark theme colors
- Language indicator header
- Automatic line wrapping

### Smart Pagination
- Code blocks never split between pages
- Headings kept with following content
- Automatic page breaks when needed
- Consistent spacing

### Responsive Formatting
- All content respects A4 margins
- Automatic line breaks for long text
- Proper width control for all elements
- No content overflow

## 🧪 Testing

To test if it's working:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npx document-generator-mcp@latest
```

Expected output: List of available tools (`gerar_documento_word`, `gerar_documento_pdf`)

## 🔧 Troubleshooting

### Error "use strict: not found"
If you get this error, npm is using an old cached version. Solutions:

1. **Use this optimized configuration:**
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

2. **Or clear the cache:**
```bash
npm cache clean --force
rm -rf ~/.npm/_npx
```

### Documents not generating
- Check if `generated_documents/` folder exists
- Verify Node.js version (18+ required)
- Check MCP server logs in your agent

## 📁 Generated Files

Documents are saved in `./generated_documents/` with unique timestamps.

Example: `api_documentation_1759715959772.docx`

## 🤖 Compatible Agents

This MCP works with any agent that implements the Model Context Protocol:

- ✅ **Claude Desktop** - Full native support
- ✅ **Amazon Q Developer** - Support via VS Code
- ✅ **Cline (VS Code)** - VS Code extension
- ✅ **Continue** - Code assistant with MCP
- ✅ **Other MCP agents** - Any compatible implementation

## 🤝 Contributing

Contributions are welcome! Open issues or pull requests on GitHub.

### Development Setup
```bash
git clone https://github.com/thiagotw10/document-generator-mcp.git
cd document-generator-mcp
npm install
npm run build
```

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- **NPM Package:** https://www.npmjs.com/package/document-generator-mcp
- **GitHub Repository:** https://github.com/thiagotw10/document-generator-mcp
- **MCP Documentation:** https://modelcontextprotocol.io
- **Amazon Q MCP Guide:** https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/qdev-mcp.html

## ⚠️ Requirements

- **Node.js:** 18+ required
- **Platforms:** Linux, macOS, Windows
- **MCP Support:** Any agent implementing Model Context Protocol

## 📊 Changelog

### v1.0.8 (Latest)
- ✅ Professional syntax highlighting in PDF (VS Code Dark theme)
- ✅ 100% responsive formatting (respects A4 margins)
- ✅ Smart pagination (no content cuts)
- ✅ Improved spacing after code blocks
- ✅ Visual parity between Word and PDF


---

**Made with ❤️ by Thiago Oliveira**

*Transform natural language into professional documents with AI!*
