import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import RootLayout from './routes/__root';
import IndexRoute from './routes/index';
import FullscreenRoute from './routes/fullscreen';
import SettingsRoute from './routes/settings';

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexRoute,
});

const fullscreenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fullscreen',
  component: FullscreenRoute,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsRoute,
});

const routeTree = rootRoute.addChildren([indexRoute, fullscreenRoute, settingsRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
