import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuestionView } from './QuestionView.jsx';

const mcq = {
  id: 'q1',
  type: 'mcq',
  statement: 'Which is **LIFO**?',
  marks: 2,
  negativeMarks: 1,
  multiSelect: false,
  options: [
    { id: 'A', text: 'Queue' },
    { id: 'B', text: 'Stack' },
  ],
};

describe('QuestionView', () => {
  it('renders an MCQ and reports the selection', async () => {
    const onChange = vi.fn();
    render(<QuestionView question={mcq} number={1} total={5} response={null} onChange={onChange} />);
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('−1 if wrong')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /Stack/ }));
    expect(onChange).toHaveBeenCalledWith({ selected: ['B'] });
  });

  it('supports multi-select', async () => {
    const onChange = vi.fn();
    render(
      <QuestionView question={{ ...mcq, multiSelect: true }} response={{ selected: ['A'] }} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /Stack/ }));
    expect(onChange).toHaveBeenCalledWith({ selected: ['A', 'B'] });
  });

  it('renders one input per blank', async () => {
    const onChange = vi.fn();
    const q = {
      id: 'q2',
      type: 'fill_blank',
      statement: 'Capital {{b1}} and {{b2}}',
      marks: 2,
      negativeMarks: 0,
      blanks: [{ id: 'b1' }, { id: 'b2' }],
    };
    render(<QuestionView question={q} response={{ values: { b1: 'Par' } }} onChange={onChange} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);
    await userEvent.type(inputs[0], 'i');
    expect(onChange).toHaveBeenLastCalledWith({ values: { b1: 'Pari' } });
  });

  it('renders snippet code read-only with a text answer', () => {
    const q = {
      id: 'q3',
      type: 'snippet',
      statement: 'Output?',
      marks: 1,
      negativeMarks: 0,
      language: 'javascript',
      code: 'console.log(1+1)',
      answerMode: 'text',
    };
    const { container } = render(<QuestionView question={q} response={null} onChange={() => {}} />);
    expect(container.querySelector('pre code')).toHaveTextContent('console.log(1+1)');
    expect(screen.getByPlaceholderText('Type the exact output')).toBeInTheDocument();
  });

  it('disables inputs when locked', () => {
    render(<QuestionView question={mcq} response={null} onChange={() => {}} disabled />);
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
  });
});
