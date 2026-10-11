import { useContext, useState } from 'react';
import { CodeBlock } from '../../../components/CodeBlock.jsx';
import { cx } from '../../../components/ui.jsx';
import { PrintContext } from './printContext.js';

// Building blocks for slide content. Every size is in em, so a slide scales with its frame (see .slide-canvas).

/** Inline code. */
export function C({ children }) {
  return <code className="slide-inline-code">{children}</code>;
}

export function Points({ items, className }) {
  return (
    <ul className={cx('space-y-[0.45em]', className)}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-[0.6em]">
          <span className="mt-[0.5em] size-[0.42em] shrink-0 rounded-full bg-indigo-500" aria-hidden="true" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Highlighted, read-only code with a small header label. */
export function Code({ children, label = 'C++', language = 'cpp', className }) {
  return (
    <div className={cx('slide-code min-w-0', className)}>
      <div className="slide-code-label">{label}</div>
      <CodeBlock code={String(children).replace(/^\n+|\s+$/g, '')} language={language} />
    </div>
  );
}

/** Program output, terminal style. */
export function Output({ children, label = 'Output', className }) {
  return (
    <div className={cx('min-w-0', className)}>
      <div className="slide-code-label">{label}</div>
      <pre className="slide-output">{String(children).replace(/^\n+|\s+$/g, '')}</pre>
    </div>
  );
}

/** Two columns on wide screens, stacked on phones. */
export function Cols({ children, className, wide = 'equal' }) {
  const grid = { equal: 'md:grid-cols-2', left: 'md:grid-cols-[3fr_2fr]', right: 'md:grid-cols-[2fr_3fr]' }[wide];
  return <div className={cx('grid grid-cols-1 items-start gap-[1.1em]', grid, className)}>{children}</div>;
}

const CALLOUT_TONES = {
  tip: { box: 'border-indigo-200 bg-indigo-50 text-indigo-950', icon: '💡' },
  warn: { box: 'border-amber-200 bg-amber-50 text-amber-950', icon: '⚠️' },
  error: { box: 'border-rose-200 bg-rose-50 text-rose-950', icon: '❌' },
  ok: { box: 'border-emerald-200 bg-emerald-50 text-emerald-950', icon: '✅' },
};

export function Callout({ tone = 'tip', title, children, className }) {
  const t = CALLOUT_TONES[tone];
  return (
    <div className={cx('rounded-[0.6em] border px-[0.9em] py-[0.65em]', t.box, className)}>
      <div className="flex gap-[0.55em]">
        <span aria-hidden="true">{t.icon}</span>
        <div className="min-w-0">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={cx(title && 'mt-[0.2em]', 'text-[0.92em]')}>{children}</div>}
        </div>
      </div>
    </div>
  );
}

export function SlideTable({ head, rows, className }) {
  return (
    <div className={cx('overflow-x-auto', className)}>
      <table className="slide-table">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A question with a "Show answer" button (answers are always shown when printing). */
export function Reveal({ number, question, answer }) {
  const printing = useContext(PrintContext);
  const [open, setOpen] = useState(false);
  const shown = open || printing;
  return (
    <div className="rounded-[0.6em] border border-slate-200 bg-white px-[0.9em] py-[0.7em]">
      <div className="flex gap-[0.6em]">
        <span className="grid size-[1.6em] shrink-0 place-items-center rounded-full bg-indigo-600 text-[0.8em] font-semibold text-white">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <div>{question}</div>
          {shown ? (
            <div className="mt-[0.5em] rounded-[0.4em] bg-emerald-50 px-[0.7em] py-[0.45em] text-[0.92em] text-emerald-950">
              {answer}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-[0.45em] rounded-[0.4em] px-[0.6em] py-[0.25em] text-[0.82em] font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50"
            >
              Show answer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** A left-to-right flow of steps (wraps on phones). */
export function Flow({ steps, className }) {
  return (
    <ol className={cx('flex flex-wrap items-stretch gap-[0.5em]', className)}>
      {steps.map((step, i) => (
        <li key={i} className="flex items-center gap-[0.5em]">
          <div
            className={cx(
              'h-full min-w-[7.5em] max-w-[11em] rounded-[0.6em] border px-[0.75em] py-[0.6em]',
              step.accent ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white',
            )}
          >
            <p className={cx('font-semibold', step.accent ? 'text-indigo-800' : 'text-slate-800')}>{step.title}</p>
            {step.text && <p className="mt-[0.2em] text-[0.8em] leading-snug text-slate-600">{step.text}</p>}
          </div>
          {i < steps.length - 1 && (
            <span className="text-[1.3em] text-slate-400" aria-hidden="true">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

/**
 * Two objects and the heap memory their `data` pointers refer to: one shared block (shallow copy)
 * or one block each (deep copy).
 */
export function PointerDiagram({ shared }) {
  const stroke = shared ? '#e11d48' : '#059669';
  const objects = [
    { name: 'a', y: 20 },
    { name: 'b', y: 120 },
  ];
  const blocks = shared ? [{ y: 70, label: 'heap: int[5]' }] : objects.map((o) => ({ y: o.y, label: 'heap: int[5]' }));
  return (
    <svg
      viewBox="0 0 420 200"
      className="h-auto w-full max-w-[24em]"
      role="img"
      aria-label={
        shared ? 'Shallow copy: a and b point to the same heap array' : 'Deep copy: a and b point to separate arrays'
      }
    >
      <defs>
        <marker
          id={`arrow-${shared ? 's' : 'd'}`}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={stroke} />
        </marker>
      </defs>
      {objects.map((o) => (
        <g key={o.name}>
          <rect x="10" y={o.y} width="130" height="60" rx="8" fill="#eef2ff" stroke="#6366f1" />
          <text x="22" y={o.y + 24} fontSize="15" fontWeight="600" fill="#312e81">
            Buffer {o.name}
          </text>
          <text x="22" y={o.y + 46} fontSize="13" fontFamily="monospace" fill="#334155">
            data ●
          </text>
          <line
            x1="80"
            y1={o.y + 41}
            x2="268"
            y2={shared ? 100 : o.y + 30}
            stroke={stroke}
            strokeWidth="2"
            markerEnd={`url(#arrow-${shared ? 's' : 'd'})`}
          />
        </g>
      ))}
      {blocks.map((b, i) => (
        <g key={i}>
          <rect x="272" y={b.y} width="138" height="60" rx="8" fill="#f8fafc" stroke="#94a3b8" />
          <text x="284" y={b.y + 26} fontSize="13" fontFamily="monospace" fill="#334155">
            {b.label}
          </text>
          <text x="284" y={b.y + 46} fontSize="12" fill="#64748b">
            [ 0 | 0 | 0 | 0 | 0 ]
          </text>
        </g>
      ))}
    </svg>
  );
}
