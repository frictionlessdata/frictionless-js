`frictionless.js` is a lightweight, standardized "stream-plus-metadata" interface for accessing files and datasets, especially tabular ones (CSV, Excel).

`frictionless.js` follows the ["Frictionless Data Lib Pattern"][fd-pattern].

[fd-pattern]: http://okfnlabs.org/blog/2018/02/15/design-pattern-for-a-core-data-library.html#dataset

* **Open it fast**: simple `open` method for data on disk, online and inline
* **Data plus**: data plus metadata (size, path, etc) in standardized way
* **Stream it**: raw streams and object streams
* **Tabular**: open CSV, Excel or arrays and get a row stream
* **Frictionless**: compatible with [Frictionless Data standards][fd]

[![Build Status](https://travis-ci.org/frictionlessdata/frictionless-js.svg?branch=master)](https://travis-ci.org/frictionlessdata/frictionless-js) [![Gitter](https://img.shields.io/gitter/room/frictionlessdata/chat.svg)](https://gitter.im/datahubio/chat)

A line of code is worth a thousand words ...

```
const {open} = require('frictionless.js')

var file = open('path/to/ons-mye-population-totals.xls')

file.descriptor
  {
    path: '/path/to/ons-mye-population-totals.xls',
    pathType: 'local',
    name: 'ons-mye-population-totals',
    format: 'xls',
    mediatype: 'application/vnd.ms-excel',
    encoding: 'windows-1252'
  }

file.size
  67584

file.rows() => stream object for rows
  // keyed by header row by default ...
  { 'col1': 1, 'col2': 2, ... }
  { 'col1': 10, 'col2': 20, ... }
```


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Motivation](#motivation)
- [Features](#features)
- [Installation](#installation)
- [Browser](#browser)
- [Usage](#usage)
- [API](#api)
- [Developers](#developers)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Motivation

`frictionless.js` is motivated by the following use cases:

* **Data "plus"**: when you work with data you always find yourself needing the data itself plus a little bit more -- things like where the data came from on disk (or is going to), or how large it is. This library gives you that information in a standardized way.
* **Convenient open**: the same simple `open` method whether you are accessing data on disk, from a URL or inline data from a string, buffer or array.
* **Streams (or strings)**: standardized iterator / object stream interface to data wherever you've loaded from online, on disk or inline
* **Building block for data pipelines**: provides a standardized building block for more complex data processing. For example, suppose you want to load a csv file then write to JSON. That's simple enough. But then suppose you want to delete the first 3 rows, delete the 2nd column. Now you have a more complex processing pipeline. This library provides a simple set of "data plus metadata" objects that you can pass along your pipeline.

## Features

* Easy: a single common API for local, online and inline data
* Micro: The whole project is ~400 lines of code
* Simple: Oriented for single purpose
* Explicit: No hidden behaviours, no extra magic
* Frictionlesss: uses and supports (but does not require) [Frictionless Data][fd] specs such as [Data Package][dp] so you can leverage Frictionless tooling
* Minimal glue: Use on its own or as a building block for more complex data tooling (thanks to its common minimal metadata)

[fd]: https://frictionlessdata.io/
[dp]: https://frictionlessdata.io/data-packages/

## Installation

`npm install frictionless.js`


## Browser

If you want to use the it in the browser, first you need to build the bundle.

Run the following command to generate the bundle for the necessary JS targets

`yarn build` 

This will create two bundles in the `dist` folder. `node` sub-folder contains build for node environment, while `browser` sub-folder contains build for the browser. In a simple html file you can use it like this:
```html
<head>
  <script src="./dist/browser/bundle.js"></script>
  <script>
    // Global data lib is available here...
    
    const file = data.open('path/to/file')
    ...
  </script>
</head>
<body></body>
```  

## Usage

With a simple file:

```javascript
const data = require('frictionless.js')

// path can be local or remote
const file = data.open(path)

// descriptor with metadata e.g. name, path, format, (guessed) mimetype etc
console.log(file.descriptor)

// returns promise with raw stream
const stream = await file.stream()

// let's get an object stream of the rows
// (assuming it is tabular i.e. csv, xls etc)
const rows = await file.rows()

// entire file as a buffer
const buffer = await file.buffer

//for large files you can return in chunks
await file.bufferInChunks((chunk, progress)=>{
  console.log(progress, chunk)
})


```

With a Dataset:

```javascript
const { Dataset } = require('frictionless.js')

const path = '/path/to/directory/' // must have datapackage.json in the directory atm

Dataset.load(path).then(dataset => {
  // get a data file in this dataset
  const file = dataset.resources[0]

  const data = file.stream()
})
```

## API

See API documentation [here](./docs)


## Developers

Requirements:

* NodeJS >= v8.10.0
* NPM >= v5.2.0


### Test

We have two type of tests Karma based for browser testing and Mocha with Chai for Node. All node tests are in `datajs/test` folder. Since Mocha is sensitive to test namings, we have separate the folder `/browser-test` for only Karma.

- To run browser test, first you need to build the library in order to have the bundle in `dist/browser` folder. Run: `yarn build:browser` to achieve this, then for browser testing use the command `yarn test:browser`, this will run Karma tests.
- To test in Node: `yarn test:node`
- To run all tests including Node and browser run `yarn test`
- To watch Node test run: `yarn test:node:watch`

### Setup

1. Git clone the repo
2. Install dependencies: `yarn`
3. To make the browser and node test work, first run the build: `yarn build`
4. Run tests: `yarn test`
5. Do some dev work
6. Once done, make sure tests are passing. Then build distribution version of the app - `yarn build`.

   Run `yarn build` to compile using webpack and babel for different node and web target. To watch the build run: `yarn build:watch`.

7. Now proceed to "Deployment" stage


### Deployment

1. Update version number in `package.json`.
2. Git commit: `git commit -m "some message, eg, version"`.
3. Release: `git tag -a v0.12.0 -m "some message"`.
4. Push: `git push origin master --tags`
5. Publish to NPM: `npm publish`
