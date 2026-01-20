import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {SliderEvent} from './interfaces/slider-event';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('Angular-SSR-PoC');
  events: SliderEvent[] = [
    {title: "Event 1", price: 100},
    {title: "Event 2", price: 300, imageUrl: "/openair2.png"},
    {title: "Event 3", price: 120},
    {title: "Event 4", price: 200, imageUrl: "/openair2.png"},
  ]
}
