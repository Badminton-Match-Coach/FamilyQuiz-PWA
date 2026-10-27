export type ThemeId = 'default' | 'halloween' | 'party' | 'kids' | 'rally';

export interface Theme {
  id: ThemeId;
  name: string;
  frameImageUrl: string;
  backgroundColor: string;
}

export const THEMES: Theme[] = [
  { id: 'default', name: 'Standard', frameImageUrl: '/assets/aistudio/default_frame.png', backgroundColor: '#fcfbf7' },
  { id: 'halloween', name: 'Halloween', frameImageUrl: '/assets/aistudio/halloween_frame.png', backgroundColor: '#1a1a1a' },
  { id: 'party', name: 'Party', frameImageUrl: '/assets/aistudio/party_frame.png', backgroundColor: '#fff5f5' },
  { id: 'kids', name: 'Barn', frameImageUrl: '/assets/aistudio/kids_frame.png', backgroundColor: '#f0f9ff' },
  { id: 'rally', name: 'Bilrally', frameImageUrl: '/assets/aistudio/rally_frame.png', backgroundColor: '#fef3c7' },
];
