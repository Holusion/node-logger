const util = require("util");

function noop() {}

/**
 * @typedef LoggerConfig
 * @property {string|number} [facility] - facility name or number (as defined in Logger.facilities). default: user
 * @property {string|number} [level] - level name or number (as defined in Logger.level). default: notice
 * @property {WritableStream} [stdout] - output stream. default: process.stdout
 */

class Logger{
  /**
   * @param {LoggerConfig} opts 
   */
  constructor(opts={}){
    //define aliases
    //finish object configuration
    this.configure(opts);
  }
  /**
   * @param {LoggerConfig} opts
   */
  configure({ facility, level, stdout }){
    this._stdout = stdout || this._stdout || process.stdout;
    switch(typeof facility){
      case "number":
        if(0 < facility /*kern is forbidden*/ && facility <= 23){
          this.facility = facility;
        }else{
          throw new Error(`Unknown logger facility requested : ${facility}`);
        }
        break;
      case "string":
        if( Logger.facilities[facility]) {
          this.facility = Logger.facilities[facility];
        }else{
          throw new Error(`Unknown logger facility requested : ${facility}`);
        }
        break;
      case "undefined":
        this.facility = (typeof this.facility !== "undefined")? this.facility : Logger.facilities["user"];
        break;
      default:
        throw new Error(`Unknown logger facility requested : ${facility}`);
    }

    if(typeof level === "undefined"){
      this.level = (typeof this.level !== "undefined")? this.level : Logger.levels["notice"];
    }else if(typeof level === "number"){
      this.level = level;
    }else if(typeof Logger.levels[level] !== "undefined"){
      this.level = Logger.levels[level];
    }else{
      throw new Error(`Unknown logger level requested : ${level}`);
    }
  }

  static _default = new Logger();
  /**
   * Default class instance
   */
  static get logger() {
    return Logger._default;
  }

  _log(data, ...args){
    //Copied from console.log original code
    const stream = this._stdout;
    const string = util.format(data, ...args)+"\n";
    // There may be an error occurring synchronously (e.g. for files or TTYs
    // on POSIX systems) or asynchronously (e.g. pipes on POSIX systems), so
    // handle both situations.
    try {
      // Add and later remove a noop error handler to catch synchronous
      // errors.
      if (stream.listenerCount('error') === 0)
        stream.once('error', this.errorHandler);

      stream.write(string);
    } catch (e) {
      // Sorry, there's no proper way to pass along the error here.
    } finally {
      stream.removeListener('error', this.errorHandler);
    }
  }

  /* istanbul ignore next */
  errorHandler = (err)=>{
    //Copied from console module code
    const stream = this._stdout;
    if (err !== null && !stream._writableState.errorEmitted) {
      // If there was an error, it will be emitted on `stream` as
      // an `error` event. Adding a `once` listener will keep that error
      // from becoming an uncaught exception, but since the handler is
      // removed after the event, non-console.* writes won't be affected.
      // we are only adding noop if there is no one else listening for 'error'
      if (stream.listenerCount('error') === 0) {
        stream.once('error', noop);
      }
    }
  }
  
  // From doc : https://wiki.gentoo.org/wiki/Rsyslog
  static get facilities() {
    return {
      //kern: 0, //kernel messages. FORBIDDEN!
      user: 1, //user-level messages
      mail: 2, //mail system
      daemon: 3, //system daemons
      auth: 4, //security/authorization messages
      syslog: 5, //messages generated internally by syslogd
      lpr: 6, //line printer subsystem
      news: 7, //network news subsystem
      uucp: 8, //UUCP subsystem
      cron: 9, //clock daemon
      security: 10, //security/authorization messages
      ftp: 11, //FTP daemon
      ntp: 12, //NTP subsystem
      logaudit: 13, //log audit
      logalert: 14, //log alert
      clock: 15, //clock daemon (note 2)
      local0: 16, //local use 0 (local0)
      local1: 17, //local use 1 (local1)
      local2: 18, //local use 2 (local2)
      local3: 19, //local use 3 (local3)
      local4: 20, //local use 4 (local4)
      local5: 21, //local use 5 (local5)
      local6: 22, //local use 6 (local6)
      local7: 23, //local use 7 (local7) 
    }
  }

  static get levels (){
    return {
      emerg: 0, //system is unusable
      alert: 1, //action must be taken immediately
      crit: 2, //critical conditions
      error: 3, //error conditions
      warning: 4, //warning conditions
      notice: 5, //normal but significant condition
      info: 6, //informational messages
      debug: 7, //debug-level messages 
    }
  }
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

for (let level in Logger.levels){
  let levelNb = Logger.levels[level];
  Logger.prototype[level] = function(data, ...args){
    if(this.level < levelNb ) return;
    if(this._stdout.isTTY) return this._log(data, ...args);
    if(typeof data === "string"){
      return this._log(`<${levelNb+this.facility*8}>${data}`, ...args);
    }else{
      return this._log(`<${levelNb+this.facility*8}>`, data, ...args);
    }
  }
}


module.exports = Logger;
