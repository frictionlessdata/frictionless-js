## Classes

<dl>
<dt><a href="#Dataset">Dataset</a></dt>
<dd><p>A collection of data files with optional metadata.
Under the hood it heavily uses Data Package formats and it natively supports
Data Package formats including loading from datapackage.json files.</p>
<p>A Dataset has four primary properties:
  descriptor: key metadata. The descriptor follows the Data Package spec
  resources: an array of the Files contained in this Dataset
  identifier: the identifier encapsulates the location (or origin) of this Dataset
  readme: the README for this Dataset (if it exists).</p>
</dd>
<dt><a href="#File">File</a></dt>
<dd><p>Abstract Base instance of File</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#parsePath">parsePath</a></dt>
<dd><p>Parse a data source path into a descriptor object. The descriptor should follow the Frictionless Data Resource model
<a href="http://specs.frictionlessdata.io/data-resource/">http://specs.frictionlessdata.io/data-resource/</a></p>
</dd>
<dt><a href="#parseDatasetIdentifier">parseDatasetIdentifier</a></dt>
<dd></dd>
<dt><a href="#isUrl">isUrl</a></dt>
<dd><p>Checks if path os a URL</p>
</dd>
<dt><a href="#isDataset">isDataset</a></dt>
<dd><p>Checks if path is a Dataset package. Dateset follows the Frictionless Data Resource model</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#open">open(pathOrDescriptor, options)</a></dt>
<dd><p>Load a file from a path or descriptor. Files source supported are
local, remote or inline data.</p>
</dd>
<dt><a href="#computeHash">computeHash(fileStream, fileSize, algorithm, progress)</a></dt>
<dd><p>Computes the streaming hash of a file</p>
</dd>
</dl>

<a name="parsePath"></a>

## parsePath
Parse a data source path into a descriptor object. The descriptor should follow the Frictionless Data Resource model
http://specs.frictionlessdata.io/data-resource/

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| path_ | <code>string</code> | Data source. Can be a url or local file path |
| basePath | <code>string</code> | Base path to data source |
| format | <code>string</code> | format of the data. |

<a name="parseDatasetIdentifier"></a>

## parseDatasetIdentifier
**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| path_ | <code>string</code> | Data source. Can be a url or local file path |

<a name="isUrl"></a>

## isUrl
Checks if path os a URL

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| path_ | <code>string</code> | Data source. Can be a url or local file path |

<a name="isDataset"></a>

## isDataset
Checks if path is a Dataset package. Dateset follows the Frictionless Data Resource model

**Kind**: global constant  

| Param | Type | Description |
| --- | --- | --- |
| path_ | <code>string</code> | Data source. Can be a url or local file path |

<a name="open"></a>

## open(pathOrDescriptor, options)
Load a file from a path or descriptor. Files source supported are
local, remote or inline data.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| pathOrDescriptor | <code>array</code> | A source to load data from. Can be a local or remote file path, can be a raw data object with the format: {  name: 'mydata',  data: { // can be any javascript object, array or string          a: 1,          b: 2      } } Files can also be loaded with a descriptor object. This allows more fine-grained configuration. The descriptor should follow the Frictionless Data Resource model http://specs.frictionlessdata.io/data-resource/ {   file or url path     path: 'https://example.com/data.csv',     // a Table Schema - https://specs.frictionlessdata.io/table-schema/     schema: {      fields: [            ...           ]      }     // CSV dialect - https://specs.frictionlessdata.io/csv-dialect/     dialect: {     // this is tab separated CSV/DSV     delimiter: '\t'    } } |
| options | <code>object</code> | { basePath, format } Use basepath in cases where you want to create  a File with a path that is relative to a base directory / path e.g:  const file = data.open('data.csv', {basePath: '/my/base/path'}) |

<a name="computeHash"></a>

## computeHash(fileStream, fileSize, algorithm, progress)
Computes the streaming hash of a file

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| fileStream | <code>object</code> | A node like stream |
| fileSize | <code>number</code> | Total size of the file |
| algorithm | <code>string</code> | sha256/md5 hashing algorithm to use |
| progress | <code>func</code> | Callback function with progress |

