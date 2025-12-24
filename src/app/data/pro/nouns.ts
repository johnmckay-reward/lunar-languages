import { Phrase } from '../../interfaces';
import { nouns as freeNouns } from '../free/nouns';

export const nouns: Phrase[] = [
  ...freeNouns,
  // Dining
  { id: 'coffee', type: 'noun', category: 'Dining', english: 'Coffee' },
  { id: 'beer', type: 'noun', category: 'Dining', english: 'A Beer' },
  { id: 'wine', type: 'noun', category: 'Dining', english: 'A Glass of Wine' },
  { id: 'vegetarian', type: 'noun', category: 'Dining', english: 'A Vegetarian Dish' },
  { id: 'champagne', type: 'noun', category: 'Dining', english: 'Champagne' },

  // Leisure / Shopping
  { id: 'beach', type: 'noun', category: 'Leisure', english: 'The Beach' },
  { id: 'supermarket', type: 'noun', category: 'Shopping', english: 'The Supermarket' },
  { id: 'receipt', type: 'noun', category: 'Shopping', english: 'The Receipt' },
  { id: 'music', type: 'noun', category: 'Leisure', english: 'Music' },
];
