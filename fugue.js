"use strict";

const toposort = require('toposort');
var isObjectEmpty = require('is-object-empty');
var Rx = require('rx');

var declaration = {
    'users': {
        dependencies: [],
        value: [{id: 1, name: "austin"}, {id: 2, name: "tony"}]
    },
    'total_users': {
        dependencies: ['users'],
        value: (users) => {
            return users.length;
        }
    },
    'users_name_length': {
        dependencies: ['users'],
        value: (users) => {
            return users.map(user => user.name.length);
        }
    },
    'total_names_length': {
        dependencies: ['users_name_length'],
        value: (users_name_length) => {
            return users_name_length.reduce((a, b) =>  a + b);
        }
    },
    'result': {
        dependencies: ['total_names_length', 'total_users'],
        value: (total_names_length, total_users) => [total_names_length, total_users]
    }
};

var data = {};

class Fugue {

    constructor(declaration) {
        this._declaration = declaration;
        this.data = declaration;
        this.makeTaskStream();
        this.listenForTasks();
        // this.data = this.computeData(callback);
    }

    makeTaskStream() {
        this.tasks = Rx.Observable.create((observer) => {
            this.taskStreamObserver = observer;
            return function () {
                console.log('disposed');
            };
        });
    }

    listenForTasks() {
        this.tasks.subscribe((task) => {
            console.log("EXECUTING TASK");
            task();
            console.log("COMPLETED TASK");
        });
    }

    getValue(key) {
        return this.data[key]['computed_value'];
    }

    setValue(key, value, block=false) {
        let nextTask = () => {
            this.taskStreamObserver.onNext(() => {
                this.data[key]['value'] = value;
                this.computeData();
            });
        };
        if(!block) {
            process.nextTick(nextTask);
        } else {
            nextTask();
        }
        return 'ADDED TASK';
    }

    computeData(callback) {
        let keys = key_order(this.data);
        var self = this;
        keys.forEach((key) => {
            let key_info = this.data[key];
            let declaration_value = key_info['value'];
            let value;
            if (typeof declaration_value == 'function') {
                let argument_names = key_info['dependencies'];
                let argument_values = argument_names.map(
                    (key) => this.data[key]['computed_value'], this);
                let f = declaration_value;
                value = f.apply(null, argument_values); // use es6 spead?
            } else {
                value = this.data[key]['value'];
            }
            this.data[key]['computed_value'] = value;
        }, this);

        if(callback) callback(this.data);
    }
}


const key_order = (declaration) => {
    var edges = [];
    for (let key in declaration) {
        let key_info = declaration[key];
        let dependencies = key_info['dependencies'];
        dependencies.forEach((dependency) => {
            edges.push([key, dependency]);
        });
    }
    const result = toposort(edges);
    return result.reverse();
};

module.exports = Fugue;
