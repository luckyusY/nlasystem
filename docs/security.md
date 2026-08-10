# Prototype security model

This repository contains no real citizen, ownership, national-ID or production LAIS data.

## Controls represented

- Input validation with Pydantic and strict request limits.
- A role allow-list and optional bearer-session enforcement.
- Approved spatial operations; no AI-generated SQL execution path.
- Separate read-only and service database connection variables.
- Database schema isolation, revoked public privileges and spatial function grants.
- Audit events for authentication, parcel access, AI queries and GIS analysis.
- IP addresses are represented as hashes in the mock audit store.
- Vercel-managed HTTPS and security response headers.
- Secrets are server-side environment variables and are not exposed to browser code.

## Before production use

Replace demo authentication with the organization identity provider, use asymmetric short-lived tokens, add a durable audit sink, enforce row-level authorization, add malware scanning for uploads, configure a managed rate limiter, pin trusted origins, rotate secrets, complete threat modelling and privacy review, and obtain formal approval before connecting any authoritative NLA system.

The prototype must never register or transfer land, change parcel ownership or boundaries, approve subdivision or rezoning, resolve disputes, delete land records, or make final legal decisions.
