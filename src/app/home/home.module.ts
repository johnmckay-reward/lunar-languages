import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';
import { WelcomeScreenComponent } from '../components/welcome-screen/welcome-screen.component';
import { DisplayPanelComponent } from '../components/display-panel/display-panel.component';
import { QuickPhrasesModalComponent } from '../components/quick-phrases-modal/quick-phrases-modal.component';
import { CulturalNotesModalComponent } from '../components/cultural-notes-modal/cultural-notes-modal.component';
import { NumbersModalComponent } from '../components/numbers-modal/numbers-modal.component';
import { SentenceBuilderComponent } from '../components/sentence-builder/sentence-builder.component';
import { IntroModalComponent } from '../components/intro-modal/intro-modal.component';
import { UpgradeModalComponent } from '../components/upgrade-modal/upgrade-modal.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule
  ],
  declarations: [
    HomePage,
    WelcomeScreenComponent,
    DisplayPanelComponent,
    QuickPhrasesModalComponent,
    CulturalNotesModalComponent,
    NumbersModalComponent,
    SentenceBuilderComponent,
    IntroModalComponent,
    UpgradeModalComponent
  ]
})
export class HomePageModule {}
