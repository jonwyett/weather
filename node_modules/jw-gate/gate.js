/**
 * Creates a "Gate" with multiple locks
 * 
 * @param {String[]} lockNames -The names of the locks
 * @param {Boolean} [locked] - The initial state of all locks
 */
function Gate(lockNames, locked) {
    //emits 'locked' or 'unlocked' when the state changes from all locks locked to all locks unlocked and visa versa
    //example use is to lock various locks when running async code, unlocking when complete and then running a function


    //check for valid params
    if (lockNames.constructor !== Array) { return null; } //must supply an array of lock names
    if (typeof locked === 'undefined') { locked = false; } //unlocked by default
    var _locks = {}; //the main locks object
    var _state = 'unlocked';
    if (locked === true) { _state = 'locked'; }

    //create the locks
    /* format:
    locks = {
        myLock: false,
        anotherLock: false
    };
    */
    for (var i=0; i<lockNames.length; i++) {
        _locks[lockNames[i]] = locked; 
    }

    function checkGate() {
        //checks the gate to see if it's state has changed
        
        var unlocked = true; //start with the assumption that all locks are open
        //iterate through the locks and see if any are unlocked, if they are set allLocked to false
        Object.keys(_locks).forEach(function(lock) {
            if (_locks[lock] === true) { unlocked = false; } //something's locked, so the gate is locked
        });

        if (_state === 'locked' && unlocked === true) {
            _state = 'unlocked';
            emit(_state);
        // @ts-ignore
        } else if (_state === 'unlocked' && unlocked === false) {
            _state = 'locked';
            emit(_state);
        }

    }

    this.lock = function(lock, locked) {
        //lock or unlock a specific lock
        //  -lock: string, the name of the locked
        //  -locked: bool, true=locked
        try {
            _locks[lock] = locked;
            checkGate();
            return true;
        } catch (error) {
            return false;
        }
    };

    this.state = function() {
        //returns an object that represents the state of the gate
        /*
            {
                state: 'locked'/'unlocked',
                locks: {
                    mylock: true //locked,
                    anotherLock: false //unlocked
                }
            }
        */

        var res = {};
        res.state = _state;
        res.locks = {};

        Object.keys(_locks).forEach(function(lock) {
            res.locks[lock] = _locks[lock];
        });

        return res;
    };

    /*******************   Custom Emitter Code  **************************************************/
    //this is for browser compatibility
    var _events = {};
    this.on = function(event, callback) {
        //attaches a callback function to an event
        _events[event] = callback;    
    };
    function emit(event) {
        if (typeof _events[event] === 'function') { //the client has registered the event
            _events[event](); //run the event function provided
        }   
    }
    /*******************************************************************************************/
}


if (typeof module !== 'undefined' && module.exports) {
    exports.Gate = Gate;
}





