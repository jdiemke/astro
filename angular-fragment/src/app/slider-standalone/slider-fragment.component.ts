import { Component } from '@angular/core';
import { SliderEvent } from '../interfaces/slider-event';
import { SliderStandalone } from './slider-standalone';

@Component({
  selector: 'app-slider-fragment',
  standalone: true,
  imports: [SliderStandalone],
  template: `<app-slider-standalone [events]="events"></app-slider-standalone>`,
})
export class SliderFragmentComponent {

  readonly events: SliderEvent[] = [
    {title: "Event 1", price: 100},
    {title: "Event 2", price: 300, imageUrl: "/openair2.png"},
    {title: "Event 3", price: 120},
    {title: "Event 4", price: 200, imageUrl: "/openair2.png"},
  ];
}

