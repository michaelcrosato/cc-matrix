const name=process.argv[2];let passed=0;const failures=[];let exception='';
try{const suite=await import('./suites/'+name+'.mjs');await suite.run((ok,message)=>{if(ok)passed++;else failures.push(String(message));});}catch(error){exception=String(error.stack||error);}
const environment=!!exception&&/Target crashed|page crashed|Target page, context or browser has been closed|browser has been closed|ERR_ABORTED|frame was detached/i.test(exception);
console.log('__SUITE_RESULT__'+JSON.stringify({passed,failures,exception,environment}));process.exitCode=failures.length||exception?1:0;
