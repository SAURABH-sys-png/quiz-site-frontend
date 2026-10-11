import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown, markBlanks } from './Markdown.jsx';

describe('Markdown', () => {
  it('never renders raw HTML or scripts', () => {
    const { container } = render(
      <Markdown>{'Hello <script>alert(1)</script> <img src=x onerror="alert(1)"> <b>bold</b>'}</Markdown>,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('drops javascript: links', () => {
    const { container } = render(<Markdown>{'[click](javascript:alert(1))'}</Markdown>);
    const link = container.querySelector('a');
    expect(link?.getAttribute('href') ?? '').not.toContain('javascript');
  });

  it('renders inline and block LaTeX with KaTeX', () => {
    const { container } = render(<Markdown>{'Area $\\pi r^2$\n\n$$\\int_0^1 x\\,dx$$'}</Markdown>);
    expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('.katex-display')).not.toBeNull();
  });

  it('does not turn $$ inside code into math', () => {
    const { container } = render(<Markdown>{'```python\nprint("$$x$$")\n$$y$$\n```\n\n$$z$$'}</Markdown>);
    expect(container.querySelector('pre code').textContent).toBe('print("$$x$$")\n$$y$$\n');
    expect(container.querySelectorAll('.katex-display')).toHaveLength(1);
  });

  it('highlights fenced code', () => {
    const { container } = render(<Markdown>{'```python\ndef f(x):\n    return x\n```'}</Markdown>);
    const code = container.querySelector('pre code');
    expect(code).toHaveClass('hljs');
    expect(code.querySelector('.hljs-keyword')).not.toBeNull();
    expect(code.textContent).toContain('return x');
  });

  it('renders numbered blank markers', () => {
    const { container } = render(<Markdown>{markBlanks('A {{b1}} and {{b2}}', ['b1', 'b2'])}</Markdown>);
    const markers = container.querySelectorAll('.blank-marker');
    expect([...markers].map((m) => m.textContent)).toEqual(['blank 1', 'blank 2']);
    expect(container.querySelector('a')).toBeNull();
  });
});

describe('markBlanks inside math', () => {
  it('boxes blanks that sit inside LaTeX instead of breaking it', () => {
    const marked = markBlanks('Solve $x + {{b1}} = 3$ and {{b2}}', ['b1', 'b2']);
    expect(marked).toBe('Solve $x + \\boxed{\\text{blank 1}} = 3$ and [blank 2](#blank-b2)');
    const { container } = render(<Markdown>{marked}</Markdown>);
    expect(container.querySelector('.katex-error')).toBeNull();
    expect(container.querySelector('.katex')).not.toBeNull();
    expect(container.querySelector('.blank-marker')).toHaveTextContent('blank 2');
  });
});
