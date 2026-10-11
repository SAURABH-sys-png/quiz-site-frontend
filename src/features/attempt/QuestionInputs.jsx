import { CodeBlock } from '../../components/CodeBlock.jsx';
import { LazyCodeEditor } from '../../components/LazyCodeEditor.jsx';
import { Markdown } from '../../components/Markdown.jsx';
import { cx, Input, Textarea } from '../../components/ui.jsx';
import { LANGUAGE_LABELS } from './answers.js';
import { RunPanel } from './RunPanel.jsx';

function OptionList({ options, selected, multi, disabled, onToggle, name }) {
  return (
    <div className="space-y-2" role={multi ? 'group' : 'radiogroup'} aria-label="Options">
      {options.map((option, index) => {
        const checked = selected.includes(option.id);
        return (
          <label
            key={option.id}
            className={cx(
              'flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition',
              checked
                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                : 'border-slate-200 bg-white hover:border-slate-300',
              disabled && 'cursor-not-allowed opacity-70',
            )}
          >
            <input
              type={multi ? 'checkbox' : 'radio'}
              name={name}
              className="mt-1 size-4 shrink-0 accent-indigo-600"
              checked={checked}
              disabled={disabled}
              onChange={() => onToggle(option.id)}
            />
            <span className="mt-0.5 font-mono text-xs font-semibold text-slate-500">
              {String.fromCharCode(65 + index)}.
            </span>
            <Markdown className="min-w-0 flex-1 !text-sm">{option.text}</Markdown>
          </label>
        );
      })}
    </div>
  );
}

export function McqInput({ question, response, onChange, disabled }) {
  const selected = response?.selected ?? [];
  const toggle = (id) => {
    if (question.multiSelect) {
      onChange({ selected: selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id] });
    } else {
      onChange({ selected: selected[0] === id ? [] : [id] });
    }
  };
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-slate-500">
        {question.multiSelect ? 'Select all that apply.' : 'Select one option.'}
      </p>
      <OptionList
        name={`q-${question.id}`}
        options={question.options}
        selected={selected}
        multi={question.multiSelect}
        disabled={disabled}
        onToggle={toggle}
      />
    </div>
  );
}

export function FillBlankInput({ question, response, onChange, disabled }) {
  const values = response?.values ?? {};
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {question.blanks.map((blank, index) => (
        <label key={blank.id} className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Blank {index + 1}</span>
          <Input
            value={values[blank.id] ?? ''}
            disabled={disabled}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={500}
            onChange={(e) => onChange({ values: { ...values, [blank.id]: e.target.value } })}
          />
        </label>
      ))}
    </div>
  );
}

function CodeHeader({ language, children }) {
  return (
    <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
      <span className="font-medium">{children}</span>
      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">{LANGUAGE_LABELS[language] ?? language}</span>
    </div>
  );
}

export function DebugInput({ question, response, onChange, disabled, attemptId }) {
  if (question.grading === 'run') {
    const code = response?.code ?? question.code;
    return (
      <div className="space-y-3">
        <div>
          <CodeHeader language={question.language}>Fix the program below</CodeHeader>
          <LazyCodeEditor
            value={code}
            language={question.language}
            readOnly={disabled}
            ariaLabel="Code editor"
            onChange={(value) => onChange({ code: value })}
          />
        </div>
        <RunPanel question={question} code={code} attemptId={attemptId} disabled={disabled} />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div>
        <CodeHeader language={question.language}>Buggy code</CodeHeader>
        <CodeBlock code={question.code} language={question.language} />
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Your fix</span>
        <Textarea
          value={response?.answer ?? ''}
          disabled={disabled}
          rows={4}
          spellCheck={false}
          autoCapitalize="off"
          className="font-mono"
          placeholder="Write the corrected line(s)"
          onChange={(e) => onChange({ answer: e.target.value })}
        />
      </label>
    </div>
  );
}

export function SnippetInput({ question, response, onChange, disabled }) {
  return (
    <div className="space-y-3">
      <div>
        <CodeHeader language={question.language}>Code</CodeHeader>
        <CodeBlock code={question.code} language={question.language} />
      </div>
      {question.answerMode === 'mcq' ? (
        <OptionList
          name={`q-${question.id}`}
          options={question.options}
          selected={response?.answer ? [response.answer] : []}
          multi={false}
          disabled={disabled}
          onToggle={(id) => onChange({ answer: response?.answer === id ? '' : id })}
        />
      ) : (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Your answer</span>
          <Textarea
            value={response?.answer ?? ''}
            disabled={disabled}
            rows={3}
            spellCheck={false}
            autoCapitalize="off"
            className="font-mono"
            placeholder="Type the exact output"
            onChange={(e) => onChange({ answer: e.target.value })}
          />
        </label>
      )}
    </div>
  );
}
