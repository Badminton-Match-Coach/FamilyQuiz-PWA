import defaultFrame from './frames/default_frame.webp';
import halloweenFrame from './frames/halloween_frame.webp';
import partyFrame from './frames/party_frame.webp';
import kidsFrame from './frames/kids_frame.webp';
import rallyFrame from './frames/rally_frame.webp';
import musicFrame from './frames/music_frame.webp';
import treasureHuntFrame from './frames/treasurehunt_frame.webp';

export type ThemeId = 'default' | 'halloween' | 'party' | 'kids' | 'rally' | 'music' | 'treasurehunt';
export type ThemeNameKey =
  | 'themeDefault'
  | 'themeHalloween'
  | 'themeParty'
  | 'themeKids'
  | 'themeRally'
  | 'themeMusic'
  | 'themeTreasureHunt';

export interface Theme {
  id: ThemeId;
  nameKey: ThemeNameKey;
  frameImageUrl?: string;
  backgroundColor: string;
  contentBackgroundColor: string; // New: Background for cards/questions
  textColor: string; // New: Primary text color
  frameColor: string;
  frameAccentColor: string;
}

export const THEMES: Theme[] = [
  { id: 'default', nameKey: 'themeDefault', frameImageUrl: defaultFrame, backgroundColor: '#fcfbf7', contentBackgroundColor: '#ffffff', textColor: '#1e293b', frameColor: '#8d6e63', frameAccentColor: '#d7ccc8' },
  { id: 'halloween', nameKey: 'themeHalloween', frameImageUrl: halloweenFrame, backgroundColor: '#1a1a1a', contentBackgroundColor: '#2d2d2d', textColor: '#f8fafc', frameColor: '#f97316', frameAccentColor: '#7c3aed' },
  { id: 'party', nameKey: 'themeParty', frameImageUrl: partyFrame, backgroundColor: '#fff5f5', contentBackgroundColor: '#ffffff', textColor: '#4c0519', frameColor: '#ec4899', frameAccentColor: '#facc15' },
  { id: 'kids', nameKey: 'themeKids', frameImageUrl: kidsFrame, backgroundColor: '#f0f9ff', contentBackgroundColor: '#ffffff', textColor: '#0c4a6e', frameColor: '#0ea5e9', frameAccentColor: '#fb923c' },
  { id: 'rally', nameKey: 'themeRally', frameImageUrl: rallyFrame, backgroundColor: '#fef3c7', contentBackgroundColor: '#ffffff', textColor: '#451a03', frameColor: '#dc2626', frameAccentColor: '#1f2937' },
  { id: 'music', nameKey: 'themeMusic', frameImageUrl: musicFrame, backgroundColor: '#faf5ff', contentBackgroundColor: '#ffffff', textColor: '#581c87', frameColor: '#7e22ce', frameAccentColor: '#f59e0b' },
  { id: 'treasurehunt', nameKey: 'themeTreasureHunt', frameImageUrl: treasureHuntFrame, backgroundColor: '#fefce8', contentBackgroundColor: '#ffffff', textColor: '#064e3b', frameColor: '#a16207', frameAccentColor: '#15803d' },
];
