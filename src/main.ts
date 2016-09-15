import 'core-js';
import 'reflect-metadata';
import 'zone.js/dist/zone';

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppComponent } from './app/app.component';

@NgModule({
    declarations: [ AppComponent ],
    imports: [ BrowserModule ],
    providers: [],
    bootstrap: [ AppComponent ]
})
class PspMinerModule {};

platformBrowserDynamic().bootstrapModule(PspMinerModule);
