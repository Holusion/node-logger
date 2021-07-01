'use strict';
const {Writable: WritableStream} = require("stream");


const Logger = require("../lib");
const {logger, levels} = require("../lib");
const { expect } = require("chai");


class LogData extends WritableStream {
  constructor({isTTY=false} ={}){
    super();
    this._buf = Buffer.alloc(0);
    this.isTTY = isTTY;
  }
  _write(chunk, encoding, next){
    this._buf = Buffer.concat([
      this._buf,
      (typeof chunk == "string")?Buffer.from(chunk, encoding) : chunk,
    ]);
    next();
  }
  get contents(){
    return this._buf.toString('utf8');
  }
}

describe("logger", ()=>{
  it("can obtain default logger", ()=>{
    expect(logger).to.be.instanceOf(Logger);
  });

  it("has functions for every log levels",()=>{
    expect(levels).to.be.an("object");
    expect(Object.keys(levels)).to.have.property("length", 8);
    for(let level in levels){
      expect(logger[level]).to.be.a("function");
    }
  });

  it("disables prio-prefix if output is a TTY", ()=>{
    const stdout = new LogData({isTTY: true});
    const l = new Logger({stdout});
    l.error("FOO");
    expect(stdout.contents).to.equal("FOO\n");
  });


  describe("piped", ()=>{
    let stdout;
    beforeEach(function(){
      stdout = new LogData();
    });
    it("can create a logger", ()=>{
      let logger = new Logger({stdout});
      expect(logger).to.be.instanceOf(Logger);
    });

    it("can reconfigure logger", ()=>{
      let logger = new Logger({facility:2, stdout, level: 5});
      expect(logger).to.have.property("facility", 2);
      expect(logger).to.have.property("level", 5);
      expect(logger).to.have.property("_stdout", stdout);

      logger.configure({level: 6});
      expect(logger).to.have.property("facility", 2);
      expect(logger).to.have.property("level", 6);
      expect(logger).to.have.property("_stdout", stdout);

      logger.configure({facility: "local7"});
      expect(logger).to.have.property("facility", 23);
      expect(logger).to.have.property("level", 6);
      expect(logger).to.have.property("_stdout", stdout);
    });

    it("configure can throw when invalid", ()=>{
      const l = new Logger();
      [
        "foo",
        25, //last facility is 23
        {}
      ].forEach((facility)=>{
        expect(()=>{
          l.configure({facility});
        }).to.throw(Error);
      })
    });
  
    it("throw if facility is invalid", ()=>{
      expect(()=>{
        new Logger({facility: "foo", level: 7});
      }).to.throw("Unknown logger facility requested : foo");
    });


    for(let level in levels){
      it(`prepends prio-prefix for logger.${level}()`,()=>{
        let logger = new Logger({facility:1, stdout, level: 7});
        logger[level]("foo");
        expect(levels[level]).to.be.a("number");
        expect(stdout.contents).to.equal(`<${levels[level]+8}>foo\n`);
      });
    }

    it("logger.log is an alias for logger.notice", ()=>{
      expect(logger.log).to.equal(logger.notice);
    });

    it("logger.warn is an alias for logger.warning", ()=>{
      expect(logger.warn).to.equal(logger.warning);
    });
    

    it("ignore logs above configured level", ()=>{
      let logger = new Logger({facility:1, stdout, level: 5});
      logger.debug("foo");
      logger.warning("bar");
      expect(stdout.contents).to.equal(`<${4+8}>bar\n`);
    });

    it("can use level names", ()=>{
      let logger = new Logger({facility:1, stdout, level: "warning"});
      logger.debug("foo");
      logger.warning("bar");
      expect(stdout.contents).to.equal(`<${4+8}>bar\n`);
    })

    it("throw if level name is invalid", ()=>{
      expect(()=>{
        let logger = new Logger({facility:1, stdout, level: "foo"});

      }).to.throw("Unknown logger level requested : foo");
    });
    
    it("uses facility number in prio-prefix", ()=>{
      let logger = new Logger({facility: 5, stdout, level: 7});
      logger.debug("foo");
      //See --prio-prefix in `man logger`
      expect(stdout.contents).to.equal(`<${7+5*8}>foo\n`);
    });

    it("can use facilities names", ()=>{
      let logger = new Logger({facility:"user", stdout, level: 7});
      logger.debug("foo");
      //See --prio-prefix in `man logger`
      expect(stdout.contents).to.equal(`<${7+1*8}>foo\n`);
    })

    it("keeps the ability to format strings", ()=>{
      let logger = new Logger({facility:1, stdout, level: 7});
      logger.debug("hello %s", "world");
      expect(stdout.contents).to.equal(`<${7+8}>hello world\n`);
    });

    it("uses utils.inspect if applicable",()=>{
      //See https://nodejs.org/api/console.html
      let logger = new Logger({facility:1, stdout, level: 7});
      logger.debug({hello:"world"});
      expect(stdout.contents).to.equal(`<${7+8}> { hello: \'world\' }\n`);
    });

    it("swallows errors from output stream", ()=>{
      let logger = new Logger({facility:1, stdout, level: 7});
      stdout.write = ()=>{
        stdout.emit("error", new Error("something something"));
      }
      expect(()=>{
        logger.info("Foo");
      }).not.to.throw(Error);
    });
    it("transmit errors from output stream if possible", (done)=>{
      let logger = new Logger({facility:1, stdout, level: 7});
      stdout.on("error", (err)=>{
        console.log("Error caught");
        try{
          expect(err).to.have.property("message", "something something");
          done();
        }catch(e){
          done(e);
        }
      });

      stdout.write = ()=>{
        stdout.emit("error", new Error("something something"));
      }
      expect(()=>{
        logger.info("Foo");
      }).not.to.throw(Error);

    })
  });

});