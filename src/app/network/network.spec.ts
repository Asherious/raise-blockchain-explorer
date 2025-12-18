import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NETWORK } from './network';

describe('NETWORK', () => {
  let component: NETWORK;
  let fixture: ComponentFixture<NETWORK>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NETWORK]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NETWORK);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
