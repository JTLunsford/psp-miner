import { Component, ElementRef, HostListener }  from '@angular/core';
import { DataService }                          from './services/data.service';
import { SimulationService }                          from './services/simulation.service';
import { IData }                                from './interfaces/data.interface';
import * as d3                                  from 'd3';

@Component({    
    selector: 'psp-miner',
    template: `<canvas [attr.width]="d3Width" [attr.height]="d3Height"></canvas>`
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
      this.d3Height = this.el.offsetHeight;
      
      this.dataService.data.subscribe(data => {
        this.data = data;
        this.loaded = true;
        this.canvas = document.querySelector("canvas");
        this.context = this.canvas.getContext("2d");
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
      drawables.nodes.forEach((d) => {
        this.context.moveTo(d.x + 3, d.y);
        this.context.arc(d.x, d.y, 3, 0, 2 * Math.PI);
      });
      
      this.context.fill();
      this.context.strokeStyle = "#fff";
      this.context.stroke();
      
      this.context.restore();
    }

    @HostListener('window:resize', ['$event'])
    onResize(event) {
        this.d3Width = this.el.offsetWidth;
        this.d3Height = this.el.offsetHeight;
        console.log(this.d3Width,this.d3Height);
        //this.loadVisualization();
    }
    
}