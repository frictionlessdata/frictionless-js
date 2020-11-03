CO2 PPM - Trends in Atmospheric Carbon Dioxide. Data are sourced from the US Government's Earth System Research Laboratory, Global Monitoring Division. Two main series are provided: the Mauna Loa series (which has the longest continuous series since 1958) and a Global Average series (a global average over marine surface sites).

## Data

### Description

> Data are reported as a dry air mole fraction defined as the number of molecules of carbon dioxide divided by the number of all molecules in air, including CO2 itself, after water vapor has been removed. The mole fraction is expressed as parts per million (ppm). Example: 0.000400 is expressed as 400 ppm.[*][ccgg-trends]

### Citations

1. *Trends in Atmospheric Carbon Dioxide, Mauna Loa, Hawaii.* Dr. Pieter Tans, NOAA/ESRL (www.esrl.noaa.gov/gmd/ccgg/trends/) and Dr. Ralph Keeling, Scripps Institution of Oceanography (scrippsco2.ucsd.edu/).
1. *Trends in Atmospheric Carbon Dioxide, Global.* Ed Dlugokencky and Pieter Tans, NOAA/ESRL (www.esrl.noaa.gov/gmd/ccgg/trends/).

### Sources

1. 
  * Name: Trends in Atmospheric Carbon Dioxide, Mauna Loa, Hawaii
  * Web: http://www.esrl.noaa.gov/gmd/ccgg/trends/index.html
1. 
  * Name: Trends in Atmospheric Carbon Dioxide, Global
  * Web: http://www.esrl.noaa.gov/gmd/ccgg/trends/global.html

## Data Preparation

### Processing

Run the following script from this directory to download and process the data:

```bash
make data
```

### Resources

The raw data are output to `./tmp`. The processed data are output to `./data`.

## License

### ODC-PDDL-1.0

This Data Package is made available under the Public Domain Dedication and License v1.0 whose full text can be found at: http://www.opendatacommons.org/licenses/pddl/1.0/

### Notes

The [terms of use][gmd] of the source dataset list three specific restrictions on public use of these data:

> The information on government servers are in the public domain, unless specifically annotated otherwise, and may be used freely by the public so long as you do not 1) claim it is your own (e.g. by claiming copyright for NOAA information – see next paragraph), 2) use it in a manner that implies an endorsement or affiliation with NOAA, or 3) modify it in content and then present it as official government material.[*][gmd]

[ccgg-trends]: http://www.esrl.noaa.gov/gmd/ccgg/trends/index.html
[gmd]: http://www.esrl.noaa.gov/gmd/about/disclaimer.html
