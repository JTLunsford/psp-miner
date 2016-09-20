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
    public data: Observable<IData>;
    private dataObserver: Observer<IData>;
    
    constructor( private apiService:ApiService ) {
        
        this.live = Observable.create( observer => {
            this.liveObserver = observer;
            observer.next(true);
        });
        
        this.live.share();
        
        this.liveData = Observable.create( observer => {
            let si;
            this.live.subscribe({
                next: (live) => {
                    if(live) {
                        this.apiService.getData().subscribe( data => {
                            observer.next(data.json());
                        });
                        si = setInterval( () => {
                            this.apiService.getData().subscribe( data => {
                                observer.next(data.json());
                            });
                        }, 60000 );
                    }
                    else {
                        clearInterval(si);
                    }
                }
            })
        });
        
        this.liveData.share();
        
        this.data = Observable.create( observer => {
            this.liveData.subscribe( data => {
               observer.next(data); 
            });
        });
        
        this.data.share();
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