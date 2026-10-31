/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuizConfig, Question, UserType } from '../types';
import { THEMES } from '../data/themes';
import familyQuizImage from '../data/frames/HelFamilj.webp';
import halloweenQuizImage from '../data/frames/halloween_quiz.webp';
import kidsQuizImage from '../data/frames/kids_quiz.webp';
import musicQuizImage from '../data/frames/music_quiz.webp';
import rallyQuizImage from '../data/frames/rally_quiz.webp';

export const getActiveTheme = (question: Question | null, category: UserType, config: QuizConfig) => {
    const categoryThemeId = category === 'barn' ? config.barnThemeId : config.vuxenThemeId;
    return (question?.themeId && THEMES.find(t => t.id === question.themeId)) ||
           (categoryThemeId && THEMES.find(t => t.id === categoryThemeId)) ||
           (config.themeId && THEMES.find(t => t.id === config.themeId)) ||
           THEMES[0];
};
export const getThemeHeroImage = (config: QuizConfig) => {
    if (config.themeId === 'halloween' || config.barnThemeId === 'halloween' || config.vuxenThemeId === 'halloween') {
        return halloweenQuizImage;
    }
    if (config.themeId === 'music' || config.barnThemeId === 'music' || config.vuxenThemeId === 'music') {
        return musicQuizImage;
    }
    if (config.themeId === 'rally' || config.barnThemeId === 'rally' || config.vuxenThemeId === 'rally') {
        return rallyQuizImage;
    }
    if (config.themeId === 'kids' || config.barnThemeId === 'kids' || config.vuxenThemeId === 'kids') {
        return kidsQuizImage;
    }
    return familyQuizImage;
};
