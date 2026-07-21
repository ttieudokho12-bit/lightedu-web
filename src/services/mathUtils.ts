export function formatMathSymbols(text: string): string {
  if (!text) return '';
  
  // Normalize double backslashes in case of double escaping
  let normalizedText = text;
  
  // Split by '$' to separate content inside and outside of math blocks
  const parts = normalizedText.split('$');
  
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // OUTSIDE math blocks
      let part = parts[i];
      
      // Replace LaTeX command string leftovers if any leak as plain text
      part = part.replace(/\\+times\b/g, ' × ');
      part = part.replace(/\\+div\b/g, ' : ');
      part = part.replace(/\\+ge\b|\\+geq\b/g, ' ≥ ');
      part = part.replace(/\\+le\b|\\+leq\b/g, ' ≤ ');
      part = part.replace(/\\+gt\b/g, ' $>$ ');
      part = part.replace(/\\+lt\b/g, ' $<$ ');
      part = part.replace(/\\+dots\b|\\+ldots\b/g, '...');
      
      // Convert raw fraction slash (e.g. 3/5) outside math blocks into proper vertical LaTeX fractions
      part = part.replace(/(\d+)\s*\/\s*(\d+)/g, '$\\frac{$1}{$2}$');
      
      // Auto-replace >= and <= outside math blocks
      part = part.replace(/(?:>=|\\ge|\\geq)/g, ' $\\ge$ ');
      part = part.replace(/(?:<=|\\le|\\leq)/g, ' $\\le$ ');
      
      // Auto-replace standalone comparison signs outside math blocks
      part = part.replace(/>/g, ' $>$ ');
      part = part.replace(/</g, ' $<$ ');
      
      // Replace single = when standalone or surrounded by spaces
      if (part.trim() === '=') {
        part = '$=$';
      } else {
        part = part.replace(/\s+=\s+/g, ' $=$ ');
      }
      
      parts[i] = part;
    } else {
      // INSIDE math blocks
      let part = parts[i];
      
      // Replace < and > inside math blocks with \lt and \gt to prevent markdown/HTML conflicts
      part = part.replace(/</g, ' \\lt ');
      part = part.replace(/>/g, ' \\gt ');
      
      // Ensure raw 'x' between numbers is formatted as proper LaTeX multiplication sign \times
      part = part.replace(/(\d+)\s*x\s*(\d+)/g, '$1 \\times $2');
      
      // Preserve standard \times for proper mathematical symbol rendering (do NOT replace with \text{x}!)
      // No replacement needed, just let KaTeX render \times as the standard × math operator.
      
      // Replace division command (\div) with colon ':' (standard Vietnamese division notation)
      part = part.replace(/\\+div\b/g, ' : ');
      
      // Convert horizontal fraction slash (e.g. 3/5) inside math blocks to proper vertical fraction \frac
      part = part.replace(/(\d+)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}');
      
      // Convert LaTeX dot commands to literal triple dots as requested
      part = part.replace(/\\+dots\b|\\+ldots\b/g, '...');
      
      parts[i] = part;
    }
  }
  
  let result = parts.join('$');
  
  // Clean up any double dollar signs that might have been generated
  result = result.replace(/\$\$+/g, '$$');
  
  return result;
}

export function cleanOptionText(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // Replace \text{...} with just ...
  cleaned = cleaned.replace(/\\text\{([^}]+)\}/g, '$1');

  // Replace \times with x or ×
  cleaned = cleaned.replace(/\\times/g, '×');

  // Replace \div with :
  cleaned = cleaned.replace(/\\div/g, ':');

  // Replace \ge or \geq with ≥
  cleaned = cleaned.replace(/\\ge(q)?/g, '≥');

  // Replace \le or \leq with ≤
  cleaned = cleaned.replace(/\\le(q)?/g, '≤');

  // Replace \pi with π
  cleaned = cleaned.replace(/\\pi/g, 'π');

  // Replace \triangle with △
  cleaned = cleaned.replace(/\\triangle/g, '△');

  // Replace \widehat{ABC} with góc ABC
  cleaned = cleaned.replace(/\\widehat\{([^}]+)\}/g, 'góc $1');

  // Replace \frac{a}{b} with a/b
  cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');

  // Replace ^2 with ² or similar superscript
  cleaned = cleaned.replace(/\^2/g, '²');
  cleaned = cleaned.replace(/\^3/g, '³');

  // Strip any remaining backslashes
  cleaned = cleaned.replace(/\\/g, '');

  // Strip any remaining $ symbols
  cleaned = cleaned.replace(/\$/g, '');

  return cleaned.trim();
}
