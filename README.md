`data.js` is a lightweight, standardized "stream-plus-metadata" interface for accessing files and datasets, especially tabular ones (CSV, Excel).

`data.js` follows the ["Frictionless Data Lib Pattern"][fd-pattern].

[fd-pattern]: http://okfnlabs.org/blog/2018/02/15/design-pattern-for-a-core-data-library.html#dataset

* **Open it fast**: simple `open` method for data on disk, online and inline
* **Data plus**: data plus metadata (size, path, etc) in standardized way
* **Stream it**: raw streams and object streams
* **Tabular**: open CSV, Excel or arrays and get a row stream
* **Frictionless**: compatible with [Frictionless Data standards][fd]

[![Build Status](https://travis-ci.org/datopian/data.js.svg?branch=master)](https://travis-ci.org/datopian/data.js) [![Gitter](https://img.shields.io/gitter/room/frictionlessdata/chat.svg)](https://gitter.im/datahubio/chat)

A line of code is worth a thousand words ...

```
const {open} = require('data.js')

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
- [Usage](#usage)
- [API](#api)
  - [open](#open)
  - [Files](#files)
    - [load](#load)
    - [Metadata](#metadata)
    - [stream](#stream)
    - [buffer](#buffer)
    - [rows](#rows)
  - [Datasets](#datasets)
    - [load](#load-1)
    - [addResource](#addresource)
  - [Utilities](#utilities)
    - [isDataset](#isdataset)
    - [parseDatasetIdentifier](#parsedatasetidentifier)
- [Developers](#developers)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Motivation

`data.js` is motivated by the following use cases:

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
* Minimal glue: Use on its own or as a building block for more complex data tooling (thanks to its common miminal metadata)

[fd]: https://frictionlessdata.io/
[dp]: https://frictionlessdata.io/data-packages/

## Installation

`npm install data.js`

## Usage

With a simple file:

```javascript
const data = require('data.js')

// path can be local or remote
const file = data.open(path)

// descriptor with metadata e.g. name, path, format, (guessed) mimetype etc
console.log(file.descriptor)

// returns promise with raw stream
const stream = await file.stream()

// let's get an object stream of the rows
// (assuming it is tabular i.e. csv, xls etc)
const rows = await resource.rows()

// entire file as a buffer (be careful with large files!)
const buffer = await resource.buffer()
```

With a Dataset:

```javascript
const { Dataset } = require('data.js')

const path = '/path/to/directory/' // must have datapackage.json in the directory atm

Dataset.load(path).then(dataset => {
  // get a data file in this dataset
  const file = dataset.resources[0]

  const data = file.stream()
})
```

---

## API

### open

Load a file from a path or descriptor.

`
load(pathOrDescriptor, {basePath, format}={})
`

There are 3 types of file source we support:

* Local path
* Remote url
* Inline data

```javascript
const data = require('data.js')

const file = data.open('/path/to/file.csv')

const file = data.open('https://example.com/data.xls')

// loading raw data
const file = data.open({
  name: 'mydata',
  data: { // can be any javascript - an object, an array or a string or ...
    a: 1,
    b: 2
  }
})

// Loading with a descriptor - this allows more fine-grained configuration
// The descriptor should follow the Frictionless Data Resource model
// http://specs.frictionlessdata.io/data-resource/
const file = data.open({
  // file or url path
  path: 'https://example.com/data.csv',
  // a Table Schema - https://specs.frictionlessdata.io/table-schema/
  schema: {
    fields: [
      ...
    ]
  }
  // CSV dialect - https://specs.frictionlessdata.io/csv-dialect/
  dialect: {
    // this is tab separated CSV/DSV
    delimiter: '\t'
  }
})
```

`basePath`: use in cases where you want to create a File with a path that is relative to a base directory / path e.g.

```
const file = data.open('data.csv', {basePath: '/my/base/path'})
```

Will open the file: `/my/base/path/data.csv`

This functionality is primarily useful when using Files as part of Datasets where it can be convenient for a  File to have a path relative to the directory of the Dataset. (See also Data Package and Data Resource in the Frictionless Data specs).


### Files

A single data file - local or remote.

#### load

*DEPRECATED*. Use simple `open`.

#### Metadata

Main metadata is available via the `descriptor`:

```
file.descriptor
```

This metadata is a combination of the metadata passed in at File creation (if you created the File with a descriptor object) and auto-inferred information from the File path. This is the info that is auto-inferred:

```
path: path this was instantiated with - may not be same as file.path (depending on basePath)
pathType: remote | local
name:   file name (without extension)
format: the extension
mediatype: mimetype based on file name and extension
```

In addition to this metadata there are certain properties which are computed on demand:

```javascript
// the full path to the file (using basepath)
const path = file.path

const size = file.size

// md5 hash of the file
const hash = file.hash

// file encoding
const encoding = file.encoding
```

**Note**: size, hash are not available for remote Files (those created from urls).


#### stream

`stream()`

Get readable stream

@returns Promise with readable stream object on resolve

#### buffer

`File.buffer()`

Get this file as a buffer (async)

@returns: promise which resolves to the buffer

#### rows

`rows({keyed}={})`

Get the rows for this file as a node object stream (assumes underlying data is tabular!)

@returns Promise with rows as parsed JS objects (depends on file format)

* `keyed`: if `false` (default) returns rows as arrays. If `true` returns rows as objects.

TODO: casting (does data get cast automatically for you or not ...)

**What formats are supported?**

The rows functionality is currently available for CSV and Excel files. The Tabular support incorporates supports for Table Schema and CSV Dialect e.g. you can do:

```javascript

// load a CSV with a non-standard dialect e.g. tab separated or semi-colon separated
const file = data.open({
  path: 'mydata.tsv'
  // Full support for http://specs.frictionlessdata.io/csv-dialect/
  dialect: {
    delimiter: '\t' // for tabs or ';' for semi-colons etc
  }
})

// open a CSV with a Table Schema
const file = data.open({
  path: 'mydata.csv'
  // Full support for Table Schema https://specs.frictionlessdata.io/table-schema/
  schema: {
    fields: [
      {
        name: 'Column 1',
        type: 'integer'
      },
      ...
    ]
  }
})
```


### Datasets

A collection of data files with optional metadata.

Under the hood it heavily uses Data Package formats and it natively supports Data Package formats including loading from `datapackage.json` files. However, it does not require knowledge or use of Data Packages.

A Dataset has four primary properties:

* `descriptor`: key metadata. The descriptor follows the Data Package spec
* `resources`: an array of the Files contained in this Dataset
* `identifier`: the identifier encapsulates the location (or origin) of this Dataset
* `readme`: the README for this Dataset (if it exists). The readme content is taken from the README.md file located in the Dataset root directory, or, if that does not exist from the `readme` property on the descriptor. If neither of those exist the readme will be undefined or null.

In addition we provide the convenience attributes:

* `path`: the path (remote or local) to this dataset
* `dataPackageJsonPath`: the path to the `datapackage.json` for this Dataset (if it exists)

#### load

To create a new Dataset object use `Dataset.load`. It takes descriptor Object or identifier string:

```
async Dataset.load(pathOrDescriptor, {owner = null} = {})
```

* `pathOrDescriptor` - can be one of:
  * local path to Dataset
  * remote url to Dataset
  * descriptor object
* @returns: a fully loaded Dataset (parsed and used `datapackage.json` and `README.md` -- if README exists)

For example:

```javascript
const data = require('data.js')

const pathOrDescriptor = 'https://raw.githubusercontent.com/datasets/co2-ppm/master/datapackage.json'
const dataset = await data.Dataset.load(pathOrDescriptor)
```

#### addResource

Add a resource to the Dataset:

```javascript
addResource(resource)
```

* `resource`: may be an already instantiated File object or it is a resource descriptor
* @returns: null


### Utilities

#### isDataset

```javascript
// seeks to guess whether a given path is the path to a Dataset or a File
// (i.e. a directory or datapackage.json)
data.isDataset(path)
```

#### parseDatasetIdentifier

```javascript
// parses dataset path and returns identifier dictionary
// handles local paths, remote URLs as well as DataHub and GitHub specific URLs
// (e.g., https://datahub.io/core/finance-vix or https://github.com/datasets/finance-vix
const identifier = data.parseDatasetIdentifier(path)

console.log(identifier)
```

and it prints out:

```
{
    name: <name>,
    owner: <owner>,
    path: <path>,
    type: <type>,
    original: <path>,
    version: <version>
}
```

## Developers

Requirements:

* NodeJS >= v8.10.0
* NPM >= v5.2.0

### Setup

1. Git clone the repo
2. Install dependencies: `yarn`
3. Run tests: `yarn test`
4. Do some dev work
  * While doing dev, you can run tests in a watch mode: `yarn test:watch`
5. Once done, make sure tests are passing
6. Compile ES2015+ syntax so that the code works in current browsers: `yarn compile`
7. Now proceed to "Deployment" stage

### Deployment

1. Update version number in `package.json`.
2. Git commit: `git commit -m "some message, eg, version"`.
3. Release: `git tag -a v0.12.0 -m "some message"`.
4. Push: `git push origin master --tags`
5. Publish to NPM: `npm publish`
