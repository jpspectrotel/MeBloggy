import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { trigger, transition, style, query, group, animate } from '@angular/animations';

@Component({
  selector: 'app-root',
  template: `
    <app-header></app-header>
    <div [@routeAnimations]="prepareRoute(outlet)">
      <router-outlet #outlet="outlet"></router-outlet>
    </div>
  `,
  styles: [``],
  animations: [
    trigger('routeAnimations', [
      transition('HomePage => ShowcasePage', [
        query(':enter, :leave', style({ position: 'fixed', width: '100%' }), { optional: true }),
        group([
          query(':leave', [animate('300ms ease-out', style({ transform: 'translateX(100%)', opacity: 0 }))], { optional: true }),
          query(':enter', [style({ transform: 'translateX(-100%)', opacity: 0 }), animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))], { optional: true })
        ])
      ])
      ,
      transition('ShowcasePage => HomePage', [
        query(':enter, :leave', style({ position: 'fixed', width: '100%' }), { optional: true }),
        group([
          query(':leave', [animate('300ms ease-out', style({ transform: 'translateX(-100%)', opacity: 0 }))], { optional: true }),
          query(':enter', [style({ transform: 'translateX(100%)', opacity: 0 }), animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))], { optional: true })
        ])
      ])
    ])
  ]
})
export class AppComponent {
  prepareRoute(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }
}
