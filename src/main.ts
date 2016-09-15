import 'core-js';
import 'reflect-metadata';
import 'zone.js/dist/zone';

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

@NgModule({
    declarations: [ AppComponent ],
    imports: [ BrowserModule ],
    providers: [],
    bootstrap: [ AppComponent ]
})
class PspMinerModule {};