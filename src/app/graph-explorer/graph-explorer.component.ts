import { Component } from '@angular/core';
import { ExplorerComponent, GeoObject } from '../explorer/explorer.component';
import { CommonModule } from '@angular/common';
import { Edge, Node, NgxGraphModule } from '@swimlane/ngx-graph';

// export interface Relationship {
//   oid: string,
//   label: string,
//   layout: "VERTICAL" | "HORIZONTAL",
//   code: string,
//   type?: string
// }

// export interface Vertex {
//   label: string;
//   uri: string;
//   typeUri: string;
// }

// export interface Edge {
//   typeUri: string,
//   sourceUri: string,
//   targetUri: string
// }

// export interface RelatedType {
//   code: string,
//   label: string,
//   objectType: "BUSINESS" | "GEOOBJECT"
// }

export interface TreeData {
  edges: Edge[],
  nodes: Node[],
  // relatedTypes: RelatedType[]
}

export const DRAW_SCALE_MULTIPLIER: number = 1.0;

export const SELECTED_NODE_COLOR: string = "#4287f5";

export const GRAPH_GO_LABEL_COLOR: string = "black";
export const GRAPH_CIRCLE_FILL: string = "#999";
export const GRAPH_LINE_COLOR: string = "#999";

export const COLLAPSE_ANIMATION_TIME: number = 500; // in ms

export const DIMENSIONS = {
    NODE: { WIDTH: 30, HEIGHT: 30 },
    LABEL: { WIDTH: 100, HEIGHT: 60, FONTSIZE: 14 },
    PADDING: {
        BETWEEN_NODES: 0,
        NODE_LABEL: 5,
        NODE_EDGE: 5
    }
};

@Component({
  selector: 'graph-explorer',
  standalone: true,
  imports: [CommonModule, NgxGraphModule],
  providers: [],
  templateUrl: './graph-explorer.component.html',
  styleUrl: './graph-explorer.component.scss'
})
export class GraphExplorerComponent {

  private HASH_TAG_REPLACEMENT = "-!`~`!-";

  public DIMENSIONS = DIMENSIONS;

  public SELECTED_NODE_COLOR = SELECTED_NODE_COLOR;

  public svgHeight: number | null = null;
  public svgWidth: number | null = null;

  public geoObjects?: GeoObject[];
  public data?: TreeData;

  public relationship: any = { layout: "HORIZONTAL" }

  public typeLegend: { [key: string]: { label: string, color: string } } = {};

  public explorer?: ExplorerComponent;

  public renderGeoObjects(explorer: ExplorerComponent, geoObjects: GeoObject[]) {
    console.log(geoObjects);
    this.explorer = explorer;

    this.geoObjects = geoObjects;
    let data: any = {
      edges: [],
      nodes: []
    }

    geoObjects.forEach(go => {

      data.nodes.push({
        label: (go.properties.label != null && go.properties.label != "") ? go.properties.label : go.properties.uri.substring(go.properties.uri.lastIndexOf("#")+1),
        id: this.uriToId(go.properties.uri),
        relation: Object.entries(go.properties.edges).length == 0 ? "CHILD" : "PARENT"
      });

      for (const [key, value] of Object.entries(go.properties.edges)) {
        // if (value === go.properties.uri) { continue; }

        value.forEach(v => {
          data.edges.push({
            id: this.uriToId(Math.random().toString(16).slice(2)),
            source: this.uriToId(go.properties.uri),
            target: this.uriToId(v),
            label: this.uriToLabel(key)
          });
        });
      }
    });

    window.setTimeout(() => {
        this.data = data;
        this.resizeDimensions();
        // this.calculateTypeLegend(this.data.relatedTypes);
        // this.addLayers(this.data.relatedTypes);
    }, 0);

    this.resizeDimensions();
  }

  uriToLabel(uri: string): string {
    let i = uri.lastIndexOf("#");
    if (i == -1) return uri;

    return uri.substring(i+1);
  }

  uriToId(uri: string): string {
    return "a" + uri;
  }

  idToUri(id: string): string {
    return id.substring(1);
  }

  resizeDimensions(): void {
    let graphContainer = document.getElementById("graph-container");

    if (graphContainer) {
        this.svgHeight = graphContainer.clientHeight - 50;
        this.svgWidth = graphContainer.clientWidth;
    }
  }

  // Thanks to https://stackoverflow.com/questions/52172067/create-svg-hexagon-points-with-only-only-a-length
  public getHexagonPoints(node: { dimension: { width: number, height: number }, relation: string }): string {
      let y = (this.DIMENSIONS.LABEL.HEIGHT / 2) - this.DIMENSIONS.NODE.HEIGHT / 2;
      let x = (this.relationship.layout === "VERTICAL")
          ? (node.relation === "CHILD" ? (this.DIMENSIONS.LABEL.WIDTH / 2) - this.DIMENSIONS.NODE.WIDTH / 2 : (this.DIMENSIONS.LABEL.WIDTH + DIMENSIONS.PADDING.NODE_LABEL + this.DIMENSIONS.NODE.WIDTH) / 2 - this.DIMENSIONS.NODE.WIDTH / 2)
          : node.relation === "PARENT" ? (this.DIMENSIONS.LABEL.WIDTH + this.DIMENSIONS.PADDING.NODE_LABEL + this.DIMENSIONS.PADDING.NODE_EDGE) : 0;

      let radius = this.DIMENSIONS.NODE.WIDTH / 2;
      let height = this.DIMENSIONS.NODE.HEIGHT;
      let width = this.DIMENSIONS.NODE.WIDTH;

      let points = [0, 1, 2, 3, 4, 5, 6].map((n, i) => {
          let angleDeg = 60 * i - 30;
          let angleRad = Math.PI / 180 * angleDeg;
          return [(width / 2 + radius * Math.cos(angleRad)) + x, (height / 2 + radius * Math.sin(angleRad)) + y];
      }).map((p) => p.join(","))
          .join(" ");

      return points;
  }

  public onClickNode(node: any) {
    this.explorer?.zoomTo(this.idToUri(node.id));
  }

}
