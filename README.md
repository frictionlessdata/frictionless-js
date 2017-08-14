# Data.js
<p align="center">
  <a href="https://datahub.io/">
    <img alt="datahub" src="http://datahub.io/static/img/logo-cube.png" width="146">
  </a>
</p>

<p align="center">
  Library for working with Dataset and File objects.
</p>

[![Build Status](https://travis-ci.org/datahq/data.js.svg?branch=master)](https://travis-ci.org/datahq/data.js) [![Gitter](https://img.shields.io/gitter/room/frictionlessdata/chat.svg)](https://gitter.im/datahubio/chat) [![Dependency Status](https://david-dm.org/datahq/data.js/status.svg)](https://david-dm.org/datahq/data.js) [![devDependency Status](https://david-dm.org/datahq/data.js/dev-status.svg)](https://david-dm.org/datahq/data.js?type=dev)

## Usage

`npm install data.js`


### Dataset objects

To create a new Dataset object please use `Dataset.load` method. It takes descriptor Object or identifier string:

```javascript
const data = require('data.js')
const pathOrDescriptor = 'https://raw.githubusercontent.com/datasets/co2-ppm/master/datapackage.json'
const dataset = await data.Dataset.load(pathOrDescriptor)
```

* `pathOrDescriptor` - can be one of:
  * local path to Dataset
  * remote url to Dataset
  * descriptor object
