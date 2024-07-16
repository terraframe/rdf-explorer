
export interface StyleConfig { [key: string]: {color:string, order:number} }

export interface QueryConfig { title:string, sparql: string, styles: StyleConfig, focus?: string }

let prefixes:string = `PREFIX lpgs: <https://dev-georegistry.geoprism.net/lpg/rdfs#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX lpgv: <https://dev-georegistry.geoprism.net/lpg/deliverable2024/0#>
PREFIX lpgvs: <https://dev-georegistry.geoprism.net/lpg/deliverable2024/0/rdfs#>
`

let defaultStyles = {
    'lpgvs:Hospital': {color:'#F2799D', order:0},
    'lpgvs:Dam':{color:'#D5F279', order:0},
    'lpgvs:Project':{color:'#C0F279', order:6},
    'lpgvs:Watershed':{color:'#79F2C9', order:4},
    'lpgvs:LeveeArea':{color:'#ffff99', order:4}, 
    'lpgvs:RealProperty':{color:'#79F294', order:0},
    'lpgvs:Reservoir':{color:'#94F279', order:5},
    'lpgvs:ChannelArea':{color:'#F279B7',order:4},
    'lpgvs:ChannelReach':{color:'#79DAF2',order:4},
    'lpgvs:RecreationArea':{color:'#F2E779',order:3},
    'lpgvs:School':{color:'#F2A579',order:0},
    'lpgvs:ChannelLine':{color:'#79F2A0',order:1},
    'lpgvs:LeveedArea':{color:'#C379F2',order:4},
    'lpgvs:River':{color:'#7999F2',order:2},
    'lpgvs:SchoolZone':{color:'#BCF279',order:6},
    'lpgvs:Levee':{color:'#F279E0',order:0},
    'lpgvs:WaterLock':{color:'#79F2E2',order:0},
    'lpgvs:UsaceRecreationArea':{color:'#F2BE79',order:3},
    'http://dime.usace.mil/ontologies/cwbi-concept#Program':{color:'#FF5733',order:0}
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
        styles: defaultStyles,
        focus: "https://dev-georegistry.geoprism.net/lpg/deliverable2024/0#Project-PROJ819"
    },
    {
        title: "ChannelReach ConnectedTo ProjectArea PartOf Program",
        sparql: prefixes + `PREFIX lds: <http://dime.usace.mil/data/dataset#TERRAFRAME_CHANNEL_TO_PROJECT>
PREFIX ldsremis: <http://dime.usace.mil/data/dataset#REMIS_PROJECTS>

SELECT
?gf1 ?ft1 ?f1 ?wkt1 ?lbl1 # ChannelReach
?e1 ?ev1 # ConnectedTo
?gf2 ?ft2 ?f2 ?wkt2 ?lbl2 # Project (GPR)
?e2 ?ev2 # IsPartOf (ImageMatters)
?gf3 ?ft3 ?f3 ?lbl3 # Program
FROM lpgv:
FROM lds:
FROM ldsremis:
WHERE {
  BIND(geo:Feature as ?gf1) .
  BIND(lpgvs:ChannelReach as ?ft1) .
  ?f1 a ?ft1 .
  ?f1 geo:hasGeometry ?g1 .
  ?g1 geo:asWKT ?wkt1 .
  ?f1 rdfs:label ?lbl1 .
  ?f1 lpgvs:ConnectedTo ?f2 .

  BIND(lpgvs:ConnectedTo as ?e1) .
  BIND(?f2 as ?ev1) .

  BIND(geo:Feature as ?gf2) .
  BIND(lpgvs:Project as ?ft2) .
  ?f2 a ?ft2 .
  ?f2 geo:hasGeometry ?g2 .
  ?g2 geo:asWKT ?wkt2 .
  ?f2 rdfs:label ?lbl2 .
  ?f2 lpgs:GeoObject-code ?f2code .

  ?imp <http://www.w3.org/2004/02/skos/core#altLabel> ?f2code .
  ?imp <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://dime.usace.mil/ontologies/cwbi-concept#Remis_Project> .
  ?imp <http://dime.usace.mil/ontologies/cwbi-concept#Program> ?f3 .
  
  BIND(<http://dime.usace.mil/ontologies/cwbi-concept#Program> as ?e2) .
  BIND(?f3 as ?ev2) .

  BIND(geo:Feature as ?gf3) .
  ?f3 a <http://dime.usace.mil/ontologies/cwbi-concept#Program> .
  BIND(<http://dime.usace.mil/ontologies/cwbi-concept#Program> as ?ft3) .
  ?f3 <http://www.w3.org/2004/02/skos/core#altLabel> ?lbl3
} 
LIMIT 100`,
        styles: defaultStyles,
        focus: "https://dev-georegistry.geoprism.net/lpg/deliverable2024/0#ChannelReach-CESWL_AR_06_TER_5",
        // focus: "https://dev-georegistry.geoprism.net/lpg/deliverable2024/0#ChannelReach-CENWO_MO_10_OML_5"
    },

    /* This hydrology query is incredibly difficult to expand past this pooint because:
     * 1. Our dataset has no dams
     * 2. The LeveeAreas returned from this dataset don't have any FloodZones (otherwise we could join this query with query 1)
     */
    {
      title: "Hydrology",
      sparql: prefixes + `
SELECT
?gf1 ?ft1 ?f1 ?wkt1 ?lbl1 # ChannelReach
?e1 ?ev1 # FlowsThrough
?e3 ?ev3 # ChannelHasLevee
?gf2 ?ft2 ?f2 ?wkt2 ?lbl2 # Reservoir
?gf3 ?ft3 ?f3 ?wkt3 ?lbl3 # River
?e2 ?ev2 # River FlowsInto Reservoir
?gf4 ?ft4 ?f4 ?wkt4 ?lbl4 # LeveeArea
FROM lpgv: 
WHERE {
  BIND(geo:Feature as ?gf1) .
  BIND(lpgvs:ChannelReach as ?ft1) .
  ?f1 a ?ft1 .
  ?f1 geo:hasGeometry ?g1 .
  ?g1 geo:asWKT ?wkt1 .
  ?f1 rdfs:label ?lbl1 .
  ?f1 lpgvs:FlowsThrough ?f2 .
  ?f1 lpgvs:ChannelHasLevee ?f4 .

  BIND(lpgvs:FlowsThrough as ?e1) .
  BIND(?f2 as ?ev1) .

  BIND(geo:Feature as ?gf2) .
  BIND(lpgvs:Reservoir as ?ft2) .
  ?f2 a ?ft2 .
  ?f2 geo:hasGeometry ?g2 .
  ?g2 geo:asWKT ?wkt2 .
  ?f2 rdfs:label ?lbl2 .
  ?f3 lpgvs:FlowsInto ?f2 .

  BIND(lpgvs:FlowsInto as ?e2) .
  BIND(?f2 as ?ev2) .

  BIND(geo:Feature as ?gf3) .
  BIND(lpgvs:River as ?ft3) .
  ?f3 a ?ft3 .
  ?f3 geo:hasGeometry ?g3 .
  ?g3 geo:asWKT ?wkt3 .
  ?f3 rdfs:label ?lbl3
  
  BIND(lpgvs:ChannelHasLevee as ?e3) .
  BIND(?f4 as ?ev3) .

  BIND(geo:Feature as ?gf4) .
  BIND(lpgvs:LeveeArea as ?ft4) .
  ?f4 a ?ft4 .
  ?f4 geo:hasGeometry ?g4 .
  ?g4 geo:asWKT ?wkt4 .
  ?f4 rdfs:label ?lbl4
} 
LIMIT 100
`,
      styles: defaultStyles
    },
    {
      title: "Flood risk structures and school zone shelters",
      sparql: prefixes + `
SELECT
?gf2 ?ft2 ?f2 ?wkt2 ?lbl2 # LeveedArea1
?e5 ?ev5 # ConnectedTo
?gf3 ?ft3 ?f3 ?wkt3 ?lbl3 # LeveedArea2
?e3 ?ev3 # ConnectedTo
?gf6 ?ft6 ?f6 ?wkt6 ?lbl6 # Hospital
?gf4 ?ft4 ?f4 ?wkt4 ?lbl4 # School
?e4 ?ev4 # ConnectedTo
?gf5 ?ft5 ?f5 ?wkt5 ?lbl5 # SchoolZone
FROM lpgv: 
WHERE {
  BIND(geo:Feature as ?gf2) .
  BIND(lpgvs:LeveedArea as ?ft2) .
  ?f2 a ?ft2 .
  ?f2 geo:hasGeometry ?g2 .
  ?g2 geo:asWKT ?wkt2 .
  ?f2 rdfs:label ?lbl2 .
  ?f2 lpgvs:HasFloodRisk ?f6 .
  
  BIND(geo:Feature as ?gf3) .
  BIND(lpgvs:LeveedArea as ?ft3) .
  ?f3 a ?ft3 .
  ?f3 geo:hasGeometry ?g3 .
  ?g3 geo:asWKT ?wkt3 .
  ?f3 rdfs:label ?lbl3 .
  ?f3 lpgvs:HasFloodRisk ?f4 .
  
  BIND(lpgvs:HasFloodRisk as ?e3) .
  BIND(?f4 as ?ev3) .
  BIND(lpgvs:HasFloodRisk as ?e5) .
  BIND(?f6 as ?ev5) .

  BIND(geo:Feature as ?gf6) .
  BIND(lpgvs:Hospital as ?ft6) .
  ?f6 a ?ft6 .
  ?f6 geo:hasGeometry ?g6 .
  ?g6 geo:asWKT ?wkt6 .
  ?f6 rdfs:label ?lbl6 .
  
  BIND(geo:Feature as ?gf4) .
  BIND(lpgvs:School as ?ft4) .
  ?f4 a ?ft4 .
  ?f4 geo:hasGeometry ?g4 .
  ?g4 geo:asWKT ?wkt4 .
  ?f4 rdfs:label ?lbl4 .
  ?f4 lpgvs:HasSchoolZone ?f5 .
  
  BIND(lpgvs:HasSchoolZone as ?e4) .
  BIND(?f5 as ?ev4) .
  
  BIND(geo:Feature as ?gf5) .
  BIND(lpgvs:SchoolZone as ?ft5) .
  ?f5 a ?ft5 .
  ?f5 geo:hasGeometry ?g5 .
  ?g5 geo:asWKT ?wkt5 .
  ?f5 rdfs:label ?lbl5 .
} 
LIMIT 100`,
      styles: defaultStyles
    },
    {
      title: "Flood risk hospitals",
      sparql: prefixes + `
SELECT
?gf2 ?ft2 ?f2 ?wkt2 ?lbl2 # LeveedArea1
?e5 ?ev5 # ConnectedTo
?gf6 ?ft6 ?f6 ?wkt6 ?lbl6 # Hospital
FROM lpgv: 
WHERE {
  BIND(geo:Feature as ?gf2) .
  BIND(lpgvs:LeveedArea as ?ft2) .
  ?f2 a ?ft2 .
  ?f2 geo:hasGeometry ?g2 .
  ?g2 geo:asWKT ?wkt2 .
  ?f2 rdfs:label ?lbl2 .
  ?f2 lpgvs:HasFloodRisk ?f6 .
  
  BIND(lpgvs:HasFloodRisk as ?e5) .
  BIND(?f6 as ?ev5) .

  BIND(geo:Feature as ?gf6) .
  BIND(lpgvs:Hospital as ?ft6) .
  ?f6 a ?ft6 .
  ?f6 geo:hasGeometry ?g6 .
  ?g6 geo:asWKT ?wkt6 .
  ?f6 rdfs:label ?lbl6 .
} 
LIMIT 100`,
        styles: defaultStyles
    }
];
