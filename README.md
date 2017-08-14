# data.js

data.js is a lightweight library providing a standardized interface for accessing data files and datasets.

A standardized stream interface plus minimal, standardized metadata make it an ideal building block 

It can be used both on its own as a building block 

## Features

* Easy: a single `load` for local, online and inline data
* Micro: The whole project is ~400 lines of code
* Simple: Oriented for single purpose
* Explicit: No hidden behaviours, no extra magic
* Frictionlesss: uses and supports (but does not require) Frictionless Data Package specs so you can leverage Frictionless tooling

[![Build Status](https://travis-ci.org/datahq/data.js.svg?branch=master)](https://travis-ci.org/datahq/data.js) [![Gitter](https://img.shields.io/gitter/room/frictionlessdata/chat.svg)](https://gitter.im/datahubio/chat)

## Installation

`npm install data.js`

## Usage

```javascript
const data = require('data.js')

// path can be local or remote
const file = data.File.load(path)

// descriptor with metadata e.g. name, path, format, (guessed) mimetype etc
console.log(file.descriptor)

    path: ...
    pathType: 'local|remote',
    name: ...
    format: ...
    mediatype: ...

// returns promise with raw stream
var stream = await file.stream()

// let's get an object stream of the rows
// (assuming it is tabular i.e. csv, xls etc)
var rowsStream = await resource.rows()
```

## API

### File objects

There are 3 types of file source we support:

* Local path
* Remote url
* Inline data

```javascript
const data = require('data.js')

const file = data.File.load('/path/to/file.csv')

const file = data.File.load('https://example.com/data.xls')

const file = data.File.load({
  name: 'mydata',
  data: { // can be any javascript - an object, an array or a string or ...
    a: 1,
    b: 2
  }
})
```

### Dataset objects

To create a new Dataset object please use `Dataset.load` method. It takes descriptor Object or identifier string:

```javascript
const data = require('data.js')
const pathOrDescriptor = 'https://raw.githubusercontent.com/datasets/co2-ppm/master/datapackage.json'
const dataset = await data.Dataset.load(pathOrDescriptor)
```

`pathOrDescriptor` - can be one of:

* local path to Dataset
* remote url to Dataset
* descriptor object

