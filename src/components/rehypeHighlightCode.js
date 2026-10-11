import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import { toText } from 'hast-util-to-text';
import { createLowlight } from 'lowlight';
import { visit } from 'unist-util-visit';

// Only the languages questions can use, so the participant bundle doesn't ship every highlight.js grammar.
const lowlight = createLowlight({ c, cpp, java, javascript, python });

/** Rehype plugin: syntax-highlight ```lang fenced code blocks (runs after sanitizing). */
export function rehypeHighlightCode() {
  return (tree) => {
    visit(tree, 'element', (node, _index, parent) => {
      if (node.tagName !== 'code' || parent?.tagName !== 'pre') return;
      const classes = node.properties?.className ?? [];
      const lang = classes.find((c) => String(c).startsWith('language-'))?.slice('language-'.length);
      if (!lang || !lowlight.registered(lang)) return;
      const result = lowlight.highlight(lang, toText(node, { whitespace: 'pre' }));
      node.properties.className = [...classes, 'hljs'];
      node.children = result.children;
    });
  };
}
