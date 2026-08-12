/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language } from './i18n';

export type UserType = 'barn' | 'vuxen';

export interface Participant {
  id: string;
  name: string;
  type: UserType;
}

export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

export type QuestionType = 'options' | 'points';

export interface Question {
  id: string;
  text: string;
  type?: QuestionType;
  options: string[];
  correctAnswers: number[]; // Indices of the correct options
  maxPoints?: number; // Optional max points for points questions
  location?: Location;
  originalLanguage?: Language; // Language code when created (e.g. 'sv', 'fr', 'en', 'es')
  translations?: Record<string, { text: string; options: string[] }>;
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
  answerIndex?: number;
  pointsScored?: number;
  isCorrect?: boolean;
  timestamp: number;
}
