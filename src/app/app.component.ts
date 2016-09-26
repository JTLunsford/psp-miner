import { Component, ElementRef, HostListener }  from '@angular/core';
import { DataService }                          from './services/data.service';
import { SimulationService }                    from './services/simulation.service';
import { IData }                                from './interfaces/data.interface';
import * as d3                                  from 'd3';
import * as _                                   from 'lodash';

@Component({    
    selector: 'psp-miner',
    template: `
    <nav>
        <div class='title'><h1>psp-miner</h1></div>
    </nav>
    <section>
        <div class='label'><i class="fa fa-server" aria-hidden="true"></i> Latest Drawable: {{label}}</div>
        <div claas='sublabel'>Collecting since {{startDate}}</div>
        <div claas='sublabel'>{{eventCount}} events, {{processCount}} processes, {{connectionCount}} connections, {{resourceCount}} resources</div>
    </section>
    <footer>
    
    </footer>
    <canvas [attr.width]="d3Width" [attr.height]="d3Height"></canvas>
    `
})
export class AppComponent {
    private data:IData;
    private loaded:boolean = false;
    private el;
    private d3Width;
    private d3Height;
    private context:any;
    private canvas:any;
    
    constructor ( private dataService: DataService, private elRef:ElementRef, private simulationService:SimulationService ) {
      this.el = elRef.nativeElement;
      this.d3Width = this.el.offsetWidth;
      this.d3Height = this.el.offsetHeight-100;
      
      this.dataService.data.subscribe(data => {
        this.data = data;
        this.loaded = true;
        this.canvas = document.querySelector("canvas");
        this.context = this.canvas.getContext("2d");
        this.simulationService.setData(this.data);
      });
    }
    
    ngAfterViewChecked() {
      this.simulationService.update.subscribe( (drawables) => {
        if(this.loaded){
          this.tick(drawables);
        }
        
      });
    }
    
    tick(drawables) {
      this.context.clearRect(0, 0, this.d3Width, this.d3Height);
      this.context.save();
      this.context.translate(this.d3Width / 2, this.d3Height / 2);
      
      this.context.beginPath();
      drawables.links.forEach((d) => {
        this.context.moveTo(d.source.x, d.source.y);
        this.context.lineTo(d.target.x, d.target.y);
      });
      
      this.context.strokeStyle = "#aaa";
      this.context.stroke();
      
      this.context.beginPath();
      
      let types = _.groupBy(drawables.nodes, "type");
      
      
      _.each<any>(types['p'],(d) => {
        let size;
        if(d.events <= drawables.stats.s){
            size = 3;
        }
        if(d.events > drawables.stats.s && d.events <= drawables.stats.m){
            size = 5;
        }
        if(d.events > drawables.stats.m && d.events <= drawables.stats.l){
            size = 7;
        }
        if(d.events > drawables.stats.l){
            size = 9;
        }
        
        this.context.moveTo(d.x + size, d.y);
        this.context.arc(d.x, d.y, size, 0, 2 * Math.PI);
      });
      
      this.context.fillStyle = "#0000ff";
      this.context.fill();
      this.context.beginPath();
      _.each<any>(types['r'], (d) => {
        let size;
        if(d.events <= drawables.stats.s){
            size = 3;
        }
        if(d.events > drawables.stats.s && d.events <= drawables.stats.m){
            size = 5;
        }
        if(d.events > drawables.stats.m && d.events <= drawables.stats.l){
            size = 7;
        }
        if(d.events > drawables.stats.l){
            size = 9;
        }
        
        this.context.moveTo(d.x + size, d.y);
        this.context.arc(d.x, d.y, size, 0, 2 * Math.PI);
      });
      
      this.context.fillStyle = "#00ff00";
      this.context.fill();
      this.context.beginPath();
      _.each<any>(types['c'] , (d) => {
        let size;
        if(d.events <= drawables.stats.s){
            size = 3;
        }
        if(d.events > drawables.stats.s && d.events <= drawables.stats.m){
            size = 5;
        }
        if(d.events > drawables.stats.m && d.events <= drawables.stats.l){
            size = 7;
        }
        if(d.events > drawables.stats.l){
            size = 9;
        }
        
        this.context.moveTo(d.x + size, d.y);
        this.context.arc(d.x, d.y, size, 0, 2 * Math.PI);
      });
      
      this.context.fillStyle = "#ff0000";
      this.context.fill();
      
      this.context.restore();
    }

    @HostListener('window:resize', ['$event'])
    onResize(event) {
        this.d3Width = this.el.offsetWidth;
        this.d3Height = this.el.offsetHeight-100;
        console.log(this.d3Width,this.d3Height);
        //this.loadVisualization();
    }
    
}