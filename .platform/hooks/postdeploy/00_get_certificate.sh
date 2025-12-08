#!/usr/bin/env bash
# .platform/hooks/postdeploy/00_get_certificate.sh
sudo certbot -n -d m996464-habitapp.is404.net --nginx --agree-tos --email mitch.smi45@gmail.com