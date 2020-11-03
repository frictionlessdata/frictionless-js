import { cloneDeep, isPlainObject, isString, isObject } from 'lodash'
import urljoin from 'url-join'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import { parseDatasetIdentifier, open } from './data'

/**
 * A collection of data files with optional metadata.
 * Under the hood it heavily uses Data Package formats and it natively supports
 * Data Package formats including loading from datapackage.json files.
 *
 * A Dataset has four primary properties:
 *   descriptor: key metadata. The descriptor follows the Data Package spec
 *   resources: an array of the Files contained in this Dataset
 *   identifier: the identifier encapsulates the location (or origin) of this Dataset
 *   readme: the README for this Dataset (if it exists).
 */
export class Dataset {
  // TODO: handle owner
  constructor(descriptor = {}, identifier = { path: null, owner: null }) {
    if (!isPlainObject(descriptor)) {
      throw new TypeError(`To create a new Dataset please use Dataset.load`)
    }

    this._descriptor = descriptor
    this._resources = []
    this._identifier = identifier
  }

  // eslint-disable-next-line no-unused-vars
  static async load(pathOrDescriptor, { owner = null } = {}) {
    if (!(isString(pathOrDescriptor) || isPlainObject(pathOrDescriptor))) {
      throw new TypeError(
        'Dataset needs to be created with descriptor Object or identifier string'
      )
    }

    let descriptor,
      identifier = null

    if (isPlainObject(pathOrDescriptor)) {
      descriptor = pathOrDescriptor
      identifier = {
        path: null,
        owner: owner,
      }
    } else {
      // pathOrDescriptor is a path
      descriptor = {}
      // TODO: owner if provided should override anything parsed from path
      identifier = await parseDatasetIdentifier(pathOrDescriptor)
    }

    const dataset = new Dataset(descriptor, identifier)
    await dataset._sync()
    return dataset
  }

  // Bootstrap ourselves with {this.path}/datapackage.json and readme if exists
  async _sync() {
    const readmePath = this._path('README.md')
    // eslint-disable-next-line default-case
    switch (this.identifier.type) {
      case 'local': {
        if (fs.existsSync(this.dataPackageJsonPath)) {
          this._descriptor = JSON.parse(
            fs.readFileSync(this.dataPackageJsonPath)
          )
          this._originalDescriptor = cloneDeep(this._descriptor)
        } else {
          throw new Error('No datapackage.json at destination.')
        }
        // Now get README from local disk if exists
        if (fs.existsSync(readmePath)) {
          this._descriptor.readme = fs.readFileSync(readmePath).toString()
        }
        break
      }
      case 'url':
      case 'github':
      case 'datahub': {
        let res = await fetch(this.dataPackageJsonPath)
        if (res.status >= 400) {
          throw new Error(
            `${res.status}: ${res.statusText}. Requested URL: ${res.url}`
          )
        }
        this._descriptor = await res.json()
        this._originalDescriptor = cloneDeep(this._descriptor)
        if (!this._descriptor.readme) {
          res = await fetch(readmePath)
          // May not exist and that is ok!
          if (res.status === 200) {
            this._descriptor.readme = await res.text()
          }
        }
        break
      }
    }

    // handle case where readme was already inlined in the descriptor as readme
    // attribute as e.g. on the datahub
    // Now load each resource ...
    this._resources = this.descriptor.resources.map((resource) => {
      return open(resource, { basePath: this.path })
    })
    // We need to update original descriptor with metadata about resources after guessing them
    this.descriptor.resources = this._resources.map((resource) => {
      return resource.descriptor
    })
  }

  get identifier() {
    return this._identifier
  }

  get descriptor() {
    return this._descriptor
  }

  get path() {
    return this.identifier.path
  }

  get dataPackageJsonPath() {
    return this._path('datapackage.json')
  }

  get readme() {
    return this._descriptor.readme
  }

  // Array of File objects
  get resources() {
    return this._resources
  }

  addResource(resource) {
    if (isPlainObject(resource)) {
      this.descriptor.resources.push(resource)
      this.resources.push(open(resource))
    } else if (isObject(resource)) {
      // It is already a resource object!
      this.descriptor.resources.push(resource.descriptor)
      this.resources.push(resource)
    } else {
      throw new TypeError(
        `addResource requires a resource descriptor or an instantiated resources but got: ${resource}`
      )
    }
  }

  // Path relative to this dataset
  _path(offset = null) {
    const path_ = this.path
      ? this.path.replace('datapackage.json', '')
      : this.path
    // TODO: ensure offset is relative (security etc)
    switch (this.identifier.type) {
      case 'local':
        return path.join(path_, offset)
      case 'url':
        return urljoin(path_, offset)
      case 'github':
        return urljoin(path_, offset)
      case 'datahub':
        return urljoin(path_, offset)
      case undefined:
        return offset
      default:
        throw new Error(`Unknown path type: ${this.identifier.type}`)
    }
  }
}
