import { Injectable }       from '@angular/core';
import { ApiService }       from './api.service';
import { IData }            from '../interfaces/data.interface';
import { Observable, Observer }       from 'rxjs';

@Injectable()
export class DataService {
    private liveData: Observable<IData>;
    private selectedData: any;
    private live: Observable<boolean>;
    private liveObserver: Observer<boolean>;
    
    constructor( private apiService:ApiService ) {
        
        this.live = Observable.create( observer => {
            this.liveObserver = observer;
            observer.next(false);
        });
        
        
        this.liveData = Observable.create( observer => {
            let si;
            this.live.subscribe({
                next: (live) => {
                    if(live) {
                        si = setInterval( () => {
                            this.apiService.getData().subscribe( data => {
                                observer.next(data);
                            });
                        }, 60000 );
                    }
                    else {
                        clearInterval(si);
                    }
                }
            })
            
        });
        
    }
    
    startLiveData() {
        this.liveObserver.next(true);
    }
    stopLiveData() {
        this.liveObserver.next(false);
    }
    
    loadArchiveData() {
        
    }

}