import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OdontogramaComponent } from './odontograma.component';

describe('OdontogramaComponent', () => {
  let component: OdontogramaComponent;
  let fixture: ComponentFixture<OdontogramaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OdontogramaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OdontogramaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
