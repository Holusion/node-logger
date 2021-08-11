'use strict';
/* istanbul ignore file */

module.exports = class ILogger{
  //log functions
  get log(){
    return this.notice;
  }
  get warn(){
    return this.warning;
  }
  //Placeholders that will be dynamically overloaded
  emerg(...any){};
  alert(...any){};
  crit(...any){};
  error(...any){};
  warning(...any){};
  notice(...any){};
  info(...any){};
  debug(...any){}; 
}