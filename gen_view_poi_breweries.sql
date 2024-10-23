DROP VIEW IF EXISTS osm_poi_breweries;

CREATE VIEW osm_poi_breweries AS
  -- node
  SELECT osm_id,
         osm_type,
         geom,
         unify_tags(tags,geom) as tags,
         CASE WHEN (tags ? 'industrial') then 'industrial'
              WHEN ((tags->>'amenity' = 'restaurant') OR (tags->>'amenity' = 'pub') OR (tags->>'tourism' = 'hotel')) AND (tags->>'microbrewery' = 'yes') then 'micro'
         ELSE 'craft' END AS category
  FROM  osm_poi_point
  WHERE
    ((tags->>'amenity' = 'restaurant') OR (tags->>'amenity' = 'pub') OR (tags->>'tourism' = 'hotel')) AND (tags->>'microbrewery' = 'yes') OR
    ((tags ? 'industrial') AND (tags->>'industrial' ~ '^brewery *[,;]|[,;] *brewery *[,;]|[,;] *brewery$|^brewery$')) OR
    ((tags ? 'craft') AND (tags->>'craft' ~ '^brewery *[,;]|[,;] *brewery *[,;]|[,;] *brewery$|^brewery$'))
  UNION ALL
  -- multipolygon or way
  SELECT osm_id,
         osm_type,
         geom,
         unify_tags(tags,geom) as tags,
         CASE WHEN (tags ? 'industrial') then 'industrial'
              WHEN ((tags->>'amenity' = 'restaurant') OR (tags->>'amenity' = 'pub') OR (tags->>'tourism' = 'hotel')) AND (tags->>'microbrewery' = 'yes') then 'micro'
         ELSE 'craft' END AS category
  FROM  osm_poi_poly
  WHERE (
    ((tags->>'amenity' = 'restaurant') OR (tags->>'amenity' = 'pub') OR (tags->>'tourism' = 'hotel')) AND (tags->>'microbrewery' = 'yes') OR
    ((tags ? 'industrial') AND (tags->>'industrial' ~ '^brewery *[,;]|[,;] *brewery *[,;]|[,;] *brewery$|^brewery$')) OR
    ((tags ? 'craft') AND (tags->>'craft' ~ '^brewery *[,;]|[,;] *brewery *[,;]|[,;] *brewery$|^brewery$')));

GRANT SELECT ON osm_poi_breweries to public;
