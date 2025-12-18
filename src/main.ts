import { bootstrapApplication, provideProtractorTestingSupport } from '@angular/platform-browser';
import { App } from './app/app';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(App, {
  providers: [provideProtractorTestingSupport(), provideRouter(routes), provideHttpClient()],
}).catch((err) => console.error(err));
