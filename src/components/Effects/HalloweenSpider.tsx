import React from 'react';
import spiderImage from '../../data/frames/halloween_spider.webp';

export const HalloweenSpider = () => {
  return (
    <div className="halloween-spider">
       <img src={spiderImage} alt="Spider" className="w-full h-auto" />
    </div>
  );
};
