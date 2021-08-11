'use strict';

const { expect } = require('chai');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

describe("sends logs to syslog",()=>{
  it("prints a line", async ()=>{
    const {stdout, stderr} = await exec(`
      node -e 'const {logger} = require("../lib"); logger.log("Foo")'  | logger -t controller --no-act --stderr --prio-prefix
    `, {cwd: __dirname});
    expect(stderr).to.match(/<13>.*controller: Foo/); //Don't try to match the timestamp
  });
  
})