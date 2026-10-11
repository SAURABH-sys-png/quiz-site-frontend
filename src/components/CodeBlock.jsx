import { Markdown } from './Markdown.jsx';

const HIGHLIGHT_LANG = { python: 'python', c: 'c', cpp: 'cpp', java: 'java', javascript: 'javascript' };

/** Read-only, syntax-highlighted code (scrolls horizontally inside its own container). */
export function CodeBlock({ code, language }) {
  const longestTicks = Math.max(0, ...(String(code).match(/`+/g) ?? []).map((t) => t.length));
  const fence = '`'.repeat(Math.max(3, longestTicks + 1));
  return <Markdown>{`${fence}${HIGHLIGHT_LANG[language] ?? ''}\n${code}\n${fence}`}</Markdown>;
}
