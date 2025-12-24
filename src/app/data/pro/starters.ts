import { Phrase } from '../../interfaces';
import { starters as freeStarters } from '../free/starters';

export const starters: Phrase[] = [
  ...freeStarters,
  // Add pro starters here
  { id: 'like', type: 'starter', english: 'I would like...' },
  { id: 'is_there', type: 'starter', english: 'Is there...?' },
  { id: 'love', type: 'starter', english: 'I like...' },
  { id: 'another', type: 'starter', english: 'Another... please' },
  { id: 'share', type: 'starter', english: 'Let\'s share...' },
  { id: 'is_free', type: 'starter', english: 'Is... free?' }
];
