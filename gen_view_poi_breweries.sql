DROP VIEW IF EXISTS osm_poi_breweries;

CREATE VIEW osm_poi_breweries AS
  -- node
  SELECT osm_id,
         osm_id as imposm_id,
         geom,
         unify_tags(tags,geom) as tags,
         'node' as osm_type,
         CASE WHEN (tags->'industrial' = 'brewery') then 'industrial'
              WHEN ((tags->'amenity' = 'restaurant') OR (tags->'amenity' = 'pub') OR (tags->'tourism' = 'hotel')) AND (tags->'microbrewery' = 'yes') then 'micro'
         ELSE 'craft' END AS category
  FROM  osm_poi_point
  WHERE
    ((tags->'amenity' = 'restaurant') OR (tags->'amenity' = 'pub') OR (tags->'tourism' = 'hotel')) AND (tags->'microbrewery' = 'yes') OR
    (tags->'industrial' = 'brewery') OR
    (tags->'craft' = 'brewery')
  UNION ALL
  -- multipolygon
  SELECT (-1*osm_id) as osm_id,
         osm_id as imposm_id,
         geom,
         unify_tags(tags,geom) as tags,
         'way' as osm_type,
         CASE WHEN (tags->'industrial' = 'brewery') then 'industrial'
              WHEN ((tags->'amenity' = 'restaurant') OR (tags->'amenity' = 'pub') OR (tags->'tourism' = 'hotel')) AND (tags->'microbrewery' = 'yes') then 'micro'
         ELSE 'craft' END AS category
  FROM  osm_poi_poly
  WHERE (
    ((tags->'amenity' = 'restaurant') OR (tags->'amenity' = 'pub') OR (tags->'tourism' = 'hotel')) AND (tags->'microbrewery' = 'yes') OR
    (tags->'industrial' = 'brewery') OR
    (tags->'craft' = 'brewery')
  ) AND (osm_id < 0) AND (osm_id > -1e17)
  UNION ALL
  -- closed way
  SELECT (-1*(osm_id+1e17)) as osm_id,
         osm_id as imposm_id,
         geom,
         unify_tags(tags,geom) as tags,
         'relation' as osm_type,
         CASE WHEN (tags->'industrial' = 'brewery') then 'industrial'
              WHEN ((tags->'amenity' = 'restaurant') OR (tags->'amenity' = 'pub') OR (tags->'tourism' = 'hotel')) AND (tags->'microbrewery' = 'yes') then 'micro'
         ELSE 'craft' END AS category
  FROM  osm_poi_poly
  WHERE (
    ((tags->'amenity' = 'restaurant') OR (tags->'amenity' = 'pub') OR (tags->'tourism' = 'hotel')) AND (tags->'microbrewery' = 'yes') OR
    (tags->'industrial' = 'brewery') OR
    (tags->'craft' = 'brewery')
  ) AND (osm_id < -1e17);

GRANT SELECT ON osm_poi_breweries to public;
