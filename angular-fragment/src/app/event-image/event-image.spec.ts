import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventImage } from './event-image';

describe('EventImage', () => {
  let component: EventImage;
  let fixture: ComponentFixture<EventImage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventImage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventImage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
