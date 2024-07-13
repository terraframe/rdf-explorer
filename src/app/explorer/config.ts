
export interface StyleConfig { [key: string]: {color:string, order:number} }

export interface QueryConfig { title:string, sparql: string, styles: StyleConfig }

let prefixes:string = `PREFIX lpgs: <https://dev-georegistry.geoprism.net/lpg/rdfs#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX lpgv: <https://dev-georegistry.geoprism.net/lpg/deliverable2024/0#>
PREFIX lpgvs: <https://dev-georegistry.geoprism.net/lpg/deliverable2024/0/rdfs#>`

let defaultStyles = {
    'lpgvs:Hospital': {color:'#F2799D', order:0},
    'lpgvs:Dam':{color:'#D5F279', order:0},
    'lpgvs:Project':{color:'#C0F279', order:6},
    'lpgvs:Watershed':{color:'#79F2C9', order:4},
    'lpgvs:LeveeArea':{color:'#79C7F2', order:4}, 
    'lpgvs:RealProperty':{color:'#79F294', order:0},
    'lpgvs:Reservoir':{color:'#94F279', order:0},
    'lpgvs:ChannelArea':{color:'#F279B7',order:4},
    'lpgvs:ChannelReach':{color:'#79DAF2',order:4},
    'lpgvs:RecreationArea':{color:'#F2E779',order:3},
    'lpgvs:School':{color:'#F2A579',order:0},
    'lpgvs:ChannelLine':{color:'#79F2A0',order:1},
    'lpgvs:LeveedArea':{color:'#C379F2',order:4},
    'lpgvs:River':{color:'#7999F2',order:2},
    'lpgvs:SchoolZone':{color:'#BCF279',order:1},
    'lpgvs:Levee':{color:'#F279E0',order:0},
    'lpgvs:WaterLock':{color:'#79F2E2',order:0},
    'lpgvs:UsaceRecreationArea':{color:'#F2BE79',order:3}
};

export const defaultQueries: QueryConfig[] = [
    {
        title: "Projects FloodRisk Structures",
        sparql: prefixes + `

SELECT
?gf1 ?ft1 ?f1 ?wkt1 ?lbl1 # Project
?e1 ?ev1 # ConnectedTo
?gf2 ?ft2 ?f2 ?wkt2 ?lbl2 # LeveeArea
?e2 ?ev2 # HasFloodZone
?gf3 ?ft3 ?f3 ?wkt3 ?lbl3 # LeveedArea
?e3 ?ev3 # ConnectedTo
?gf4 ?ft4 ?f4 ?wkt4 ?lbl4 # Object of interest
FROM lpgv: 
WHERE {
  BIND(geo:Feature as ?gf1) .
  BIND(lpgvs:Project as ?ft1) .
  ?f1 a ?ft1 .
  ?f1 geo:hasGeometry ?g1 .
  ?g1 geo:asWKT ?wkt1 .
  ?f1 rdfs:label ?lbl1 .
  ?f1 lpgvs:ConnectedTo ?f2 .

  BIND(lpgvs:ConnectedTo as ?e1) .
  BIND(?f2 as ?ev1) .

  BIND(geo:Feature as ?gf2) .
  BIND(lpgvs:LeveeArea as ?ft2) .
  ?f2 a ?ft2 .
  ?f2 geo:hasGeometry ?g2 .
  ?g2 geo:asWKT ?wkt2 .
  ?f2 rdfs:label ?lbl2 .
  ?f2 lpgvs:HasFloodZone ?f3 .
  
  BIND(lpgvs:HasFloodZone as ?e2) .
  BIND(?f3 as ?ev2) .

  BIND(geo:Feature as ?gf3) .
  BIND(lpgvs:LeveedArea as ?ft3) .
  ?f3 a ?ft3 .
  ?f3 geo:hasGeometry ?g3 .
  ?g3 geo:asWKT ?wkt3 .
  ?f3 rdfs:label ?lbl3 .
  ?f3 lpgvs:HasFloodRisk ?f4 .
  
  BIND(lpgvs:HasFloodRisk as ?e3) .
  BIND(?f4 as ?ev3) .

  BIND(geo:Feature as ?gf4) .
  ?f4 a ?ft4 .
  ?f4 geo:hasGeometry ?g4 .
  ?g4 geo:asWKT ?wkt4 .
  ?f4 rdfs:label ?lbl4
} 
LIMIT 30`,
        styles: defaultStyles
    },
    {
        title: "Some query 123",
        sparql: prefixes + `

SELECT
?gf1 ?ft1 ?f1 ?wkt1 ?lbl1 # Project
?e1 ?ev1 # ConnectedTo
?gf2 ?ft2 ?f2 ?wkt2 ?lbl2 # LeveeArea
?e2 ?ev2 # HasFloodZone
?gf3 ?ft3 ?f3 ?wkt3 ?lbl3 # LeveedArea
?e3 ?ev3 # ConnectedTo
?gf4 ?ft4 ?f4 ?wkt4 ?lbl4 # Object of interest
FROM lpgv: 
WHERE {
  BIND(geo:Feature as ?gf1) .
  BIND(lpgvs:Project as ?ft1) .
  ?f1 a ?ft1 .
  ?f1 geo:hasGeometry ?g1 .
  ?g1 geo:asWKT ?wkt1 .
  ?f1 rdfs:label ?lbl1 .
  ?f1 lpgvs:ConnectedTo ?f2 .

  BIND(lpgvs:ConnectedTo as ?e1) .
  BIND(?f2 as ?ev1) .

  BIND(geo:Feature as ?gf2) .
  BIND(lpgvs:LeveeArea as ?ft2) .
  ?f2 a ?ft2 .
  ?f2 geo:hasGeometry ?g2 .
  ?g2 geo:asWKT ?wkt2 .
  ?f2 rdfs:label ?lbl2 .
  ?f2 lpgvs:HasFloodZone ?f3 .
  
  BIND(lpgvs:HasFloodZone as ?e2) .
  BIND(?f3 as ?ev2) .

  BIND(geo:Feature as ?gf3) .
  BIND(lpgvs:LeveedArea as ?ft3) .
  ?f3 a ?ft3 .
  ?f3 geo:hasGeometry ?g3 .
  ?g3 geo:asWKT ?wkt3 .
  ?f3 rdfs:label ?lbl3 .
  ?f3 lpgvs:HasFloodRisk ?f4 .
  
  BIND(lpgvs:HasFloodRisk as ?e3) .
  BIND(?f4 as ?ev3) .

  BIND(geo:Feature as ?gf4) .
  ?f4 a ?ft4 .
  ?f4 geo:hasGeometry ?g4 .
  ?g4 geo:asWKT ?wkt4 .
  ?f4 rdfs:label ?lbl4
} 
LIMIT 30`,
        styles: defaultStyles
    }
];
