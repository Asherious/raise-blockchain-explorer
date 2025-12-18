import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DASHBOARD } from './dashboard';

describe('DASHBOARD', () => {
  let component: DASHBOARD;
  let fixture: ComponentFixture<DASHBOARD>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DASHBOARD]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DASHBOARD);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
