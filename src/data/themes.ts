import defaultFrame from './frames/default_frame.png';
import halloweenFrame from './frames/halloween_frame.png';
import partyFrame from './frames/party_frame.png';
import kidsFrame from './frames/kids_frame.png';
import rallyFrame from './frames/rally_frame.png';

export type ThemeId = 'default' | 'halloween' | 'party' | 'kids' | 'rally';
export type ThemeNameKey =
  | 'themeDefault'
  | 'themeHalloween'
  | 'themeParty'
  | 'themeKids'
  | 'themeRally';

export interface Theme {
  id: ThemeId;
  nameKey: ThemeNameKey;
  frameImageUrl?: string;
  backgroundColor: string;
  frameColor: string;
  frameAccentColor: string;
}

export const THEMES: Theme[] = [
  { id: 'default', nameKey: 'themeDefault', frameImageUrl: defaultFrame, backgroundColor: '#fcfbf7', frameColor: '#8d6e63', frameAccentColor: '#d7ccc8' },
  { id: 'halloween', nameKey: 'themeHalloween', frameImageUrl: halloweenFrame, backgroundColor: '#1a1a1a', frameColor: '#f97316', frameAccentColor: '#7c3aed' },
  { id: 'party', nameKey: 'themeParty', frameImageUrl: partyFrame, backgroundColor: '#fff5f5', frameColor: '#ec4899', frameAccentColor: '#facc15' },
  { id: 'kids', nameKey: 'themeKids', frameImageUrl: kidsFrame, backgroundColor: '#f0f9ff', frameColor: '#0ea5e9', frameAccentColor: '#fb923c' },
  { id: 'rally', nameKey: 'themeRally', frameImageUrl: rallyFrame, backgroundColor: '#fef3c7', frameColor: '#dc2626', frameAccentColor: '#1f2937' },
];
