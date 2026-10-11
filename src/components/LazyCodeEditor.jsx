import { lazy, Suspense } from 'react';

const CodeEditor = lazy(() => import('./CodeEditor.jsx'));

function EditorFallback() {
  return <div className="h-44 animate-pulse rounded-lg border border-slate-300 bg-slate-100" />;
}

export function LazyCodeEditor(props) {
  return (
    <Suspense fallback={<EditorFallback />}>
      <CodeEditor {...props} />
    </Suspense>
  );
}
