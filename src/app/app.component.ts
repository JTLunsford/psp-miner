import { Component }    from '@angular/core';
import { DataService }  from './services/data.service';

@Component({    
    selector: 'psp-miner',
    template: '<h1>psp miner!</h1>'
})
export class AppComponent {
    constructor ( private dataService: DataService ) {
        
        this.dataService.startLiveData();
    }
    
}