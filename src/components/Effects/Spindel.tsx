import React from 'react';
import spiderImage from '../../data/frames/halloween_spider.webp';

export const Spindel = () => {
  return (
    <div className="quiz-effect quiz-effect-spider" aria-hidden="true">
       <img src={spiderImage} alt="" className="w-full h-auto" />
    </div>
  );
};
