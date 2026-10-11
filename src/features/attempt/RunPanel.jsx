import { useState } from 'react';
import { Alert, Badge, Button } from '../../components/ui.jsx';
import { api, errorMessage } from '../../lib/api.js';

const VERDICT = {
  passed: { tone: 'green', label: 'Passed' },
  wrong_answer: { tone: 'red', label: 'Wrong output' },
  compile_error: { tone: 'red', label: 'Compile error' },
  runtime_error: { tone: 'red', label: 'Runtime error' },
  time_limit: { tone: 'amber', label: 'Time limit exceeded' },
  memory_limit: { tone: 'amber', label: 'Memory limit exceeded' },
  output_limit: { tone: 'amber', label: 'Output too large' },
  internal_error: { tone: 'slate', label: 'Runner error' },
};

function Pre({ children }) {
  return (
    <pre className="max-h-40 overflow-auto rounded-md bg-slate-900 px-2.5 py-2 font-mono text-xs whitespace-pre text-slate-100">
      {children || ' '}
    </pre>
  );
}

/** Sample test cases + "Run" against them (visible cases only; final grading runs hidden cases too). */
export function RunPanel({ question, code, attemptId, disabled }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const samples = question.sampleTestCases ?? [];

  async function run() {
    setRunning(true);
    setError(null);
    try {
      setResult(await api(`/attempts/${attemptId}/run`, { method: 'POST', body: { questionId: question.id, code } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">
          Sample tests{' '}
          {result && (
            <span className="text-slate-500">
              · {result.passed}/{result.total} passed
            </span>
          )}
        </p>
        {attemptId && (
          <Button size="sm" variant="secondary" onClick={run} loading={running} disabled={disabled || !samples.length}>
            ▶ Run sample tests
          </Button>
        )}
      </div>
      {error && <Alert className="mt-2">{error}</Alert>}
      <p className="mt-1 text-xs text-slate-500">
        Your final answer is also checked against hidden tests after you submit.
      </p>
      <div className="mt-3 space-y-3">
        {samples.map((tc, i) => {
          const r = result?.results?.[i];
          const verdict = r && (VERDICT[r.verdict] ?? { tone: 'slate', label: r.verdict });
          return (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Case {i + 1}</span>
                {verdict && <Badge tone={verdict.tone}>{verdict.label}</Badge>}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="mb-0.5 text-[11px] text-slate-500 uppercase">Input</p>
                  <Pre>{tc.input}</Pre>
                </div>
                <div>
                  <p className="mb-0.5 text-[11px] text-slate-500 uppercase">Expected output</p>
                  <Pre>{tc.expectedOutput}</Pre>
                </div>
                {r && (
                  <div className="sm:col-span-2">
                    <p className="mb-0.5 text-[11px] text-slate-500 uppercase">Your output</p>
                    <Pre>{r.stdout}</Pre>
                    {r.stderr && <Pre>{r.stderr}</Pre>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
