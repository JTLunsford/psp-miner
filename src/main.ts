import 'core-js';
import 'reflect-metadata';
import 'zone.js/dist/zone';
import './app/app.component.css';

import { NgModule }                         from '@angular/core';
import { BrowserModule }                    from '@angular/platform-browser';
import { HttpModule }                       from '@angular/http';
import { platformBrowserDynamic }           from '@angular/platform-browser-dynamic';
import { AppComponent }                     from './app/app.component';
import { ApiService }                       from './app/services/api.service';
import { DataService }                      from './app/services/data.service';
import { SimulationService }                from './app/services/simulation.service';
// import { enableProdMode }                     from '@angular/core';
// enableProdMode();

@NgModule({
    declarations:   [ AppComponent ],
    imports:        [ BrowserModule, HttpModule ],
    providers:      [ ApiService, DataService, SimulationService ],
    bootstrap:      [ AppComponent ]
})
class PspMinerModule {};

platformBrowserDynamic().bootstrapModule(PspMinerModule);
