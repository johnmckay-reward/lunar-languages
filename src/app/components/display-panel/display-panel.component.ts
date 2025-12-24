import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LanguageInfo, Phrase } from '../../interfaces';

@Component({
  selector: 'app-display-panel',
  templateUrl: './display-panel.component.html',
  styleUrls: ['./display-panel.component.scss'],
  standalone: false
})
export class DisplayPanelComponent {
  @Input() displayEnglish: string = '';
  @Input() displayNative: string = '';
  @Input() displayPhonetic: string = '';
  @Input() currentLanguage: LanguageInfo | null = null;
  @Input() currentAudioId: string | null = null;
  @Input() selectedStarter: Phrase | null = null;

  @Output() playAudio = new EventEmitter<number>();

  onPlayAudio(speed: number) {
    this.playAudio.emit(speed);
  }
}
