import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CHAINCODES } from './chaincodes';

describe('CHAINCODES', () => {
  let component: CHAINCODES;
  let fixture: ComponentFixture<CHAINCODES>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CHAINCODES]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CHAINCODES);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
