export interface Translation {
  text: string;
  phonetic: string;
  audio?: string;
}

export interface ListenFor {
  text: string;
  phonetic: string;
  meaning: string;
}

export interface LanguageInfo {
  code: string;
  name: string;
  location: string;
  flag: string;
  phoneticGuide: string;
}

export interface Phrase {
  id: string;
  type: 'essential' | 'starter' | 'noun';
  category?: string;
  english: string;
  translation?: Translation;
  listenFor?: ListenFor[];
}

export interface CombinationMap {
  [key: string]: {
    english: string;
    translation?: Translation;
  };
}
