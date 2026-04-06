import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { Blocks } from './blocks/blocks';
import { BlockDetails } from './block-details/block-details';
import { PageNotFoundComponent } from './page-not-found-component/page-not-found-component';

export const routes: Routes = [
  {
    path: '',
    component: Dashboard,
  },
  {
    path: 'blocks',
    component: Blocks,
  },
  {
    path: 'block/:blockNumber',
    component: BlockDetails,
  },
  {
    path: 'address/:hash',
    component: BlockDetails,
  },
  {
    path: '**',
    component: PageNotFoundComponent,
  },
];
