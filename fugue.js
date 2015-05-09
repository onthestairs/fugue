"use strict";

const toposort = require('toposort');
var isObjectEmpty = require('is-object-empty');

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
        this.tasks = {};
        this.taskIds = [];
        this.executingTasks = false;
        this.taskCount = 0;
        // this.data = this.computeData(callback);
    }

    addTask(task) {
        let taskId = this.taskCount;
        this.taskCount++;
        this.tasks[taskId] = task;
        this.taskIds.push(taskId);
        if(!this.executingTasks) {
            process.nextTick(this.executeTasks.bind(this));
        }
        return taskId;
    }

    executeTasks() {
        this.executingTasks = true;
        while(this.taskIds.length > 0) {
            let taskId = this.taskIds[0];
            let task = this.tasks[taskId];
            console.log("EXECUTING TASK", taskId);
            task();
            console.log("FINISHED TASK", taskId);
            delete this.tasks[taskId];
            this.taskIds.shift();
        }
        this.executingTasks = false;
    }

    getValue(key) {
        return this.data[key]['computed_value'];
    }

    setValue(key, value) {
        let taskId = this.addTask(() => {
            this.data[key]['value'] = value;
            this.computeData();
        });
        return taskId;
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
