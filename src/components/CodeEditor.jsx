import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import CodeMirror from '@uiw/react-codemirror';
import { useMemo } from 'react';

const LANGUAGE_EXTENSIONS = {
  python: () => python(),
  c: () => cpp(),
  cpp: () => cpp(),
  java: () => java(),
  javascript: () => javascript(),
};

/** CodeMirror 6 editor (loaded lazily via LazyCodeEditor). */
export default function CodeEditor({ value, onChange, language, readOnly = false, minHeight = '180px', ariaLabel }) {
  const extensions = useMemo(() => {
    const make = LANGUAGE_EXTENSIONS[language];
    return make ? [make()] : [];
  }, [language]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 text-[13px]">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        readOnly={readOnly}
        editable={!readOnly}
        minHeight={minHeight}
        maxHeight="60vh"
        aria-label={ariaLabel}
        basicSetup={{ foldGutter: false, autocompletion: false, highlightActiveLine: !readOnly, searchKeymap: false }}
      />
    </div>
  );
}
