# Open Brewery Map

1. Install an OSM POI database according to the documentation at https://github.com/giggls/osmpoidb
2. Apply view gen_view_poi_breweries.sql:
   `psql -f gen_view_poi_breweries.sql poi`
3. Install `get-breweries.cgi` as cgi or wsgi script
4. Put the frontend code inside the www directory into your webserver


