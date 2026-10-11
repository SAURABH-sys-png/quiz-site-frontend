import { Markdown, markBlanks } from '../../components/Markdown.jsx';
import { Badge } from '../../components/ui.jsx';
import { TYPE_LABELS } from './answers.js';
import { DebugInput, FillBlankInput, McqInput, SnippetInput } from './QuestionInputs.jsx';

const INPUTS = { mcq: McqInput, fill_blank: FillBlankInput, debug: DebugInput, snippet: SnippetInput };

/**
 * One question as the participant sees it (also used for the admin preview).
 * Renders only fields the API sends; there is nothing hidden in the UI.
 */
export function QuestionView({ question, number, total, response, onChange, disabled, attemptId, aside }) {
  const Input = INPUTS[question.type];
  const statement =
    question.type === 'fill_blank'
      ? markBlanks(
          question.statement,
          question.blanks.map((b) => b.id),
        )
      : question.statement;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {number != null && (
          <span className="font-semibold text-slate-700">
            Question {number}
            {total ? ` of ${total}` : ''}
          </span>
        )}
        <Badge tone="indigo">{TYPE_LABELS[question.type]}</Badge>
        <Badge>
          {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
        </Badge>
        {question.negativeMarks > 0 && <Badge tone="red">−{question.negativeMarks} if wrong</Badge>}
        {aside}
      </div>
      <Markdown>{statement}</Markdown>
      <Input question={question} response={response} onChange={onChange} disabled={disabled} attemptId={attemptId} />
    </div>
  );
}
