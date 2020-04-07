console.log('Begin demo...');

var Gate = require('./gate');

var gate = new Gate.Gate(
    ['random', 'time'],
    true //it's locked to start
); 

gate.on('unlocked', function() {
    console.log('\r\n----GATE UNLOCKED!----\r\n');    
    gate.lock('time', true);
    gate.lock('random', true);
});

gate.on('locked', function() {
    console.log('gate locked...');
});

//every 3 seconds unlock the time gate
setInterval(function() {
    //check for the status of the time gate and only unlock if locked
    if (gate.state().locks.time === true) {
        console.log('...unlocking time...');
        gate.lock('time', false);
    }
    console.log('Current State: \r\n' + JSON.stringify(gate.state().locks));
    
}, 3000);

//every 1 seconds randomly lock/unlock the random gate
setInterval(function() {
    var random =Math.random();
    if (random >= 0.5) {
        gate.lock('random', true);
           
    } else {
        if (gate.state().locks.random === true) {
            console.log('...unlocking random...'); 
            gate.lock('random', false);
        }
    }
}, 1000);
