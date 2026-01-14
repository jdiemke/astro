import { expect, test } from 'vitest';
import { experimental_AstroContainer } from 'astro/container';
import Slider from '../components/Slider.astro';

test('Slider', async () => {
  const container = await experimental_AstroContainer.create();

  const result = await container.renderToString(Slider, {
    props: {
      events: [
        { title: 'Test Event', price: 10, imageUrl: '/openair.png' },
      ],
    },
  });

  expect(result).toBeDefined();
  expect(result).toContain('Test Event');
});


