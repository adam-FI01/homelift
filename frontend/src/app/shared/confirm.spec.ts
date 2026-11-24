import { TestBed } from '@angular/core/testing';
import { ConfirmHost } from './confirm-host';
import { ConfirmService } from './confirm.service';

describe('ConfirmService', () => {
  async function setup() {
    TestBed.configureTestingModule({ imports: [ConfirmHost] });
    const fixture = TestBed.createComponent(ConfirmHost);
    const service = TestBed.inject(ConfirmService);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const button = (text: string) =>
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!;
    return { fixture, service, el, button };
  }

  it('resolves true when confirmed', async () => {
    const { fixture, service, el, button } = await setup();
    const answer = service.ask({
      title: 'Delete Push?',
      message: 'Workouts are kept.',
      confirmLabel: 'Delete',
      danger: true,
    });
    await fixture.whenStable();
    expect(el.textContent).toContain('Delete Push?');
    expect(el.textContent).toContain('Workouts are kept.');
    expect(button('Delete').classList).toContain('btn-danger');

    button('Delete').click();
    expect(await answer).toBe(true);
    await fixture.whenStable();
    expect(el.querySelector('dialog')).toBeNull();
  });

  it('resolves false when cancelled or replaced', async () => {
    const { fixture, service, button } = await setup();
    const first = service.ask({ title: 'One?', confirmLabel: 'Yes' });
    const second = service.ask({ title: 'Two?', confirmLabel: 'Yes' });
    expect(await first).toBe(false);
    await fixture.whenStable();
    button('Cancel').click();
    expect(await second).toBe(false);
  });
});
