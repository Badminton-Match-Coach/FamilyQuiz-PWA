/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuizConfig, Question, UserType } from '../types';
import { THEMES } from '../data/themes';

export const getActiveTheme = (question: Question | null, category: UserType, config: QuizConfig) => {
    const categoryThemeId = category === 'barn' ? config.barnThemeId : config.vuxenThemeId;
    return (question?.themeId && THEMES.find(t => t.id === question.themeId)) ||
           (categoryThemeId && THEMES.find(t => t.id === categoryThemeId)) ||
           (config.themeId && THEMES.find(t => t.id === config.themeId)) ||
           THEMES[0];
};
export const getThemeHeroImage = (config: QuizConfig) => {
    if (config.themeId === 'halloween' || config.barnThemeId === 'halloween' || config.vuxenThemeId === 'halloween') {
        return 'halloween_quiz.webp';
    }
    if (config.themeId === 'music' || config.barnThemeId === 'music' || config.vuxenThemeId === 'music') {
        return 'music_quiz.webp';
    }
    if (config.themeId === 'rally' || config.barnThemeId === 'rally' || config.vuxenThemeId === 'rally') {
        return 'rally_quiz.webp';
    }
    return 'HelFamilj.webp';
};
