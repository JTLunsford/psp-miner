import { Injectable }       from '@angular/core';
import { Http, Headers }    from '@angular/http';
import 'rxjs/add/operator/map';

@Injectable()
export class ApiService {
    private urlSuffix:string = ''; //https://psp-miner-ironman9967.c9users.io
    
    constructor( private http:Http ) { }
    
    getData() {
        return this.http.get( this.urlSuffix + '/api/data' );
    }
    
    postArchive( name:string ) {
         return this.http.post( this.urlSuffix + '/api/data/archive', { name:name } );
    }
    
    getArchive() {
         return this.http.get( this.urlSuffix + '/api/data/archive' );
    }
    
    getArchiveName( name:string ) {
         return this.http.get( this.urlSuffix + '/api/data/archive/' + name );
    }
    
    getConfig() {
         return this.http.get( this.urlSuffix + '/api/config' );
    }
    
    putConfig( config:any ) {
         return this.http.put( this.urlSuffix + '/api/config', config );
    }
    
    deleteData() {
         return this.http.delete( this.urlSuffix + '/api/data' );
    }
}