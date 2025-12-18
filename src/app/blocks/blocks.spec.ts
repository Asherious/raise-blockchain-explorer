import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BLOCKS } from './blocks';

describe('BLOCKS', () => {
  let component: BLOCKS;
  let fixture: ComponentFixture<BLOCKS>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BLOCKS]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BLOCKS);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
