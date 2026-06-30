import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolicitarCitaComponent } from './solicitar-cita.component';

describe('SolicitarCitaComponent', () => {
  let component: SolicitarCitaComponent;
  let fixture: ComponentFixture<SolicitarCitaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitarCitaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SolicitarCitaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
