export interface IConnectionData {
    path:string;
    procs:string[];
    events:number;
}

export interface IConnection {
    [index: string]:IConnectionData;
}

export interface IResourceData {
    path:string;
    procs:string[];
    events:number;
}

export interface IResource {
    [index: string]:IResourceData;
}

export interface IProcessData {
    procname:string;
    children:string[];
    resources:string[];
    connections:string[];
    events:number;
}

export interface IProcess {
    [index: string]:IProcessData;
}

export interface IData {
    processes:IProcess[];
    resources:IResource[];
    connections:IConnection[];
}