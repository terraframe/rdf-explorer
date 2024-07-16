import { Component, AfterViewInit, TemplateRef, ViewChild } from '@angular/core';
import { Map, NavigationControl, AttributionControl, LngLatBounds, LngLat } from "maplibre-gl";
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Parser, Quad, Store } from 'n3';
import { CommonModule } from '@angular/common';
import { parse, GeoJSONGeometryOrNull, GeoJSONGeometry } from 'wellknown';
import { FormsModule } from '@angular/forms';
import { GraphExplorerComponent } from '../graph-explorer/graph-explorer.component';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { defaultQueries, StyleConfig, QueryConfig } from './defaultQueries';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import JSON5 from 'json5'

// @ts-ignore
import ColorGen from "color-generator";


export interface SPARQLResultSetBinding {
    type: string, value: string, datatype?: string
}

export interface SPARQLResultSet {
    head: { vars: [string] };
    results: {
        bindings: [ {
            [key: string] : SPARQLResultSetBinding
        } ]
    };
}

export interface GeoObject {
    type: string,
    geometry: GeoJSONGeometry,
    properties: { uri: string, type:string, label: string, edges: { [key: string]: [string] }, [key: string]: any }
}

@Component({
  selector: 'app-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule, GraphExplorerComponent, DragDropModule, BsDropdownModule],
  providers: [BsModalService],
  templateUrl: './explorer.component.html',
  styleUrl: './explorer.component.scss'
})
export class ExplorerComponent implements AfterViewInit {

  @ViewChild('template', { static: true }) template!: TemplateRef<any>;

  @ViewChild("graphExplorer") graphExplorer!: GraphExplorerComponent;

  map?: Map;
  
  modalRef?: BsModalRef;

  // file?: string;

  importError?: string;

  public defaultQueries = defaultQueries;

  public loadingQuads: boolean = false;

  tripleStore?: Store;

  private geoObjects: GeoObject[] = [];

  public typeLegend: { [key: string]: { label: string, color: string } } = {};

  public static GEO = "http://www.opengis.net/ont/geosparql#";

  public static GEO_FEATURE = ExplorerComponent.GEO + "Feature";

  public static GEO_WKT_LITERAL = ExplorerComponent.GEO + "wktLiteral";

  public sparqlUrl: string = "http://staging-georegistry.geoprism.net:3030/usace/sparql";
  
  public queryConfig: QueryConfig = defaultQueries[0];

  public stylesText: string = "";

  resolvedStyles!: StyleConfig;

  baseLayers: any[] = [
      {
          name: "Satellite",
          label: "Satellite",
          id: "satellite-v9",
          sprite: "mapbox://sprites/mapbox/satellite-v9",
          url: "mapbox://mapbox.satellite",
          selected: true
      }
  ];

  orderedTypes: string[] = [];
  
  constructor(private modalService: BsModalService) {
    // (mapboxgl as any).accessToken = "pk.eyJ1IjoianVzdGlubGV3aXMiLCJhIjoiY2l0YnlpdWRkMDlkNjJ5bzZuMTR3MHZ3YyJ9.Ad0fQd8onRSYR9QZP6VyUw";
  }
  
  ngAfterViewInit() {
      this.stylesText = JSON.stringify(this.queryConfig.styles, null, 2);

      this.parseStylesText();
      this.initializeMap();
      this.openModal(this.template);
      
    //   for (let i = 0; i < 20; ++i) {
    //     console.log(ColorGen().hexString());
    //   }
  }
  
  openModal(viewUserTemplate: TemplateRef<any>) {
    this.modalRef = this.modalService.show(viewUserTemplate, {
        ignoreBackdropClick: true
      });
  }
  
  async loadSparql() {
    this.loadingQuads = true;

    let url = this.sparqlUrl + "?query=" + encodeURIComponent(this.queryConfig.sparql!);

    try {
        const respObj = await fetch(url);

        if (!respObj.ok || respObj.status >= 400) {
            let text = await respObj.text();
            this.importError = text;
            return;
        }

        const rs: SPARQLResultSet = await respObj.json();

        this.processSPARQLResponse(rs)

        this.modalRef?.hide();
    } catch (e: any) {
        this.importError = e.message;
    } finally {
        this.loadingQuads = false;
    }
  }

  processSPARQLResponse(rs: SPARQLResultSet) : void {
    this.geoObjects = [];
    
    rs.results.bindings.forEach(r => {
        let geoObject: GeoObject | null | undefined = null;
        let readGeoObjectUri: boolean = false;
        let lastReadUri: string | null = null;
        // rs.head.vars.forEach(v => {
        for (let i: number = 0; i < rs.head.vars.length; ++i) {
            let v = rs.head.vars[i];

            if (r[v].type === "uri" && r[v].value === ExplorerComponent.GEO_FEATURE) {
                lastReadUri = null;
                readGeoObjectUri = false;
            } else {
                if (i > 0 && r[v].type === "uri" && r[rs.head.vars[i-1]].value === ExplorerComponent.GEO_FEATURE) {
                    let uri = r[rs.head.vars[i+1]].value;

                    geoObject = this.geoObjects.find(go => go.properties.uri === uri);
                    if (geoObject == null) {
                        geoObject = {
                            type: "Feature",
                            geometry: null,
                            properties: { uri: Math.random().toString(16).slice(2), edges: {} }
                        } as unknown as GeoObject;
                        this.geoObjects.push(geoObject);
                    }

                    geoObject.properties.type = r[v].value;
                    geoObject.properties.uri = uri;
                    readGeoObjectUri = true;
                    i++;
                } else if (geoObject == null) {
                    throw new Error("Attempt to read property without associated geo feature. Does your query start with a geo:feature declaration?");
                } else if (r[v].type === "literal" && r[v].datatype === ExplorerComponent.GEO_WKT_LITERAL) {
                    geoObject.geometry = this.wktToGeometry(r[v].value);
                } else if (r[v].type === "literal") {
                    geoObject.properties.label = r[v].value;
                } else if (r[v].type === "uri" && readGeoObjectUri) {
                    if (lastReadUri == null) {
                        lastReadUri = r[v].value;
                    } else {
                        if (geoObject.properties.edges[lastReadUri] == null) {
                            geoObject.properties.edges[lastReadUri] = [] as any;
                        }
                        if (geoObject.properties.edges[lastReadUri].indexOf(r[v].value) === -1) {
                            geoObject.properties.edges[lastReadUri].push(r[v].value);
                        }

                        lastReadUri = null;
                    }
                }
            }
        };
    });

    // console.log(this.geoObjects);

    this.orderedTypes = Object.keys(this.geoObjectsByType());
    this.orderedTypes = this.orderedTypes.sort((a,b) => {
        return (this.resolvedStyles[a]?.order ?? 999) - (this.resolvedStyles[b]?.order ?? 999);
    });

    this.calculateTypeLegend();

    this.mapGeoObjects();

    if (this.geoObjects.length > 0)
        this.zoomTo(this.geoObjects[0].properties.uri);

    this.graphExplorer.renderGeoObjects(this, this.geoObjects);
  }

  onSelectQuery() {
    this.stylesText = JSON.stringify(this.queryConfig.styles, null, 2);
  }

  calculateTypeLegend() {
    this.typeLegend = {};

    this.orderedTypes.forEach(type => this.typeLegend[type] = { label: ExplorerComponent.uriToLabel(type), color: (this.resolvedStyles[type] != null ? this.resolvedStyles[type].color : ColorGen().hexString()) });
  }

  public static uriToLabel(uri: string): string {
    let i = uri.lastIndexOf("#");
    if (i == -1) return uri;

    return uri.substring(i+1);
  }

  getTypeLegend() { return this.typeLegend; }

  wktToGeometry(wkt: string): GeoJSONGeometry
  {
    if (wkt.indexOf("<") != -1 && wkt.indexOf(">") != -1)
        wkt = wkt.substring(wkt.indexOf(">") + 1).trim();

    let geojson = parse(wkt);

    return geojson as GeoJSONGeometry;
  }

  mapGeoObjects() {
    // Find the index of the first symbol layer in the map style
    const layers = this.map?.getStyle().layers;
    let firstSymbolId;
    for (let i = 0; i < layers!.length; i++) {
        if (layers![i].type === 'symbol') {
            firstSymbolId = layers![i].id;
            break;
        }
    }

    // The layers are organized by the type, so we have to group geoObjects by type and create a layer for each type
    let gosByType = this.geoObjectsByType();

    for (let i = this.orderedTypes.length-1; i >= 0; --i) {
        let type = this.orderedTypes[i];
        let geoObjects = gosByType[type];

        if (geoObjects.length == 0) continue;
        if (geoObjects[0].geometry == null) continue; // TODO : Find this out at the type level...

        let geojson: any = {
            type: "FeatureCollection",
            features: []
        }

        for (let i = 0; i < this.geoObjects.length; ++i) {
            if (this.geoObjects[i].properties.type !== type) continue;

            let geoObject = this.geoObjects[i];
    
            geojson.features.push(geoObject);
        }

        this.map?.addSource(type, {
            type: "geojson",
            data: geojson
        });

        this.map?.addLayer(this.layerConfig(type, geoObjects[0].geometry.type.toUpperCase()),
            firstSymbolId);
        
        // Label layer
        this.map?.addLayer({
            id: type + "-LABEL",
            source: type,
            type: "symbol",
            paint: {
                "text-color": "black",
                "text-halo-color": "#fff",
                "text-halo-width": 2
            },
            layout: {
                "text-field": ["get", "label"],
                "text-font": ["NotoSansRegular"],
                "text-offset": [0, 0.6],
                "text-anchor": "top",
                "text-size": 12
            }
        });
    }
  }

  private layerConfig(type: string, geometryType: string): any {
    let layerConfig: any = {
        id: type,
        source: type
    };

    if (geometryType === "MULTIPOLYGON" || geometryType === "POLYGON") {
        layerConfig.paint = {
            'fill-color': this.typeLegend[type].color,
            'fill-opacity': 0.8
        };
        layerConfig.type = "fill";
    } else if (geometryType === "POINT" || geometryType === "MULTIPOINT") {
        layerConfig.paint = {
            "circle-radius": 10,
            "circle-color": this.typeLegend[type].color,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#FFFFFF"
        };
        layerConfig.type = "circle";
    } else if (geometryType === "LINE" || geometryType === "MULTILINE" || geometryType === "MULTILINESTRING") {
        layerConfig.layout = {
            "line-join": "round",
            "line-cap": "round"
        }
        layerConfig.paint = {
            "line-color": this.typeLegend[type].color,
            "line-width": 3
        }
        layerConfig.type = "line";
    } else {
        // eslint-disable-next-line no-console
        console.log("Unexpected geometry type [" + geometryType + "]");
    }

    return layerConfig;
}

  geoObjectsByType(): {[key: string]: GeoObject[]} {
    let gos: {[key: string]: GeoObject[]} = {};

    for (let i = 0; i < this.geoObjects.length; ++i) {
        let geoObject = this.geoObjects[i];

        if (gos[geoObject.properties.type] === undefined) {
            gos[geoObject.properties.type] = [];
        }

        gos[geoObject.properties.type].push(geoObject);
    }

    return gos;
  }

  parsePrefixesFromSparql(): {[key: string]: string} {
    let out: any = {};

    let matches = this.queryConfig.sparql?.matchAll(/PREFIX (.*:) <(.*)>/g);
    let result = matches!.next();
    while (!result.done) {
        out[result.value[1]] = result.value[2];
        result = matches!.next();
    }

    return out;
  }

  parseStylesText() {
    try {
        this.queryConfig.styles = JSON5.parse(this.stylesText);

        let prefixes = this.parsePrefixesFromSparql();

        let newStyles: any = {};
        for (const [key, value] of Object.entries(this.queryConfig.styles)) {
            for (const [prefix, uri] of Object.entries(prefixes)) {
                if (key.startsWith(prefix)) {
                    newStyles[key.replace(prefix, uri)] = value;
                    break;
                }
            }
        }
        this.resolvedStyles = newStyles;

        // let changed = false;

        // for (let i = 0; i < this.styles.length; ++i) {
        //     let style = this.styles[i];

        //     if (style.color == null || style.color == "") {
        //         style.color = ColorGen().hexString();
        //         changed = true;
        //     }
        // }

        // if (changed) {
        //     this.stylesText = JSON5.stringify(this.styles);
        // }
    } catch (ex: any) {
        this.importError = ex.message;
    }
  }

  zoomTo(uri: string)
  {
    let geoObject = this.geoObjects.find(go => go.properties.uri === uri);
    if (geoObject == null) return;

    let geojson = geoObject.geometry as any;

    const geometryType = geojson.type.toUpperCase();

    if (geometryType === "MULTIPOINT" || geometryType === "POINT") {
        let coords = geojson.coordinates;

        if (coords) {
            let bounds = new LngLatBounds();
            coords.forEach((coord: any) => {
                bounds.extend(coord);
            });

            let center = bounds.getCenter();
            let pt = new LngLat(center.lng, center.lat);

            this.map?.flyTo({
                center: pt,
                zoom: 9,
                essential: true
            });
        }
    } else if (geometryType === "MULTIPOLYGON" || geometryType === "MIXED") {
        let coords = geojson.coordinates;

        if (coords) {
            let bounds = new LngLatBounds();
            coords.forEach((polys: any) => {
                polys.forEach((subpoly: any) => {
                    subpoly.forEach((coord: any) => {
                        bounds.extend(coord);
                    });
                });
            });

            this.map?.fitBounds(bounds, {
                padding: 20
            });
        }
    } else if (geometryType === "POLYGON") {
        let coords = geojson.coordinates;

        if (coords) {
            let bounds = new LngLatBounds();
            coords.forEach((polys: any) => {
                polys.forEach((coord: any) => {
                    bounds.extend(coord);
                });
            });

            this.map?.fitBounds(bounds, {
                padding: 20
            });
        }
    } else if (geometryType === "LINE" || geometryType === "MULTILINE") {
        let coords = geojson.coordinates;

        if (coords) {
            let bounds = new LngLatBounds();
            coords.forEach((lines: any) => {
                lines.forEach((subline: any) => {
                    subline.forEach((coord: any) => {
                        bounds.extend(coord);
                    });
                });
            });

            this.map?.fitBounds(bounds, {
                padding: 20
            });
        }
    } else if (geometryType === "MULTILINESTRING") {
        let coords = geojson.coordinates;

        if (coords) {
            let bounds = new LngLatBounds();
            coords.forEach((lines: any) => {
                lines.forEach((lngLat: any) => {
                    bounds.extend(lngLat);
                });
            });

            this.map?.fitBounds(bounds, {
                padding: 20
            });
        }
    }
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.orderedTypes, event.previousIndex, event.currentIndex);

    for (let i = 0; i < this.orderedTypes.length; ++i) {
        this.map?.moveLayer(this.orderedTypes[i], i > 0 ? this.orderedTypes[i-1] : undefined);
        this.map?.moveLayer(this.orderedTypes[i] + "-LABEL", i > 0 ? this.orderedTypes[i-1] + "-LABEL" : undefined);
    }
  }

/*
  async onFileChange(e: any) {
    const file:File = e.target.files[0];

    if (file != null)
    {
        this.loadRdf(file);
    }
  }

  async loadRdf(file: File) {
    this.loadingQuads = true;

    let text = await file.text();
    this.tripleStore = new Store();

    const parser = new Parser();
    parser.parse(text, (error, quad, prefixes) => {
        if (error)
        {
            console.log(error);
            this.importError = error.message;
            this.loadingQuads = false;
        }
        else if (quad) {
            this.tripleStore?.add(quad);
        }
        else {
            console.log("Successfully loaded " + this.tripleStore?.size + " quads into memory.");
            this.loadingQuads = false;
            this.modalRef?.hide();
        }
    });
  }
  */
  
  initializeMap() {
      const layer = this.baseLayers[0];

      const mapConfig: any = {
          container: "map",
          style: {
              version: 8,
              name: layer.name,
              metadata: {
                  "mapbox:autocomposite": true
              },
              sources: {
                  mapbox: {
                      'type': 'raster',
                      'tiles': [
                          'https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=' + "pk.eyJ1IjoianVzdGlubGV3aXMiLCJhIjoiY2l0YnlpdWRkMDlkNjJ5bzZuMTR3MHZ3YyJ9.Ad0fQd8onRSYR9QZP6VyUw"
                      ],
                      'tileSize': 512,
                  }
              },
              glyphs: "http://rdf-explorer.s3-website-us-west-2.amazonaws.com/glyphs/{fontstack}/{range}.pbf",
              layers: [
                  {
                      id: layer.id,
                      type: "raster",
                      source: "mapbox",
                      'minzoom': 0,
                      'maxzoom': 22
                      // "source-layer": "mapbox_satellite_full"
                  }
              ]
          },
          attributionControl: false
      };

      mapConfig.logoPosition = "bottom-right";

      this.map = new Map(mapConfig);

      this.map.on("load", () => {
          this.initMap();
      });
  }
  
  initMap(): void {
      // Add zoom and rotation controls to the map.
      this.map!.addControl(new AttributionControl({ compact: true }), "bottom-right");
      this.map!.addControl(new NavigationControl({ visualizePitch: true }), "bottom-right");

      this.map!.on('click', (e) => {
        this.handleMapClickEvent(e);
    });
  }

    handleMapClickEvent(e: any): void {
        const features = this.map!.queryRenderedFeatures(e.point);

        if (features != null && features.length > 0) {
            const feature = features[0];

            if (feature.properties['uri'] != null) {
                this.graphExplorer.zoomToUri(feature.properties['uri']);
            }
        }
    }
  
}
