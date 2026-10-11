import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Markdown } from '../../../components/Markdown.jsx';
import { Button, ButtonLink, Card, cx, EmptyState, Modal, PageHeader } from '../../../components/ui.jsx';
import { DECKS, findDeck } from './decks/index.js';
import { PrintContext } from './printContext.js';

/** Admin → Slides: the list of lecture decks. */
export function SlidesIndexPage() {
  return (
    <div>
      <PageHeader
        title="Slides"
        subtitle="Lecture decks to present in class. Use ← → to move, F for full screen, O for the overview."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {DECKS.map((deck) => (
          <Card key={deck.id} className="flex flex-col p-5">
            <p className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">{deck.slides.length} slides</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{deck.title}</h2>
            <p className="mt-1 flex-1 text-sm text-slate-600">{deck.description}</p>
            <div className="mt-4">
              <ButtonLink to={deck.id}>Open slides</ButtonLink>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function isTyping(target) {
  return (
    target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/** Admin → Slides → one deck: presenter with keyboard/swipe navigation, full screen, overview and print. */
export function SlideDeckPage() {
  const { deckId } = useParams();
  const deck = findDeck(deckId);
  if (!deck) {
    return (
      <EmptyState
        title="Slide deck not found"
        action={
          <ButtonLink to="/admin/slides" variant="secondary">
            All slides
          </ButtonLink>
        }
      />
    );
  }
  return <DeckPresenter key={deck.id} deck={deck} />;
}

function DeckPresenter({ deck }) {
  const total = deck.slides.length;
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = Number.parseInt(searchParams.get('s') ?? '1', 10);
  const index = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), total) - 1 : 0;
  const slide = deck.slides[index];

  const [overviewOpen, setOverviewOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const swipeRef = useRef(null);
  const canFullscreen = typeof document !== 'undefined' && Boolean(document.fullscreenEnabled);

  const go = useCallback(
    (target) => {
      const next = Math.min(Math.max(target, 0), total - 1);
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set('s', String(next + 1));
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams, total],
  );

  const toggleFullscreen = useCallback(() => {
    if (!canFullscreen) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else stageRef.current?.requestFullscreen().catch(() => {});
  }, [canFullscreen]);

  // A new slide starts at its top.
  useEffect(() => {
    canvasRef.current?.scrollTo?.({ top: 0 });
  }, [index]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (overviewOpen) return undefined;
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
      const onButton = e.target instanceof HTMLElement && e.target.closest('button, a');
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          go(index + 1);
          break;
        case ' ':
          if (onButton) return;
          go(e.shiftKey ? index - 1 : index + 1);
          break;
        case 'ArrowLeft':
        case 'PageUp':
          go(index - 1);
          break;
        case 'Home':
          go(0);
          break;
        case 'End':
          go(total - 1);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'o':
        case 'O':
          setOverviewOpen(true);
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, total, overviewOpen, toggleFullscreen]);

  // Print every slide with its explanation, then return to the presenter.
  useEffect(() => {
    if (!printing) return undefined;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    const timer = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', done);
    };
  }, [printing]);

  // Horizontal swipe on touch screens (not when the swipe starts inside a scrollable code block).
  const onPointerDown = (e) => {
    if (e.pointerType !== 'touch' || (e.target instanceof Element && e.target.closest('pre, table'))) return;
    swipeRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy)) go(dx < 0 ? index + 1 : index - 1);
  };

  if (printing) return <PrintDeck deck={deck} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="flex min-w-0 basis-full items-center gap-2 sm:flex-1 sm:basis-0">
          <Link to="/admin/slides" className="shrink-0 text-sm text-slate-500 hover:text-slate-800">
            ← Slides
          </Link>
          <h1 className="min-w-0 truncate text-lg font-semibold text-slate-900">{deck.title}</h1>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setOverviewOpen(true)}>
          Overview
        </Button>
        {canFullscreen && (
          <Button size="sm" variant="secondary" onClick={toggleFullscreen}>
            Full screen
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => setPrinting(true)}>
          Print / PDF
        </Button>
      </div>

      <div
        ref={stageRef}
        className={cx('slide-stage', fullscreen && 'is-fullscreen')}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <SlideFrame deck={deck} slide={slide} index={index} canvasRef={canvasRef} />
        {fullscreen && (
          <div className="slide-fullscreen-nav">
            <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous slide">
              ‹
            </button>
            <span className="tabular-nums">
              {index + 1} / {total}
            </span>
            <button type="button" onClick={() => go(index + 1)} disabled={index === total - 1} aria-label="Next slide">
              ›
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 print:hidden">
        <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0}>
          ← Previous
        </Button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="text-sm text-slate-600 tabular-nums" aria-live="polite">
            Slide {index + 1} of {total}
          </span>
          <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
        </div>
        <Button onClick={() => go(index + 1)} disabled={index === total - 1}>
          Next →
        </Button>
      </div>

      <Card className="p-4 sm:p-5 print:border-0 print:shadow-none">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left print:hidden"
          onClick={() => setNotesOpen((v) => !v)}
          aria-expanded={notesOpen}
        >
          <span className="text-sm font-semibold text-slate-800">Explanation</span>
          <span className="text-xs text-slate-500">{notesOpen ? 'Hide' : 'Show'}</span>
        </button>
        {notesOpen && <Markdown className="mt-3 print:mt-0">{slide.notes}</Markdown>}
      </Card>

      <Modal open={overviewOpen} title={`${deck.title}: all slides`} onClose={() => setOverviewOpen(false)} size="xl">
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {deck.slides.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  go(i);
                  setOverviewOpen(false);
                }}
                className={cx(
                  'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition',
                  i === index ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50',
                )}
              >
                <span className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">{i + 1}</span>
                <span className="min-w-0">
                  {s.kicker && <span className="block text-[11px] font-medium text-indigo-600">{s.kicker}</span>}
                  <span className="block text-sm font-medium text-slate-800">{s.title}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </Modal>
    </div>
  );
}

/** One slide in a 16:9 frame (natural height on phones). Text sizes scale with the frame's width. */
function SlideFrame({ deck, slide, index, canvasRef }) {
  const title = slide.layout === 'title';
  return (
    <div className="slide-frame">
      <article
        ref={canvasRef}
        className={cx('slide-canvas', title && 'slide-title-layout')}
        aria-roledescription="slide"
        aria-label={`${index + 1} of ${deck.slides.length}: ${slide.title}`}
      >
        {title ? (
          <div className="flex flex-1 flex-col justify-center gap-[0.6em]">
            <h2 className="text-[2.7em] leading-[1.1] font-bold tracking-tight">{slide.title}</h2>
            {slide.body}
          </div>
        ) : (
          <>
            <header className="mb-[0.9em]">
              {slide.kicker && (
                <p className="text-[0.72em] font-semibold tracking-[0.08em] text-indigo-600 uppercase">
                  {slide.kicker}
                </p>
              )}
              <h2 className="text-[1.75em] leading-tight font-bold tracking-tight text-slate-900">{slide.title}</h2>
            </header>
            <div className="flex-[1_0_auto]">{slide.body}</div>
          </>
        )}
        <footer className="slide-footer">
          <span className="truncate">{deck.title}</span>
          <span className="tabular-nums">
            {index + 1} / {deck.slides.length}
          </span>
        </footer>
      </article>
    </div>
  );
}

/** Every slide followed by its explanation, for printing or saving as PDF. */
function PrintDeck({ deck }) {
  return (
    <PrintContext.Provider value={true}>
      <div className="print-deck">
        <p className="mb-4 text-sm text-slate-500 print:hidden">Preparing the print view…</p>
        {deck.slides.map((slide, i) => (
          <section key={slide.id} className="print-slide">
            <SlideFrame deck={deck} slide={slide} index={i} />
            {slide.notes && <Markdown className="mt-3">{slide.notes}</Markdown>}
          </section>
        ))}
      </div>
    </PrintContext.Provider>
  );
}
