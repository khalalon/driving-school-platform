#!/bin/bash

# Follow logs for all services or specific service
if [ -z "$1" ]; then
    docker-compose logs -f --tail=100
else
    docker-compose logs -f --tail=100 "$1"
fi
