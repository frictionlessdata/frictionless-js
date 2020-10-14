"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Dataset = void 0;

var _lodash = require("lodash");

var _urlJoin = _interopRequireDefault(require("url-join"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _nodeFetch = _interopRequireDefault(require("node-fetch"));

var _data = require("./data");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Dataset {
  constructor(descriptor = {}, identifier = {
    path: null,
    owner: null
  }) {
    if (!(0, _lodash.isPlainObject)(descriptor)) {
      throw new TypeError(`To create a new Dataset please use Dataset.load`);
    }

    this._descriptor = descriptor;
    this._resources = [];
    this._identifier = identifier;
  }

  static async load(pathOrDescriptor, {
    owner = null
  } = {}) {
    if (!((0, _lodash.isString)(pathOrDescriptor) || (0, _lodash.isPlainObject)(pathOrDescriptor))) {
      throw new TypeError('Dataset needs to be created with descriptor Object or identifier string');
    }

    let descriptor,
        identifier = null;

    if ((0, _lodash.isPlainObject)(pathOrDescriptor)) {
      descriptor = pathOrDescriptor;
      identifier = {
        path: null,
        owner: owner
      };
    } else {
      descriptor = {};
      identifier = await (0, _data.parseDatasetIdentifier)(pathOrDescriptor);
    }

    const dataset = new Dataset(descriptor, identifier);
    await dataset._sync();
    return dataset;
  }

  async _sync() {
    const readmePath = this._path('README.md');

    switch (this.identifier.type) {
      case 'local':
        {
          if (_fs.default.existsSync(this.dataPackageJsonPath)) {
            this._descriptor = JSON.parse(_fs.default.readFileSync(this.dataPackageJsonPath));
            this._originalDescriptor = (0, _lodash.cloneDeep)(this._descriptor);
          } else {
            throw new Error('No datapackage.json at destination.');
          }

          if (_fs.default.existsSync(readmePath)) {
            this._descriptor.readme = _fs.default.readFileSync(readmePath).toString();
          }

          break;
        }

      case 'url':
      case 'github':
      case 'datahub':
        {
          let res = await (0, _nodeFetch.default)(this.dataPackageJsonPath);

          if (res.status >= 400) {
            throw new Error(`${res.status}: ${res.statusText}. Requested URL: ${res.url}`);
          }

          this._descriptor = await res.json();
          this._originalDescriptor = (0, _lodash.cloneDeep)(this._descriptor);

          if (!this._descriptor.readme) {
            res = await (0, _nodeFetch.default)(readmePath);

            if (res.status === 200) {
              this._descriptor.readme = await res.text();
            }
          }

          break;
        }
    }

    this._resources = this.descriptor.resources.map(resource => {
      return (0, _data.open)(resource, {
        basePath: this.path
      });
    });
    this.descriptor.resources = this._resources.map(resource => {
      return resource.descriptor;
    });
  }

  get identifier() {
    return this._identifier;
  }

  get descriptor() {
    return this._descriptor;
  }

  get path() {
    return this.identifier.path;
  }

  get dataPackageJsonPath() {
    return this._path('datapackage.json');
  }

  get readme() {
    return this._descriptor.readme;
  }

  get resources() {
    return this._resources;
  }

  addResource(resource) {
    if ((0, _lodash.isPlainObject)(resource)) {
      this.descriptor.resources.push(resource);
      this.resources.push((0, _data.open)(resource));
    } else if ((0, _lodash.isObject)(resource)) {
      this.descriptor.resources.push(resource.descriptor);
      this.resources.push(resource);
    } else {
      throw new TypeError(`addResource requires a resource descriptor or an instantiated resources but got: ${resource}`);
    }
  }

  _path(offset = null) {
    const path_ = this.path ? this.path.replace('datapackage.json', '') : this.path;

    switch (this.identifier.type) {
      case 'local':
        return _path.default.join(path_, offset);

      case 'url':
        return (0, _urlJoin.default)(path_, offset);

      case 'github':
        return (0, _urlJoin.default)(path_, offset);

      case 'datahub':
        return (0, _urlJoin.default)(path_, offset);

      case undefined:
        return offset;

      default:
        throw new Error(`Unknown path type: ${this.identifier.type}`);
    }
  }

}

exports.Dataset = Dataset;