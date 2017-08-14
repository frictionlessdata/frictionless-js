## Data.js
<p align="center">
  <a href="https://datahub.io/">
    <img alt="datahub" src="http://datahub.io/static/img/logo-cube.png" width="146">
  </a>
</p>

<p align="center">
  Library for working with Dataset and File objects.
</p>

[![Build Status](https://travis-ci.org/datahq/data.js.svg?branch=master)](https://travis-ci.org/datahq/data.js) [![Gitter](https://img.shields.io/gitter/room/frictionlessdata/chat.svg)](https://gitter.im/datahubio/chat) [![Dependency Status](https://david-dm.org/datahq/data.js/status.svg)](https://david-dm.org/datahq/data.js) [![devDependency Status](https://david-dm.org/datahq/data.js/dev-status.svg)](https://david-dm.org/datahq/data.js?type=dev)

### Usage

`npm install data.js`


##### Dataset class

To create a new Dataset instance please use Dataset.load.
It takes descriptor Object or identifier string:

```javascript
load(pathOrDescriptor, {path = null, owner = null} = {})
```

Let's create a simple dataset:

```javascript
const data = require('data.js')
const path = 'co2-ppm'
const dataset = await data.Dataset.load(path)
```

##### File class 
