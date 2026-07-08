import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, arrowBackSharp, chevronBack, chevronForward,
  chevronForwardOutline, closeOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    // Register the built-in icons Ionic uses implicitly (back button, item
    // detail arrow) so they render even when the app is served as a single
    // self-contained file with no /svg assets alongside it.
    addIcons({
      arrowBackOutline, arrowBackSharp, chevronBack, chevronForward,
      chevronForwardOutline, closeOutline
    });
  }
}
