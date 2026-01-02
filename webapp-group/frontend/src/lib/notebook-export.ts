// src/lib/notebook-export.ts

/**
 * Export notebook content to Markdown file
 */
export function exportToMarkdown(content: string, filename: string = 'notebook.md'): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export notebook content to PDF
 * Note: This requires html2pdf.js or similar library
 * For now, we'll use a simple approach with window.print()
 * or recommend using a library like jspdf
 */
export async function exportToPDF(content: string, filename: string = 'notebook.pdf'): Promise<void> {
  // Create a temporary container with the markdown rendered as HTML
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '210mm'; // A4 width
  container.style.padding = '20mm';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '12pt';
  container.style.lineHeight = '1.6';
  container.style.color = '#000';
  container.style.backgroundColor = '#fff';
  
  // Convert markdown to HTML (simple conversion for basic elements)
  // For better results, you might want to use react-markdown to render first
  const htmlContent = convertMarkdownToHTML(content);
  container.innerHTML = htmlContent;
  
  document.body.appendChild(container);
  
  // Use browser's print functionality
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
              padding: 20mm;
              max-width: 210mm;
              margin: 0 auto;
            }
            h1 { font-size: 24pt; color: #e06c75; border-bottom: 2px solid #e06c75; padding-bottom: 0.3em; }
            h2 { font-size: 18pt; color: #d19a66; border-bottom: 1px solid #d19a66; padding-bottom: 0.3em; }
            h3 { font-size: 14pt; color: #e5c07b; }
            h4 { font-size: 12pt; color: #98c379; }
            code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
            pre { background-color: #f4f4f4; padding: 1em; border-radius: 4px; overflow-x: auto; }
            blockquote { border-left: 4px solid #56b6c2; padding-left: 1em; margin: 1em 0; font-style: italic; }
            table { border-collapse: collapse; width: 100%; margin: 1em 0; }
            th, td { border: 1px solid #ddd; padding: 0.5em; text-align: left; }
            th { background-color: #f4f4f4; }
            @media print {
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  }
  
  document.body.removeChild(container);
}

/**
 * Simple markdown to HTML converter
 * For production, consider using a proper markdown parser
 */
function convertMarkdownToHTML(markdown: string): string {
  let html = markdown;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
  
  // Inline code
  html = html.replace(/`(.*?)`/gim, '<code>$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>');
  
  // Line breaks
  html = html.replace(/\n\n/gim, '</p><p>');
  html = html.replace(/\n/gim, '<br>');
  
  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
}

