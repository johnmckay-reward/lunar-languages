import { LanguageInfo } from '../../interfaces';
import { supportedLanguages as freeSupportedLanguages } from '../free/supported-languages';

export const supportedLanguages: LanguageInfo[] = [
  ...freeSupportedLanguages,
  // Add pro supported languages here
];
