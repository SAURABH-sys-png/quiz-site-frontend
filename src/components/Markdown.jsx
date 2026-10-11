import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { rehypeHighlightCode } from './rehypeHighlightCode.js';
import { cx } from './ui.jsx';

// Sanitize first (keeping the classes remark-math and code fences need), then render math and highlight
// code. Raw HTML in Markdown is never rendered, and dangerouslySetInnerHTML is never used.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-./, 'math-inline', 'math-display']],
  },
};

const BLANK_HREF = '#blank-';

const components = {
  a({ href, children, node: _node, ...props }) {
    if (href?.startsWith(BLANK_HREF)) {
      return <span className="blank-marker">{children}</span>;
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};

/**
 * A line that is only `$$ ... $$` becomes display math (remark-math treats single-line $$..$$ as inline).
 * Lines inside fenced code blocks are left untouched.
 */
function displayMathLines(text) {
  let fence = null;
  return String(text ?? '')
    .split('\n')
    .map((line) => {
      const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
      if (fence) {
        if (marker && marker[0] === fence[0] && marker.length >= fence.length && /^\s*[`~]+\s*$/.test(line))
          fence = null;
        return line;
      }
      if (marker) {
        fence = marker;
        return line;
      }
      return line.replace(/^[ \t]*\$\$(.+?)\$\$[ \t]*$/, (_, tex) => `$$\n${tex.trim()}\n$$`);
    })
    .join('\n');
}

/** Markdown + LaTeX ($inline$, $$block$$) + highlighted code fences, sanitized. */
export function Markdown({ children, className }) {
  return (
    <div className={cx('prose-q', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeSanitize, schema], rehypeKatex, rehypeHighlightCode]}
        components={components}
      >
        {displayMathLines(children)}
      </ReactMarkdown>
    </div>
  );
}

const BLANK_RE = /\{\{\s*([A-Za-z][A-Za-z0-9_]{0,19})\s*\}\}/g;
const MATH_RE = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/;

/**
 * Replace {{b1}}-style blanks with numbered markers ("blank 1", "blank 2"). Inside $math$ a blank becomes
 * \boxed{\text{blank 1}} so KaTeX can still render the expression.
 */
export function markBlanks(statement, blankIds) {
  return String(statement ?? '')
    .split(MATH_RE)
    .map((part, i) =>
      part.replace(BLANK_RE, (match, id) => {
        const index = blankIds.indexOf(id);
        if (index === -1) return match;
        // split() with a capture group puts the math segments at odd indexes.
        return i % 2 === 1 ? `\\boxed{\\text{blank ${index + 1}}}` : `[blank ${index + 1}](${BLANK_HREF}${id})`;
      }),
    )
    .join('');
}
