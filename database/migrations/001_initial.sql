BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS geoai;

CREATE TABLE IF NOT EXISTS geoai.parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi text UNIQUE NOT NULL,
  district text NOT NULL,
  sector text NOT NULL,
  cell text NOT NULL,
  area_m2 numeric(14,2) NOT NULL,
  land_use text NOT NULL,
  zoning text NOT NULL,
  registration_status text NOT NULL,
  geometry geometry(Polygon, 32736) NOT NULL,
  is_synthetic boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parcels_geometry_gix ON geoai.parcels USING gist (geometry);
CREATE INDEX IF NOT EXISTS parcels_district_idx ON geoai.parcels (district);
CREATE INDEX IF NOT EXISTS parcels_land_use_idx ON geoai.parcels (land_use);

CREATE TABLE IF NOT EXISTS geoai.reference_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layer text NOT NULL,
  name text NOT NULL,
  geometry geometry(Geometry, 32736) NOT NULL,
  is_synthetic boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS reference_features_geometry_gix ON geoai.reference_features USING gist (geometry);

CREATE TABLE IF NOT EXISTS geoai.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS geoai.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES geoai.documents(id) ON DELETE CASCADE,
  section text,
  content text NOT NULL,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON geoai.document_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS geoai.audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  module text NOT NULL,
  data_requested jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_summary text,
  ip_hash text,
  succeeded boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION geoai.find_parcels_within_distance(
  reference_geometry geometry,
  distance_metres double precision,
  requested_district text DEFAULT NULL,
  requested_land_use text DEFAULT NULL
) RETURNS SETOF geoai.parcels
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = geoai, public
AS $$
  SELECT p.*
  FROM geoai.parcels p
  WHERE ST_DWithin(p.geometry, reference_geometry, distance_metres)
    AND (requested_district IS NULL OR p.district = requested_district)
    AND (requested_land_use IS NULL OR p.land_use = requested_land_use);
$$;

REVOKE ALL ON SCHEMA geoai FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA geoai FROM PUBLIC;
REVOKE ALL ON FUNCTION geoai.find_parcels_within_distance(geometry, double precision, text, text) FROM PUBLIC;

COMMIT;
