import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockDetails } from './block-details';

describe('BlockDetails', () => {
  let component: BlockDetails;
  let fixture: ComponentFixture<BlockDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlockDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlockDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
