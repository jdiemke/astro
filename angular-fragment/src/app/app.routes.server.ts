import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Pfad, unter dem die App in der Shell gerendert wird
  {
    path: 'angular-slider',
    renderMode: RenderMode.Server,
  },
  // Fallback: Rest wie bisher prerendern
  // diesen rendermode ggf nutzen für die nicht personalisierte variante und SEO?
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
