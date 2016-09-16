import { Component } from '@angular/core';
import { ApiService } from './services/api.service';

@Component({    
    selector: 'psp-miner',
    template: '<h1>psp miner!</h1>'
})
export class AppComponent {
    constructor ( private apiService: ApiService ) {
        
        this.apiService.postArchive( 'bob' ).subscribe((res)=>{
            console.log(res);
        });
    }
    
}