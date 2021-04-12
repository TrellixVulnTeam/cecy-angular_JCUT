import {Routes} from '@angular/router';
import { FormsComponent } from './form.component';

export const FormRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: '',
                component: FormsComponent
            },
            {
                path: 'edit/:id',
                component: FormsComponent
            }, 
            {
                path: 'view/:id',
                component: FormsComponent
            },
            {
                path: 'planning/:id',
                component: FormsComponent
            }          
        ]
    }
];
