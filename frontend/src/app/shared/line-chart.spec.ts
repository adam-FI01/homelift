import { TestBed } from '@angular/core/testing';
import { LineChart } from './line-chart';

describe('LineChart', () => {
  async function setup() {
    TestBed.configureTestingModule({ imports: [LineChart] });
    const fixture = TestBed.createComponent(LineChart);
    fixture.componentRef.setInput('label', 'Estimated 1-rep max');
    fixture.componentRef.setInput('unit', 'kg');
    fixture.componentRef.setInput('points', [
      { x: new Date(2026, 10, 2).getTime(), y: 90 },
      { x: new Date(2026, 10, 9).getTime(), y: 92.5 },
      { x: new Date(2026, 10, 16).getTime(), y: 95.3 },
    ]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const frame = el.querySelector('[role=group]') as HTMLElement;
    const press = async (key: string) => {
      frame.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      await fixture.whenStable();
    };
    return { fixture, el, frame, press };
  }

  it('reads points with the arrow keys', async () => {
    const { el, press } = await setup();
    expect(el.querySelector('.tip')).toBeNull();

    await press('ArrowLeft');
    expect(el.querySelector('.tip')?.textContent).toContain('95.3 kg');
    await press('ArrowLeft');
    expect(el.querySelector('.tip')?.textContent).toContain('92.5 kg');
    expect(el.querySelector('.tip')?.textContent).toContain('9');
    await press('Home');
    expect(el.querySelector('.tip')?.textContent).toContain('90 kg');
    await press('Escape');
    expect(el.querySelector('.tip')).toBeNull();
  });

  it('picks the nearest point under the pointer', async () => {
    const { fixture, el, frame } = await setup();
    frame.getBoundingClientRect = () => ({ left: 0, width: 350, top: 0, height: 160 }) as DOMRect;
    frame.dispatchEvent(new PointerEvent('pointermove', { clientX: 170, bubbles: true }));
    await fixture.whenStable();
    expect(el.querySelector('.tip')?.textContent).toContain('92.5 kg');
  });
});
