import { QuizConfig } from '../types';

export interface QuizValidationResult {
  valid: boolean;
  error?: string;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const validateQuestion = (question: unknown, index: number): string | null => {
  if (!isObject(question)) return `Fråga ${index + 1} har fel format.`;
  if (typeof question.text !== 'string' || question.text.trim().length === 0) {
    return `Fråga ${index + 1} saknar frågetext.`;
  }
  if (!Array.isArray(question.options)) return `Fråga ${index + 1} saknar svarsalternativ.`;
  const options = question.options as unknown[];

  const questionType = question.type || 'options';
  if (questionType !== 'options' && questionType !== 'text' && questionType !== 'points') {
    return `Fråga ${index + 1} har en ogiltig frågetyp.`;
  }

  if (!Array.isArray(question.correctAnswers) || question.correctAnswers.some(
    answer => !Number.isInteger(answer) || answer < 0 || answer >= options.length
  )) {
    if (questionType !== 'text' && questionType !== 'points') {
      return `Fråga ${index + 1} har ogiltigt rätt svar.`;
    }
  }

  if (question.location !== undefined) {
    if (!isObject(question.location) || !Number.isFinite(question.location.lat) || !Number.isFinite(question.location.lng)) {
      return `Fråga ${index + 1} har en ogiltig position.`;
    }
  }

  return null;
};

export function validateQuizConfig(value: unknown): QuizValidationResult {
  if (!isObject(value)) return { valid: false, error: 'Quizet måste vara ett JSON-objekt.' };
  if (typeof value.title !== 'string' || value.title.trim().length === 0) {
    return { valid: false, error: 'Quizet saknar titel.' };
  }
  if (!Array.isArray(value.barnQuestions) || !Array.isArray(value.vuxenQuestions)) {
    return { valid: false, error: 'Quizet måste innehålla barn- och vuxenfrågor.' };
  }
  if (value.geotagUnlockDistance !== undefined && (
    typeof value.geotagUnlockDistance !== 'number' || !Number.isFinite(value.geotagUnlockDistance) || value.geotagUnlockDistance < 5
  )) {
    return { valid: false, error: 'Quizet har ett ogiltigt geotagg-avstånd.' };
  }
  if (value.requireSequentialAnswers !== undefined && typeof value.requireSequentialAnswers !== 'boolean') {
    return { valid: false, error: 'Quizet har ett ogiltigt sekvensval.' };
  }

  for (const [index, question] of [...value.barnQuestions, ...value.vuxenQuestions].entries()) {
    const error = validateQuestion(question, index);
    if (error) return { valid: false, error };
  }

  return { valid: true };
}

export function assertValidQuizConfig(value: unknown): asserts value is QuizConfig {
  const result = validateQuizConfig(value);
  if (!result.valid) throw new Error(result.error || 'Ogiltigt quizformat.');
}
