import { LanguageInfo } from '../interfaces';

export const supportedLanguages: LanguageInfo[] = [
  {
    code: 'zh',
    name: 'Mandarin',
    location: 'China',
    flag: '🇨🇳',
    phoneticGuide: 'Mandarin uses tones. Pay attention to the rising and falling marks (ā, á, ǎ, à) as they change the meaning.'
  },
  {
    code: 'es',
    name: 'Spanish',
    location: 'Spain',
    flag: '🇪🇸',
    phoneticGuide: 'Spanish vowels are short and crisp (a, e, i, o, u). The "r" is often rolled.'
  },
  {
    code: 'fr',
    name: 'French',
    location: 'France',
    flag: '🇫🇷',
    phoneticGuide: 'French flows smoothly. Many final consonants are silent. "R" is pronounced in the back of the throat.'
  },
  {
    code: 'de',
    name: 'German',
    location: 'Germany',
    flag: '🇩🇪',
    phoneticGuide: 'German is phonetic but crisp. "W" sounds like English "V". "V" sounds like English "F".'
  },
  {
    code: 'ja',
    name: 'Japanese',
    location: 'Japan',
    flag: '🇯🇵',
    phoneticGuide: 'Japanese syllables are equal length. Vowels are pure (ah, ee, oo, eh, oh). No stress accents.'
  },
  {
    code: 'it',
    name: 'Italian',
    location: 'Italy',
    flag: '🇮🇹',
    phoneticGuide: 'Italian is rhythmic and melodic. Vowels are clear and open. Double consonants are pronounced longer.'
  },
  {
    code: 'pt',
    name: 'Portuguese',
    location: 'Portugal',
    flag: '🇵🇹',
    phoneticGuide: 'Portuguese is nasal and smooth. Vowels can be open or closed. "S" at the end of words often sounds like "sh".'
  },
  {
    code: 'uk',
    name: 'Ukrainian',
    location: 'Ukraine',
    flag: '🇺🇦',
    phoneticGuide: 'Ukrainian is melodic. "H" is soft (like hotel). "Y" is like "i" in bit. Stress is dynamic.'
  },
  {
    code: 'ru',
    name: 'Russian',
    location: 'Russia',
    flag: '🇷🇺',
    phoneticGuide: 'Russian is stress-timed. Unstressed "o" sounds like "a". Consonants can be hard or soft.'
  },
  {
    code: 'pl',
    name: 'Polish',
    location: 'Poland',
    flag: '🇵🇱',
    phoneticGuide: 'Polish has complex consonant clusters. "Sz" is like "sh", "cz" like "ch". Stress is usually on the second-to-last syllable.'
  }
];
