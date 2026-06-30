import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiOdontogramaComponent } from './mi-odontograma.component';

describe('MiOdontogramaComponent', () => {
  let component: MiOdontogramaComponent;
  let fixture: ComponentFixture<MiOdontogramaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiOdontogramaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MiOdontogramaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
