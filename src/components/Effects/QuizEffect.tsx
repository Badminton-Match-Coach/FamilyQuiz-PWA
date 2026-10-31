import React from 'react';
import { QuizEffectId } from '../../types';
import { Paskkarring } from './Paskkarring';
import { Spindel } from './Spindel';
import { Tomte } from './Tomte';

export const QuizEffect: React.FC<{ effectId: QuizEffectId }> = ({ effectId }) => {
  switch (effectId) {
    case 'spider':
      return <Spindel />;
    case 'santa':
      return <Tomte />;
    case 'easter-witch':
      return <Paskkarring />;
  }
};
