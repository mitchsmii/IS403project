#!/usr/bin/env bash
# .platform/hooks/postdeploy/00_get_certificate.sh
sudo certbot -n -d http://mitchs.us-east-1.elasticbeanstalk.com --nginx --agree-tos --email mitch.smi45@gmail.com