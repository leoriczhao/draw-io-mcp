#!/bin/bash
cd "$(dirname "$0")"

mkdir -p certs
cd certs

IP_ADDRESS="${1:-localhost}"

openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 3650 -nodes \
  -subj "/C=CN/ST=State/L=City/O=Org/CN=$IP_ADDRESS"

echo "Certificate generated for $IP_ADDRESS"
ls -lh cert.pem key.pem
