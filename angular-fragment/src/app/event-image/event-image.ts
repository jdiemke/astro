import {Component, input} from '@angular/core';

@Component({
  selector: 'app-event-image',
  standalone: true,
  imports: [],
  templateUrl: './event-image.html',
  styleUrl: './event-image.scss',
})
export class EventImage {
  imageUrl = input('');

  public getUrl(): string {
    let url = "/openair.png"
    if(this.imageUrl()) {
      url = this.imageUrl();
    }
    return url;
  }
}
