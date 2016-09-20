import { Injectable }               from '@angular/core';
import { ApiService }               from './api.service';
import { IData }                    from '../interfaces/data.interface';
import { IDrawables }               from '../interfaces/draw.interface';
import { Observable, Observer }     from 'rxjs';
import * as d3                      from 'd3';

@Injectable()
export class SimulationService {
    public update:Observable<IDrawables>;
    private d3:any;
    private links:any[];
    private nodes:any[];
    private updateObserver:Observer<IDrawables>;
    private distance:number = 20;
    private simulation:any;
    
    constructor() {
        this.d3 = <any>d3;
        this.links = [];
        this.nodes = [];
        
        
        this.update = Observable.create( observer => {
            this.updateObserver = observer;
        });
        
        this.update.share();
        
        let last = {
            name: 'yo'+Math.floor(Math.random()*100)
        };
        this.nodes.push(last);
        this.nodes
        setInterval( ()=> {
            let current = {
                name: 'yo'+Math.floor(Math.random()*100)
            }
            this.nodes.push(current);
            
            this.links.push({
                target: current.name,
                source: last.name
            });
            
            last = Object.assign({}, current);
            
            this.runSimulation();
        },1000);
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
                    links:_links
                })
            })
            .on("end", () => {
                //console.log('end');
            });
    }
}