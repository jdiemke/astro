import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Slider-Fragment: dynamisches SSR pro Request (z.B. abhängig von ?cityId=...)
  {
    path: 'fragment/slider',
    renderMode: RenderMode.Server,
  },

  // Fallback: Rest wie bisher prerendern
  // diesen rendermode ggf nutzen für die nicht personalisierte variante und SEO?
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
