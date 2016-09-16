import { Injectable }       from '@angular/core';
import { Http, Headers }    from '@angular/http';
import 'rxjs/add/operator/map';

@Injectable()
export class ApiService {
    private urlSuffix:string = ''; //https://psp-miner-ironman9967.c9users.io
    
    constructor( private http:Http ) { }
    
    getLive() {
        return this.http.get( this.urlSuffix + '/api/data' );
    }
    
    saveAndClear( name:string ) {
         return this.http.post( this.urlSuffix + '/api/data/archive', { name:name } );
    }
    
    clear() {
         return this.http.delete( this.urlSuffix + '/api/data' );
    }
}