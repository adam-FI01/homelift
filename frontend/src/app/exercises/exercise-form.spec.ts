import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { ExerciseForm } from './exercise-form';

function setup(id?: number) {
  TestBed.configureTestingModule({
    imports: [ExerciseForm],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const fixture = TestBed.createComponent(ExerciseForm);
  if (id) fixture.componentRef.setInput('id', id);
  const http = TestBed.inject(HttpTestingController);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!;
  return { fixture, http, el, button, navigate };
}

describe('ExerciseForm', () => {
  it('creates an exercise once every field is filled in', async () => {
    const { fixture, http, el, button, navigate } = setup();
    const save = button('Save');
    expect(save.disabled).toBe(true);

    const name = el.querySelector('input')!;
    name.value = 'Cable Lateral Raise';
    name.dispatchEvent(new Event('input'));
    button('Shoulders').click();
    button('Cable').click();
    await fixture.whenStable();
    expect(save.disabled).toBe(false);

    save.click();
    const req = http.expectOne({ method: 'POST', url: '/api/exercises' });
    expect(req.request.body).toEqual({
      name: 'Cable Lateral Raise',
      muscleGroup: 'SHOULDERS',
      equipment: 'CABLE',
      restSeconds: null,
      notes: null,
      stepKg: null,
    });
    req.flush({ id: 9, ...req.request.body, archived: false });
    expect(navigate).toHaveBeenCalledWith(['/exercises']);
    http.verify();
  });

  it('sends a clip after saving a new exercise', async () => {
    const { fixture, http, el, button, navigate } = setup();
    const name = el.querySelector('input')!;
    name.value = 'Cable Row';
    name.dispatchEvent(new Event('input'));
    button('Back').click();
    button('Cable').click();

    const clip = new File([new Uint8Array(32)], 'row.mp4', { type: 'video/mp4' });
    const picker = el.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(picker, 'files', { value: [clip] });
    picker.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(el.querySelector('video')).not.toBeNull());

    button('Save').click();
    const created = http.expectOne({ method: 'POST', url: '/api/exercises' });
    created.flush({ id: 9, ...created.request.body, archived: false });
    const upload = http.expectOne({ method: 'PUT', url: '/api/exercises/9/media' });
    expect(upload.request.headers.get('Content-Type')).toBe('video/mp4');
    upload.flush({ id: 9, name: 'Cable Row', mediaUrl: '/api/exercises/9/media/9-x.mp4' });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/exercises']);
  });

  it('refuses a file that is not a picture or clip', async () => {
    const { fixture, el } = setup();
    const doc = new File(['hi'], 'notes.pdf', { type: 'application/pdf' });
    const picker = el.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(picker, 'files', { value: [doc] });
    picker.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(el.querySelector('[role=alert]')).not.toBeNull());
    expect(el.textContent).toContain('JPEG, PNG or WebP');
    expect(fixture).toBeTruthy();
  });

  it('removes the saved picture when asked', async () => {
    const { fixture, http, el, button, navigate } = setup(1);
    http.expectOne('/api/exercises/1').flush({
      id: 1,
      name: 'Dip',
      muscleGroup: 'ARMS',
      equipment: 'BODYWEIGHT',
      mediaUrl: '/api/exercises/1/media/1-a.png',
      mediaType: 'IMAGE',
      archived: false,
    });
    await fixture.whenStable();
    expect(el.querySelector('img')).not.toBeNull();

    button('Remove').click();
    await fixture.whenStable();
    expect(el.querySelector('img')).toBeNull();
    button('Save').click();
    http
      .expectOne({ method: 'PUT', url: '/api/exercises/1' })
      .flush({ id: 1, name: 'Dip', mediaUrl: '/api/exercises/1/media/1-a.png' });
    http.expectOne({ method: 'DELETE', url: '/api/exercises/1/media' }).flush({ id: 1 });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/exercises']);
  });

  it('shows the server message when the name is taken', async () => {
    const { fixture, http, button } = setup(1);
    http
      .expectOne('/api/exercises/1')
      .flush({ id: 1, name: 'Dip', muscleGroup: 'ARMS', equipment: 'BODYWEIGHT', archived: false });
    await fixture.whenStable();

    button('Save').click();
    http
      .expectOne({ method: 'PUT', url: '/api/exercises/1' })
      .flush(
        { detail: 'An exercise named "Dip" already exists.' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role=alert]')?.textContent,
    ).toContain('already exists');
  });

  it('archives an existing exercise', async () => {
    const { fixture, http, button, navigate } = setup(1);
    http
      .expectOne('/api/exercises/1')
      .flush({ id: 1, name: 'Dip', muscleGroup: 'ARMS', equipment: 'BODYWEIGHT', archived: false });
    await fixture.whenStable();

    button('Archive exercise').click();
    http.expectOne({ method: 'POST', url: '/api/exercises/1/archive' }).flush({
      id: 1,
      name: 'Dip',
      muscleGroup: 'ARMS',
      equipment: 'BODYWEIGHT',
      archived: true,
    });
    expect(navigate).toHaveBeenCalledWith(['/exercises']);
  });
});
