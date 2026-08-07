/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserType = 'barn' | 'vuxen';

export interface Participant {
  id: string;
  name: string;
  type: UserType;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
}

export interface QuizConfig {
  title: string;
  password?: string;
  barnQuestions: Question[];
  vuxenQuestions: Question[];
}

export interface AnswerRecord {
  participantId: string;
  questionIndex: number;
  answerIndex: number;
  isCorrect: boolean;
  timestamp: number;
}
