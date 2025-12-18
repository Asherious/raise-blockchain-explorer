import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CHANNELS } from './channels';

describe('CHANNELS', () => {
  let component: CHANNELS;
  let fixture: ComponentFixture<CHANNELS>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CHANNELS]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CHANNELS);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
