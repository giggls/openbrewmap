#!/usr/bin/python3
#
# This works with python2.7 and python3
#
# Small CGI/WSGI wrapper for BBOX -> JSON SQL query
#
# (c) 2019-2024 Sven Geggus <sven-osm@geggus-net>
#
#
# test using the following commands:
# REQUEST_METHOD=GET QUERY_STRING="bbox=7.93,48.66,9.07,49.26" ./get-breweries.cgi |tail +5 |jq .
# REQUEST_METHOD=GET QUERY_STRING="osm_id=102690110&osm_type=way" ./get-breweries.cgi |tail +5 |jq .
#
import wsgiref.handlers
import psycopg2
import json
import sys
import urllib.parse
import multipart

dbconnstr="dbname=poi"

sql_query="""
SELECT Jsonb_build_object('type', 'FeatureCollection', 'features',
              coalesce(json_agg(features.feature), '[]'::json))
FROM   (
  SELECT
  CASE WHEN (osm_type != 'N') THEN
    Json_build_object('type', 'Feature',
    'id', 'https://www.openstreetmap.org/' || CASE WHEN osm_type = 'W' THEN 'way/' ELSE 'relation/' END || osm_id,
    'geometry',St_asgeojson(St_centroid(geom)) :: json, 'properties',
    tags ::jsonb || Json_build_object('category', category) ::jsonb)
  ELSE
    Json_build_object('type', 'Feature',
    'id', 'https://www.openstreetmap.org/node/' || osm_id,
    'bbox', array[round(ST_XMin(geom)::numeric,7),round(ST_YMin(geom)::numeric,7),
                  round(ST_XMax(geom)::numeric,7),round(ST_YMax(geom)::numeric,7)],
    'geometry',St_asgeojson(St_centroid(geom)) :: json, 'properties',
    tags ::jsonb || Json_build_object('category', category) ::jsonb)
  END
  AS feature
  FROM  osm_poi_breweries
  WHERE %s
) features;
"""

sql_where_bbox="geom && St_setsrid('BOX3D(%f %f, %f %f)' ::box3d, 4326)"

sql_where_id="osm_id = %s AND osm_type = '%s'"

empty_geojson = b'{"type": "FeatureCollection", "features": []}\n'

# check if bbox contains valid geographical coordinates
def validate_bbox(bbox):
  if (bbox[0] > bbox[2]):
    return(False)
  if (bbox[1] > bbox[3]):
    return(False)
  if (bbox[0] < -180):
    return(False)
  if (bbox[1] < -90):
    return(False)
  if (bbox[2] > 180):
    return(False)
  if (bbox[3] > 90):
    return(False)
  return(True)

# check if bbox contains exactly four floating point numbers  
def bbox2flist(bbox):
  coords=[]
  cl=bbox.split(',')
  if len(cl) != 4:
    return(coords)
  # validate floating point values
  try:
    for c in cl:
      coords.append(float(c))
  except:
    return([])
  return(coords)

def application(environ, start_response):

  bbox = []
  osm_id = []
  osm_type = []
  
  # callbacks sets required variables
  def on_field(field):
    if (field.field_name == b'bbox'):
      bbox.append(field.value.decode())
    if (field.field_name == b'osm_id'):
      osm_id.append(field.value.decode())
    if (field.field_name == b'osm_type'):
      osm_type.append(field.value.decode())

  def on_file(file):
    pass

  start_response('200 OK', [('Content-Type', 'application/json')])
  if not 'REQUEST_METHOD' in environ:
    return([empty_geojson])
  if environ['REQUEST_METHOD'] not in ['GET', 'POST']:
    return([b'{}\n'])

  if environ['REQUEST_METHOD'] == 'GET':
    if not 'QUERY_STRING' in environ:
      return([empty_geojson])
    parms = urllib.parse.parse_qs(environ.get('QUERY_STRING', ''))
  else:
    content_length = int(environ.get('CONTENT_LENGTH', 0))
    body = environ['wsgi.input'].read(content_length).decode('utf-8')
    parms = urllib.parse.parse_qs(body)
  
  bbox = parms.get('bbox')
  osm_id = parms.get('osm_id')
  osm_type = parms.get('osm_type')

  if ((bbox is not None) and (bbox != [])):
    # validate floating point values in bbox
    coords=bbox2flist(bbox[0])
    if coords == []:
      return([empty_geojson])
    # bbox sanity check
    if (validate_bbox(coords) == False):
      return([empty_geojson])
  else:
    # add osm_id handling here
    if ((osm_id is not None) and (osm_id != [])
      and (osm_type is not None) and (osm_type != [])):
      # validate osm_id must be numeric
      if not osm_id[0].isdigit():
        return([empty_geojson])
      if not osm_type[0] in ["node","way","relation"]:
        return([empty_geojson])
    else:
      return([empty_geojson])

  try:
    conn = psycopg2.connect(dbconnstr)
  except:
    return([empty_geojson])
  
  if ((bbox is not None) and (bbox != [])):
    q = sql_where_bbox % (coords[0],coords[1],coords[2],coords[3])
    q = sql_query % q
  else:
    q = sql_where_id % (osm_id[0],osm_type[0][0].upper())
    q = sql_query % q
  
  cur = conn.cursor()
  cur.execute(q)
  res = cur.fetchall()
  json_str = json.dumps(res[0][0])
  conn.close()

  return([json_str.encode()])
  

if __name__ == '__main__':
  wsgiref.handlers.CGIHandler().run(application)
