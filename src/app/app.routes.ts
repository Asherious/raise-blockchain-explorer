import { Routes } from '@angular/router';
import { DASHBOARD } from './dashboard/dashboard';
import { NETWORK } from './network/network';
import { BLOCKS } from './blocks/blocks';
import { CHAINCODES } from './chaincodes/chaincodes';
import { CHANNELS } from './channels/channels';
import { BlockDetails } from './block-details/block-details';
import { PageNotFoundComponent } from './page-not-found-component/page-not-found-component';

export const routes: Routes = [
  {
    path: '',
    component: DASHBOARD,
    title: 'Raise Blockchain Explorer - DASHBOARD',
  },
  {
    path: 'network',
    component: NETWORK,
    title: 'Raise Blockchain Explorer - NETWORK',
  },
  {
    path: 'blocks',
    component: BLOCKS,
    title: 'Raise Blockchain Explorer - BLOCKS',
  },
  {
    path: 'blocks/:blockId',
    component: BlockDetails,
    title: 'Raise Blockchain Explorer - BLOCK DETAILS',
  },
  {
    path: 'chaincodes',
    component: CHAINCODES,
    title: 'Raise Blockchain Explorer - CHAINCODES',
  },
  {
    path: 'channels',
    component: CHANNELS,
    title: 'Raise Blockchain Explorer - CHANNELS',
  },
  {
    path: '**',
    component: PageNotFoundComponent,
  },
];
