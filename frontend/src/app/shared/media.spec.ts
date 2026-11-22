import { fitWithin, mediaProblem } from './media';

describe('media helpers', () => {
  it('scales pictures down to the long edge and never up', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 960, height: 720 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 720, height: 960 });
    expect(fitWithin(600, 400)).toEqual({ width: 600, height: 400 });
  });

  it('accepts small pictures and clips and refuses the rest', () => {
    expect(mediaProblem({ type: 'image/png', size: 10_000_000 })).toBeNull(); // shrunk before upload
    expect(mediaProblem({ type: 'video/mp4', size: 5_000_000 })).toBeNull();
    expect(mediaProblem({ type: 'video/mp4', size: 16_000_000 })).toContain('15 MB');
    expect(mediaProblem({ type: 'application/pdf', size: 10 })).toContain('JPEG');
  });
});
