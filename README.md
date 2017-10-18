# data.js

data.js is a lightweight library providing a standardized interface for accessing data files and datasets.

[![Build Status](https://travis-ci.org/datahq/data.js.svg?branch=master)](https://travis-ci.org/datahq/data.js) [![Gitter](https://img.shields.io/gitter/room/frictionlessdata/chat.svg)](https://gitter.im/datahubio/chat)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
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

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Features

* Easy: a single common API for local, online and inline data
* Micro: The whole project is ~400 lines of code
* Simple: Oriented for single purpose
* Explicit: No hidden behaviours, no extra magic
* Frictionlesss: uses and supports (but does not require) Frictionless Data Package specs so you can leverage Frictionless tooling
* Minimal glue: Use on its own or as a building block for more complex data tooling (thanks to its common miminal metadata)

## Installation

`npm install data.js`

## Usage

With a simple file:

```javascript
const data = require('data.js')

// path can be local or remote
const file = data.File.load(path)

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

```
const data = require('data.js')

const path = '/path/to/directory/' // must have datapackage.json in the directory atm

const dataset = Dataset.load(path)

// get a data file in this dataset
const file = dataset.resources[0]

const data = file.stream()
```

---

## API

### Files

A single data file - local or remote.

#### load

`File.load(pathOrDescriptor, {basePath}={})`

To instantiate a data file you use the static `load` method. We use this rather than a constructor as it allows us to dispatch to the appropriate subinstance based on `pathOrDescriptor`. There are 3 types of file source we support:

* Local path
* Remote url
* Inline data

```javascript
const data = require('data.js')

const file = data.File.load('/path/to/file.csv')

const file = data.File.load('https://example.com/data.xls')

// loading raw data
const file = data.File.load({
  name: 'mydata',
  data: { // can be any javascript - an object, an array or a string or ...
    a: 1,
    b: 2
  }
})

// Loading with a descriptor - this allows more fine-grained configuration
// The descriptor should follow the Frictionless Data Resource model
// http://specs.frictionlessdata.io/data-resource/
const file = data.File.load({
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
const file = data.File.load('data.csv', {basePath: '/my/base/path'})
```

Will open the file: `/my/base/path/data.csv`

This functionality is primarily useful when using Files as part of Datasets where it can be convenient for a  File to have a path relative to the directory of the Dataset. (See also Data Package and Data Resource in the Frictionless Data specs).

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
const file = data.File.load({
  path: 'mydata.tsv'
  // Full support for http://specs.frictionlessdata.io/csv-dialect/
  dialect: {
    delimiter: '\t' // for tabs or ';' for semi-colons etc
  }
})

// open a CSV with a Table Schema
const file = data.File.load({
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
