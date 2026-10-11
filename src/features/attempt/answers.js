/** Does this response count as an answer (same rules as the server's graders)? */
export function isAnswered(question, response) {
  if (!response) return false;
  switch (question.type) {
    case 'mcq':
      return (response.selected ?? []).length > 0;
    case 'fill_blank':
      return Object.values(response.values ?? {}).some((v) => String(v).trim() !== '');
    case 'debug':
      return String(response.code ?? response.answer ?? '').trim() !== '';
    case 'snippet':
      return String(response.answer ?? '').trim() !== '';
    default:
      return false;
  }
}

export const TYPE_LABELS = {
  mcq: 'Multiple choice',
  fill_blank: 'Fill in the blanks',
  debug: 'Debug the code',
  snippet: 'Code snippet',
};

export const LANGUAGE_LABELS = { python: 'Python', c: 'C', cpp: 'C++', java: 'Java', javascript: 'JavaScript' };
