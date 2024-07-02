import { Component, AfterViewInit, TemplateRef, ViewChild } from '@angular/core';
import { Map, NavigationControl, AttributionControl, LngLatBounds, LngLat } from "maplibre-gl";
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Parser, Quad, Store } from 'n3';
import { CommonModule } from '@angular/common';
import { parse, GeoJSONGeometryOrNull, GeoJSONGeometry } from 'wellknown';
import { FormsModule } from '@angular/forms';
import { GraphExplorerComponent } from '../graph-explorer/graph-explorer.component';

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
    properties: { uri: string, label: string, edges?: any, [key: string]: any }
}

@Component({
  selector: 'app-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule, GraphExplorerComponent],
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

  public loadingQuads: boolean = false;

  tripleStore?: Store;

  public static GEO = "http://www.opengis.net/ont/geosparql#";

  public static GEO_FEATURE = ExplorerComponent.GEO + "Feature";

  public static GEO_WKT_LITERAL = ExplorerComponent.GEO + "wktLiteral";

  public sparqlUrl: string = "http://localhost:3030/ogc/sparql";
  
  public sparqlQuery?: string = `PREFIX lpgs: <https://dev-georegistry.geoprism.net/lpg/rdfs#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX lpgv: <https://dev-georegistry.geoprism.net/lpg/deliverable2024/0#>
PREFIX lpgvs: <https://dev-georegistry.geoprism.net/lpg/deliverable2024/0/rdfs#>

SELECT
?ft1 ?f1 ?wkt1 ?lbl1 # Geo-Object 1
?e1 ?ev1 # A ConnectedTo edge
?ft2 ?f2 ?wkt2 ?lbl2 # Geo-Object 2
FROM lpgv: 
WHERE {
  BIND(geo:Feature as ?ft1) .
  ?f1 geo:hasGeometry ?g1 .
  ?g1 geo:asWKT ?wkt1 .
  ?f1 rdfs:label ?lbl1 .
  ?f1 lpgvs:ConnectedTo ?f2 .

  BIND(lpgvs:ConnectedTo as ?e1) .
  BIND(?f2 as ?ev1) .

  BIND(geo:Feature as ?ft2) .
  ?f2 geo:hasGeometry ?g2 .
  ?g2 geo:asWKT ?wkt2 .
  ?f2 rdfs:label ?lbl2 .
} 
LIMIT 10`;

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
  
  constructor(private modalService: BsModalService) {
    // (mapboxgl as any).accessToken = "pk.eyJ1IjoianVzdGlubGV3aXMiLCJhIjoiY2l0YnlpdWRkMDlkNjJ5bzZuMTR3MHZ3YyJ9.Ad0fQd8onRSYR9QZP6VyUw";
  }
  
  ngAfterViewInit() {
      this.initializeMap();
      this.openModal(this.template);
  }
  
  openModal(viewUserTemplate: TemplateRef<any>) {
    this.modalRef = this.modalService.show(viewUserTemplate, {
        ignoreBackdropClick: true
      });
  }
  
  async loadSparql() {
    this.loadingQuads = true;

    let url = this.sparqlUrl + "?query=" + encodeURIComponent(this.sparqlQuery!);

    const respObj = await fetch(url);
    this.loadingQuads = false;

    if (!respObj.ok || respObj.status >= 400) {
        let text = await respObj.text();
        this.importError = text;
        return;
    }

    const rs: SPARQLResultSet = await respObj.json();

    this.processSPARQLResponse(rs)

    this.modalRef?.hide();
  }

  processSPARQLResponse(rs: SPARQLResultSet) : void {
    console.log(rs);
    let geoObjects: GeoObject[] = [];
    
    rs.results.bindings.forEach(r => {
        let geoObject: GeoObject | null = null;
        let readGeoObjectUri: boolean = false;
        let lastReadUri: string | null = null;
        rs.head.vars.forEach(v => {
            if (r[v].type === "uri" && r[v].value === ExplorerComponent.GEO_FEATURE) {
                geoObject = {
                    type: "Feature",
                    geometry: null,
                    properties: { uri: Math.random().toString(16).slice(2), edges: {} }
                } as unknown as GeoObject;
                geoObjects.push(geoObject);
                lastReadUri = null;
                readGeoObjectUri = false;
            } else {
                if (geoObject == null) {
                    throw new Error("Attempt to read property without associated geo feature. Does your query start with a geo:feature declaration?");
                } else if (r[v].type === "uri" && !readGeoObjectUri) {
                    geoObject.properties.uri = r[v].value;
                    readGeoObjectUri = true;
                } else if (r[v].type === "literal" && r[v].datatype === ExplorerComponent.GEO_WKT_LITERAL) {
                    geoObject.geometry = this.wktToGeometry(r[v].value);
                } else if (r[v].type === "literal") {
                    geoObject.properties.label = r[v].value;
                } else if (r[v].type === "uri" && readGeoObjectUri) {
                    if (lastReadUri == null) {
                        lastReadUri = r[v].value;
                    } else {
                        geoObject.properties.edges[lastReadUri] = r[v].value;
                        lastReadUri = null;
                    }
                }
            }
        });
    });

    geoObjects = geoObjects.filter(g1 => geoObjects.findIndex(g2 => g1 != g2 && g1.properties.uri === g2.properties.uri) == -1);

    geoObjects.forEach(go => {
        this.renderGeoObject(go);
    })

    this.zoomToGeoms(geoObjects);
    this.graphExplorer.renderGeoObjects(geoObjects);
  }

  wktToGeometry(wkt: string): GeoJSONGeometry
  {
    if (wkt.indexOf("<") != -1 && wkt.indexOf(">") != -1)
        wkt = wkt.substring(wkt.indexOf(">") + 1).trim();

    let geojson = parse(wkt);

    return geojson as GeoJSONGeometry;
  }

  renderGeoObject(geoObject: GeoObject) {
    this.map?.addSource(geoObject.properties.uri, {
        type: "geojson",
        data: geoObject
    });
    this.map?.addLayer({
        'id': geoObject.properties.uri,
        'type': 'fill',
        'source': geoObject.properties.uri,
        'paint': {
            'fill-color': '#088',
            'fill-opacity': 0.8
        }
    });
    // Label layer
    this.map?.addLayer({
        id: geoObject.properties.uri + "-LABEL",
        source: geoObject.properties.uri,
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

  zoomToGeoms(geoms: GeoObject[])
  {
    if (geoms.length == 0 || geoms[0].type == null) return;

    let geojson = geoms[0].geometry as any;

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
    } else if (geometryType === "MULTIPOLYGON" || geometryType === "POLYGON" || geometryType === "MIXED") {
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
      this.map?.addControl(new AttributionControl({ compact: true }), "bottom-right");
      this.map?.addControl(new NavigationControl({ visualizePitch: true }), "bottom-right");
  }
  
}
