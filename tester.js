var jwGate = require('jw-gate');

console.log('go');

var myGate = new jwGate.Gate(['a'], true);

myGate.on('unlocked', function() {
    console.log('unlocked');
});



setTimeout(function() {
    myGate.lock(['a'], false);
}, 2500);