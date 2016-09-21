import { Injectable }               from '@angular/core';
import { ApiService }               from './api.service';
import { IData }                    from '../interfaces/data.interface';
import { IDrawables }               from '../interfaces/draw.interface';
import { Observable, Observer }     from 'rxjs';
import * as d3                      from 'd3';
import * as _                       from 'lodash';

@Injectable()
export class SimulationService {
    public update:Observable<IDrawables>;
    private d3:any;
    private links:any[];
    private nodes:any[];
    private updateObserver:Observer<IDrawables>;
    private distance:number = 40;
    private simulation:any;
    private stats:any;
    
    constructor() {
        this.d3 = <any>d3;
        this.links = [];
        this.nodes = [];
        
        
        this.update = Observable.create( observer => {
            this.updateObserver = observer;
        });
        
        this.update.share();
    }
    
    setData(nodes) {
        this.nodes = JSON.parse(JSON.stringify(nodes));
        this.links = [];
        this.stats = {
          min: 100,
          max: 1
        };
        let eventsRange = [];
        nodes.forEach((node) => {
            if(this.stats.min > node.events)
                this.stats.min = node.events | 0;
            if(this.stats.max < node.events)
                this.stats.max = node.events | 0;
            eventsRange.push(node.events);
            if(node.children) {
                node.children.forEach((child) => {
                    let c = _.find(this.nodes,(n)=>{return n.name===child;});
                    if(c){
                        this.links.push({
                            target: node.name,
                            source: c.name
                        });
                   } 
                });
            }
        });
        eventsRange.sort(function (a, b) {
          if (a > b) {
            return 1;
          }
          if (a < b) {
            return -1;
          }
          return 0;
        });
        this.stats.s = eventsRange[(eventsRange.length-1)*.25|0];
        this.stats.m = eventsRange[(eventsRange.length-1)*.5|0];
        this.stats.l = eventsRange[(eventsRange.length-1)*.75|0];
        
        console.log(this.stats);
        this.runSimulation();
    }
    
    runSimulation() {
        if(this.simulation) {
            //console.log('stoping sim');
            this.simulation.stop();
        }
        let _nodes = JSON.parse(JSON.stringify(this.nodes));
        let _links = JSON.parse(JSON.stringify(this.links));
        
        this.simulation = this.d3.forceSimulation(_nodes)
            .force("charge", this.d3.forceManyBody())
            .force("link", this.d3.forceLink(_links).id(function (d) {return d.name;}).distance(this.distance).strength(1))
            .force("x", this.d3.forceX())
            .force("y", this.d3.forceY())
            .on("tick", () => {
                //console.log('tick');
                this.updateObserver.next({
                    nodes:_nodes,
                    links:_links,
                    stats:this.stats
                })
            })
            .on("end", () => {
                //console.log('end');
            });
    }
}