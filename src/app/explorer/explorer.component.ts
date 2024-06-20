import { Component, AfterViewInit, TemplateRef, ViewChild } from '@angular/core';
import { Map, NavigationControl, AttributionControl } from "maplibre-gl";
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Parser, Quad, Store } from 'n3';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-explorer',
  standalone: true,
  imports: [CommonModule],
  providers: [BsModalService],
  templateUrl: './explorer.component.html',
  styleUrl: './explorer.component.scss'
})
export class ExplorerComponent implements AfterViewInit {

  @ViewChild('template', { static: true }) template!: TemplateRef<any>;

  map?: Map;
  
  modalRef?: BsModalRef;

  file?: string;

  importError?: string;

  public loadingQuads: boolean = false;

  tripleStore?: Store;
  
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
              glyphs: window.location.protocol + "//" + window.location.host + "/glyphs/{fontstack}/{range}.pbf",
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
