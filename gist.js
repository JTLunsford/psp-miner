var Inherit = this.Inherit || function (newClass, classToInheritFrom) {

    //copy properties
    for (var property in classToInheritFrom)
    {
        if (classToInheritFrom.hasOwnProperty(property))
        {
            newClass[property] = classToInheritFrom[property];
        }
    }

    //Maintain the prototype chain
    function chain() {
        this.constructor = newClass;
    }
    chain.prototype = classToInheritFrom.prototype;
    newClass.prototype = new chain();
};

var events = require("events");

var Eventer = (function (base) {
    Inherit(Eventer, base);
    function Eventer() {
        base.call(this);
    }
    return Eventer;
})(events.EventEmitter);
Eventer.prototype = new events.EventEmitter();

var Person = (function (base) {
    function Person(name) {
        this.name = name;
        this.health = Math.floor((Math.random()*10)+5);
        this.on('hit',function(dead){
            this.health--;
            if(this.health<0)
            {
                console.log(this.name+' dies!')
                dead(true);
            }
            else
                dead(false);
        });
    }
    Person.prototype.swing = function(){
        if(Math.random()>.5)
            return true;
        return false;
    }
    Person.prototype.dance = function(){
        return this.dancing;
    }
    return Person;
})(Eventer);
Person.prototype = new Eventer();

var Ninja = (function (base) {
    function Ninja(name) {
        base.call(this, name);
        this.health = this.health*2;
    }
    return Ninja;
})(Person);
Ninja.prototype = new Person();

var dude1 = new Person("Dude1");
var dude2 = new Ninja("Dude2");


console.log('Is Dude1 a EventEmitter? ' + (dude1 instanceof events.EventEmitter));
console.log('Is Dude1 a Eventer? ' + (dude1 instanceof Eventer));
console.log('Is Dude1 a Person? ' + (dude1 instanceof Person));
console.log('Is Dude1 a Ninja? ' + (dude1 instanceof Ninja));
console.log('Dude1 health ' + (dude1.health));

console.log('Is Dude2 a EventEmitter? ' + (dude2 instanceof events.EventEmitter));
console.log('Is Dude2 a Eventer? ' + (dude2 instanceof Eventer));
console.log('Is Dude2 a Person? ' + (dude2 instanceof Person));
console.log('Is Dude2 a Ninja? ' + (dude2 instanceof Ninja));
console.log('Dude2 health ' + (dude2.health));