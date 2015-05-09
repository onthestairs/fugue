"use strict";

require("babel/register");
var Fugue = require('./fugue');

const declaration = {
    'users': {
        dependencies: [],
        value: []
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
            return users_name_length.reduce((a, b) =>  a + b, 0);
        }
    },
    'result': {
        dependencies: ['total_names_length', 'total_users'],
        value: (total_names_length, total_users) => [total_names_length, total_users]
    }
};

var f = new Fugue(declaration);

var taskId = f.setValue('users', [{id: 1, name: "bethany"}, {id: 2, name: "alice"}, {id: 3, name: "carly"}]);

console.log(taskId);

taskId = f.setValue('users', [{id: 1, name: "aust"}, {id: 2, name: "jeff"}]);

console.log(taskId);

setTimeout(() => {
    let value = f.getValue('result');
    console.log(value);
}, 1000);

// console.log(f.data);
