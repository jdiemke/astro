import { Routes } from '@angular/router';
import { SliderFragmentComponent } from './slider-standalone/slider-fragment.component';

export const routes: Routes = [
  // Pfad, unter dem die App in der Shell gerendert wird
  {
    path: 'angular-slider',
    component: SliderFragmentComponent,
  }
];
