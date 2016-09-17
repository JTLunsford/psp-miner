import { Component, ElementRef, HostListener }    from '@angular/core';
import { DataService }  from './services/data.service';
import { IData }        from './interfaces/data.interface';
import * as d3          from 'd3';

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
    private link;
    private links;
    private node;
    private nodes;
    private svg;
    private force;
    
    constructor ( private dataService: DataService, private elRef:ElementRef ) {
        this.el = elRef.nativeElement;
        this.d3Width = this.el.offsetWidth;
        this.d3Height = this.el.offsetHeight;
        
        this.dataService.data.subscribe(data => {
           this.data = data;
           this.loaded = true;
           this.loadVisualization();
        });
    }
    
    loadVisualization(){
        let d3Any : any = <any>d3;
        
        var nodes = d3Any.range(1000).map(function(i) {
          return {
            index: i
          };
        });
        
        var links = d3Any.range(nodes.length - 1).map(function(i) {
          return {
            source: Math.floor(Math.sqrt(i)),
            target: i + 1
          };
        });
        
        var simulation = d3Any.forceSimulation(nodes)
            .force("charge", d3Any.forceManyBody())
            .force("link", d3Any.forceLink(links).distance(20).strength(1))
            .force("x", d3Any.forceX())
            .force("y", d3Any.forceY())
            .on("tick", ticked);
        
        var canvas = document.querySelector("canvas");
        var context = canvas.getContext("2d");
        var width = this.d3Width;
        var height = this.d3Height;
        
        d3Any.select(canvas)
            .call(d3Any.drag()
                .container(canvas)
                .subject(dragsubject)
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));
        
        function ticked() {
          context.clearRect(0, 0, width, height);
          context.save();
          context.translate(width / 2, height / 2);
        
          context.beginPath();
          links.forEach(drawLink);
          context.strokeStyle = "#aaa";
          context.stroke();
        
          context.beginPath();
          nodes.forEach(drawNode);
          context.fill();
          context.strokeStyle = "#fff";
          context.stroke();
        
          context.restore();
        }
        
        function dragsubject() {
          return simulation.find(d3Any.event.x - width / 2, d3Any.event.y - height / 2);
        }
        
        function dragstarted() {
          if (!d3Any.event.active) simulation.alphaTarget(0.3).restart();
          d3Any.event.subject.fx = d3Any.event.subject.x;
          d3Any.event.subject.fy = d3Any.event.subject.y;
        }
        
        function dragged() {
          d3Any.event.subject.fx = d3Any.event.x;
          d3Any.event.subject.fy = d3Any.event.y;
        }
        
        function dragended() {
          if (!d3Any.event.active) simulation.alphaTarget(0);
          d3Any.event.subject.fx = null;
          d3Any.event.subject.fy = null;
        }
        
        function drawLink(d) {
          context.moveTo(d.source.x, d.source.y);
          context.lineTo(d.target.x, d.target.y);
        }
        
        function drawNode(d) {
          context.moveTo(d.x + 3, d.y);
          context.arc(d.x, d.y, 3, 0, 2 * Math.PI);
        }
    }
    
    @HostListener('window:resize', ['$event'])
    onResize(event) {
        this.d3Width = this.el.offsetWidth;
        this.d3Height = this.el.offsetHeight;
        console.log(this.d3Width,this.d3Height);
    }
    
}